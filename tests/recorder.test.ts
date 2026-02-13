import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Recorder } from '../src/recorder/index.js';
import type { CapturedExchange } from '../src/types.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeExchange(
  overrides: { method?: string; url?: string; statusCode?: number; latencyMs?: number; password?: string } = {}
): CapturedExchange {
  return {
    request: {
      id: 'req_001',
      correlationId: 'cor_001',
      timestamp: Date.now(),
      direction: 'outbound',
      method: overrides.method ?? 'GET',
      url: overrides.url ?? 'https://api.example.com/users',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token',
      },
      body: overrides.password ? { password: overrides.password } : undefined,
      metadata: { tags: {} },
    },
    response: {
      requestId: 'req_001',
      correlationId: 'cor_001',
      timestamp: Date.now() + (overrides.latencyMs ?? 50),
      statusCode: overrides.statusCode ?? 200,
      headers: { 'content-type': 'application/json' },
      body: { ok: true },
      latencyMs: overrides.latencyMs ?? 50,
    },
  };
}

describe('Recorder', () => {
  let tmpDir: string;
  let recorder: Recorder;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
    recorder = new Recorder({ storagePath: tmpDir });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('session lifecycle', () => {
    it('starts a recording session', () => {
      const session = recorder.startSession('test-session', { env: 'test' });
      expect(session.id).toMatch(/^ses_/);
      expect(session.name).toBe('test-session');
      expect(session.metadata).toEqual({ env: 'test' });
      expect(recorder.isRecording).toBe(true);
    });

    it('generates a default name when none is provided', () => {
      const session = recorder.startSession();
      expect(session.name).toMatch(/^session-/);
    });

    it('throws when starting a second session while one is active', () => {
      recorder.startSession('first');
      expect(() => recorder.startSession('second')).toThrow(
        /already active/
      );
    });

    it('stops a session and persists it', async () => {
      recorder.startSession('my-session');
      recorder.record(makeExchange());
      const session = await recorder.stopSession();

      expect(session.endedAt).toBeTypeOf('number');
      expect(session.exchanges).toHaveLength(1);
      expect(recorder.isRecording).toBe(false);
    });

    it('throws when stopping without an active session', async () => {
      await expect(recorder.stopSession()).rejects.toThrow(/No active/);
    });
  });

  describe('recording exchanges', () => {
    it('appends exchanges to the active session', () => {
      recorder.startSession();
      recorder.record(makeExchange());
      recorder.record(makeExchange({ method: 'POST' }));
      expect(recorder.activeSession!.exchanges).toHaveLength(2);
    });

    it('silently ignores records when not recording', () => {
      recorder.record(makeExchange());
      // Should not throw
    });
  });

  describe('redaction', () => {
    it('redacts sensitive headers before recording', () => {
      const recorderWithRedaction = new Recorder({
        storagePath: tmpDir,
        redactHeaders: ['authorization'],
      });

      recorderWithRedaction.startSession();
      recorderWithRedaction.record(makeExchange());

      const recorded = recorderWithRedaction.activeSession!.exchanges[0];
      expect(recorded.request.headers.authorization).toBe('[REDACTED]');
      expect(recorded.request.headers['content-type']).toBe('application/json');
    });

    it('redacts body fields before recording', () => {
      const recorderWithRedaction = new Recorder({
        storagePath: tmpDir,
        redactBodyPaths: ['password'],
      });

      recorderWithRedaction.startSession();
      recorderWithRedaction.record(makeExchange({ password: 'secret123' }));

      const recorded = recorderWithRedaction.activeSession!.exchanges[0];
      expect((recorded.request.body as any).password).toBe('[REDACTED]');
    });
  });

  describe('persistence and loading', () => {
    it('loads a persisted session from disk', async () => {
      recorder.startSession('persist-test');
      recorder.record(makeExchange());
      const session = await recorder.stopSession();

      const loaded = await recorder.loadSession(session.id);
      expect(loaded.name).toBe('persist-test');
      expect(loaded.exchanges).toHaveLength(1);
    });

    it('lists all saved sessions', async () => {
      recorder.startSession('session-1');
      const s1 = await recorder.stopSession();

      recorder.startSession('session-2');
      const s2 = await recorder.stopSession();

      const sessions = await recorder.listSessions();
      expect(sessions).toContain(s1.id);
      expect(sessions).toContain(s2.id);
    });

    it('returns an empty list when no sessions exist', async () => {
      const emptyRecorder = new Recorder({
        storagePath: join(tmpDir, 'nonexistent'),
      });
      const sessions = await emptyRecorder.listSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('replay', () => {
    it('yields exchanges one by one from a saved session', async () => {
      recorder.startSession('replay-test');
      recorder.record(makeExchange({ url: 'https://a.com' }));
      recorder.record(makeExchange({ url: 'https://b.com' }));
      recorder.record(makeExchange({ url: 'https://c.com' }));
      const session = await recorder.stopSession();

      const replayed: CapturedExchange[] = [];
      for await (const exchange of recorder.replay(session.id)) {
        replayed.push(exchange);
      }

      expect(replayed).toHaveLength(3);
      expect(replayed[0].request.url).toBe('https://a.com');
      expect(replayed[2].request.url).toBe('https://c.com');
    });
  });

  describe('summarize', () => {
    it('calculates correct summary statistics', async () => {
      recorder.startSession('summary-test');
      recorder.record(makeExchange({ statusCode: 200, latencyMs: 100 }));
      recorder.record(makeExchange({ statusCode: 200, latencyMs: 200 }));
      recorder.record(makeExchange({ statusCode: 404, latencyMs: 50 }));
      recorder.record(makeExchange({ statusCode: 500, latencyMs: 300 }));
      const session = await recorder.stopSession();

      const summary = await recorder.summarize(session.id);

      expect(summary.totalExchanges).toBe(4);
      expect(summary.errors).toBe(0); // no CapturedError, just status codes
      expect(summary.avgLatencyMs).toBeCloseTo(162.5, 0);
      expect(summary.slowest!.latencyMs).toBe(300);
      expect(summary.statusCodeBreakdown[200]).toBe(2);
      expect(summary.statusCodeBreakdown[404]).toBe(1);
      expect(summary.statusCodeBreakdown[500]).toBe(1);
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });

    it('handles sessions with errors', async () => {
      recorder.startSession('error-summary');
      const errorExchange: CapturedExchange = {
        request: makeExchange().request,
        error: {
          requestId: 'req_001',
          correlationId: 'cor_001',
          timestamp: Date.now(),
          code: 'ECONNREFUSED',
          message: 'Connection refused',
        },
      };
      recorder.record(errorExchange);
      const session = await recorder.stopSession();

      const summary = await recorder.summarize(session.id);
      expect(summary.totalExchanges).toBe(1);
      expect(summary.errors).toBe(1);
      expect(summary.avgLatencyMs).toBe(0);
      expect(summary.slowest).toBeNull();
    });
  });

  describe('activeSession getter', () => {
    it('returns the session when recording', () => {
      recorder.startSession('active');
      expect(recorder.activeSession).not.toBeNull();
      expect(recorder.activeSession!.name).toBe('active');
    });

    it('returns null when not recording', () => {
      expect(recorder.activeSession).toBeNull();
    });
  });
});
