import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tracer } from '../src/tracer/index.js';
import type {
  CapturedRequest,
  CapturedExchange,
  CapturedError,
} from '../src/types.js';
import { Writable } from 'node:stream';

function makeRequest(overrides: Partial<CapturedRequest> = {}): CapturedRequest {
  return {
    id: 'req_001',
    correlationId: 'cor_001',
    timestamp: Date.now(),
    direction: 'outbound',
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: { 'content-type': 'application/json' },
    metadata: { spanId: 'spn_001', tags: { service: 'test' } },
    ...overrides,
  };
}

function makeExchange(
  statusCode = 200,
  latencyMs = 50,
  error?: CapturedError
): CapturedExchange {
  const req = makeRequest();
  return {
    request: req,
    response: error
      ? undefined
      : {
          requestId: req.id,
          correlationId: req.correlationId,
          timestamp: req.timestamp + latencyMs,
          statusCode,
          headers: {},
          latencyMs,
        },
    error,
  };
}

function createCapturingStream(): { stream: Writable; lines: () => string[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, lines: () => chunks.map((c) => c.trim()).filter(Boolean) };
}

describe('Tracer', () => {
  describe('traceRequestStart', () => {
    it('writes a debug-level trace entry in JSON format', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'debug',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestStart(makeRequest());

      const output = lines();
      expect(output).toHaveLength(1);
      const entry = JSON.parse(output[0]);
      expect(entry.level).toBe('debug');
      expect(entry.service).toBe('test-svc');
      expect(entry.method).toBe('GET');
      expect(entry.url).toBe('https://api.example.com/users');
      expect(entry.correlationId).toBe('cor_001');
      expect(entry.spanId).toBe('spn_001');
    });

    it('is suppressed when log level is higher than debug', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestStart(makeRequest());
      expect(lines()).toHaveLength(0);
    });
  });

  describe('traceRequestEnd', () => {
    it('writes an info-level entry for 2xx responses', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestEnd(makeExchange(200, 42));

      const output = lines();
      expect(output).toHaveLength(1);
      const entry = JSON.parse(output[0]);
      expect(entry.level).toBe('info');
      expect(entry.statusCode).toBe(200);
      expect(entry.latencyMs).toBe(42);
    });

    it('writes a warn-level entry for 4xx responses', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestEnd(makeExchange(404));

      const entry = JSON.parse(lines()[0]);
      expect(entry.level).toBe('warn');
    });

    it('writes an error-level entry for 5xx responses', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestEnd(makeExchange(500));

      const entry = JSON.parse(lines()[0]);
      expect(entry.level).toBe('error');
    });

    it('writes an error-level entry when an error is present', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      const error: CapturedError = {
        requestId: 'req_001',
        correlationId: 'cor_001',
        timestamp: Date.now(),
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      tracer.traceRequestEnd(makeExchange(0, 0, error));

      const entry = JSON.parse(lines()[0]);
      expect(entry.level).toBe('error');
    });

    it('is suppressed when log level is higher than the entry level', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'error',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestEnd(makeExchange(200));
      expect(lines()).toHaveLength(0);
    });
  });

  describe('traceError', () => {
    it('writes an error-level entry with error details', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      const req = makeRequest();
      const error: CapturedError = {
        requestId: req.id,
        correlationId: req.correlationId,
        timestamp: Date.now(),
        code: 'ETIMEDOUT',
        message: 'Request timed out',
      };

      tracer.traceError(req, error);

      const entry = JSON.parse(lines()[0]);
      expect(entry.level).toBe('error');
      expect(entry.error).toBe('ETIMEDOUT: Request timed out');
      expect(entry.tags.errorCode).toBe('ETIMEDOUT');
    });
  });

  describe('pretty format', () => {
    it('outputs a formatted string instead of JSON', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'test-svc',
        level: 'debug',
        format: 'pretty',
        output: stream,
      });

      tracer.traceRequestStart(makeRequest());

      const output = lines()[0];
      expect(output).toContain('[test-svc]');
      expect(output).toContain('GET');
      expect(output).toContain('https://api.example.com/users');
      expect(output).toContain('cor=cor_001');
      expect(output).toContain('span=spn_001');
    });
  });

  describe('log level filtering', () => {
    it('level=debug allows all 4 entries through', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'svc',
        level: 'debug',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestStart(makeRequest()); // debug
      tracer.traceRequestEnd(makeExchange(200)); // info (gate: shouldLog('info')=true)
      tracer.traceRequestEnd(makeExchange(400)); // warn (gate: shouldLog('info')=true)
      tracer.traceRequestEnd(makeExchange(500)); // error (gate: shouldLog('info')=true)

      expect(lines()).toHaveLength(4);
    });

    it('level=info allows 3 entries (suppresses debug start)', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'svc',
        level: 'info',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestStart(makeRequest()); // debug → suppressed
      tracer.traceRequestEnd(makeExchange(200)); // info
      tracer.traceRequestEnd(makeExchange(400)); // warn
      tracer.traceRequestEnd(makeExchange(500)); // error

      expect(lines()).toHaveLength(3);
    });

    it('level=warn suppresses traceRequestStart and traceRequestEnd (gate is info)', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'svc',
        level: 'warn',
        format: 'json',
        output: stream,
      });

      // traceRequestStart gates on shouldLog('debug') → false
      tracer.traceRequestStart(makeRequest());
      // traceRequestEnd gates on shouldLog('info') → false for all
      tracer.traceRequestEnd(makeExchange(200));
      tracer.traceRequestEnd(makeExchange(400));
      tracer.traceRequestEnd(makeExchange(500));
      // traceError gates on shouldLog('error') → true
      tracer.traceError(makeRequest(), {
        requestId: 'req_001',
        correlationId: 'cor_001',
        timestamp: Date.now(),
        code: 'ERR',
        message: 'fail',
      });

      expect(lines()).toHaveLength(1);
    });

    it('level=error suppresses everything except traceError', () => {
      const { stream, lines } = createCapturingStream();
      const tracer = new Tracer({
        serviceName: 'svc',
        level: 'error',
        format: 'json',
        output: stream,
      });

      tracer.traceRequestStart(makeRequest());
      tracer.traceRequestEnd(makeExchange(200));
      tracer.traceRequestEnd(makeExchange(500));
      tracer.traceError(makeRequest(), {
        requestId: 'req_001',
        correlationId: 'cor_001',
        timestamp: Date.now(),
        code: 'ERR',
        message: 'fail',
      });

      expect(lines()).toHaveLength(1);
    });
  });
});
