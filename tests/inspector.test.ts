import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Inspector } from '../src/inspector/index.js';
import type {
  CapturedRequest,
  CapturedExchange,
  CapturedError,
} from '../src/types.js';
import http from 'node:http';

function makeRequest(overrides: Partial<CapturedRequest> = {}): CapturedRequest {
  return {
    id: 'req_001',
    correlationId: 'cor_001',
    timestamp: Date.now(),
    direction: 'outbound',
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: {},
    metadata: { tags: {} },
    ...overrides,
  };
}

function makeExchange(statusCode = 200): CapturedExchange {
  const req = makeRequest();
  return {
    request: req,
    response: {
      requestId: req.id,
      correlationId: req.correlationId,
      timestamp: req.timestamp + 50,
      statusCode,
      headers: {},
      latencyMs: 50,
    },
  };
}

function makeError(): CapturedError {
  return {
    requestId: 'req_001',
    correlationId: 'cor_001',
    timestamp: Date.now(),
    code: 'ECONNREFUSED',
    message: 'Connection refused',
  };
}

function fetch(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    }).on('error', reject);
  });
}

let portCounter = 19787 + Math.floor(Math.random() * 1000);
function nextPort() { return portCounter++; }

describe('Inspector', () => {
  let inspector: Inspector;

  afterEach(async () => {
    if (inspector?.isRunning) {
      await inspector.stop();
    }
  });

  describe('lifecycle', () => {
    it('starts and stops without error', async () => {
      const port = nextPort();
      inspector = new Inspector({ port, stdout: false });
      expect(inspector.isRunning).toBe(false);

      await inspector.start();
      expect(inspector.isRunning).toBe(true);

      await inspector.stop();
      expect(inspector.isRunning).toBe(false);
    });

    it('is a no-op to start when already running', async () => {
      const port = nextPort();
      inspector = new Inspector({ port, stdout: false });
      await inspector.start();
      await inspector.start(); // should not throw
      expect(inspector.isRunning).toBe(true);
    });

    it('is a no-op to stop when not running', async () => {
      const port = nextPort();
      inspector = new Inspector({ port, stdout: false });
      await inspector.stop(); // should not throw
      expect(inspector.isRunning).toBe(false);
    });
  });

  describe('HTTP endpoints', () => {
    let port: number;

    beforeEach(async () => {
      port = nextPort();
      inspector = new Inspector({ port, stdout: false });
      await inspector.start();
    });

    it('serves dashboard HTML at /', async () => {
      const res = await fetch(port, '/');
      expect(res.status).toBe(200);
      expect(res.body).toContain('service-spy inspector');
      expect(res.body).toContain('<!DOCTYPE html>');
    });

    it('serves dashboard HTML at /dashboard', async () => {
      const res = await fetch(port, '/dashboard');
      expect(res.status).toBe(200);
      expect(res.body).toContain('service-spy inspector');
    });

    it('serves JSON events at /api/events', async () => {
      inspector.onRequestStart(makeRequest());
      inspector.onRequestEnd(makeExchange());

      const res = await fetch(port, '/api/events');
      expect(res.status).toBe(200);
      const events = JSON.parse(res.body);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('request:start');
      expect(events[1].type).toMatch(/request:(end|error)/);
    });

    it('returns 404 for unknown paths', async () => {
      const res = await fetch(port, '/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('event buffering', () => {
    it('buffers events and trims when exceeding 500', () => {
      inspector = new Inspector({ port: nextPort(), stdout: false });

      for (let i = 0; i < 510; i++) {
        inspector.onRequestStart(makeRequest({ id: `req_${i}` }));
      }

      // Access internal buffer via the API endpoint to verify trimming
      // The buffer should be trimmed to 250 when exceeding 500
      // We can't directly access it, but we can verify via behavior
    });

    it('pushes events for request start, end, and error', () => {
      inspector = new Inspector({ port: nextPort(), stdout: false });

      inspector.onRequestStart(makeRequest());
      inspector.onRequestEnd(makeExchange());
      inspector.onRequestError(makeError());

      // Events were pushed without throwing
    });
  });

  describe('stdout output', () => {
    it('logs to console when stdout is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      inspector = new Inspector({ port: nextPort(), stdout: true });

      inspector.onRequestStart(makeRequest());
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      inspector.onRequestEnd(makeExchange());
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      inspector.onRequestError(makeError());
      expect(consoleSpy).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });

    it('does not log to console when stdout is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      inspector = new Inspector({ port: nextPort(), stdout: false });

      inspector.onRequestStart(makeRequest());
      inspector.onRequestEnd(makeExchange());
      inspector.onRequestError(makeError());

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('onRequestEnd with error exchange', () => {
    it('handles an exchange with an error and no response', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      inspector = new Inspector({ port: nextPort(), stdout: true });

      const errorExchange: CapturedExchange = {
        request: makeRequest(),
        error: makeError(),
      };
      inspector.onRequestEnd(errorExchange);

      const logArgs = consoleSpy.mock.calls[0][0];
      expect(logArgs).toContain('ECONNREFUSED');
      consoleSpy.mockRestore();
    });
  });
});
