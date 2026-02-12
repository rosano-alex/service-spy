import { describe, it, expect, afterEach } from 'vitest';
import { ServiceSpy } from '../src/index.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Writable } from 'node:stream';

function nullStream(): Writable {
  return new Writable({ write(_, __, cb) { cb(); } });
}

describe('ServiceSpy', () => {
  let scope: ServiceSpy;
  let tmpDir: string;

  afterEach(async () => {
    try {
      await scope?.stop();
    } catch {}
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('constructor', () => {
    it('creates an instance with no config', () => {
      scope = new ServiceSpy();
      expect(scope.getInterceptor()).toBeDefined();
      expect(scope.getRecorder()).toBeNull();
      expect(scope.getInspector()).toBeNull();
      expect(scope.getTracer()).toBeNull();
    });

    it('creates submodules based on config', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
        tracer: { serviceName: 'test', output: nullStream() },
      });

      expect(scope.getRecorder()).not.toBeNull();
      expect(scope.getTracer()).not.toBeNull();
      expect(scope.getInspector()).toBeNull();
    });
  });

  describe('start / stop', () => {
    it('enables the interceptor on start', async () => {
      scope = new ServiceSpy();
      await scope.start();
      expect(scope.getInterceptor().isActive).toBe(true);
    });

    it('disables the interceptor on stop', async () => {
      scope = new ServiceSpy();
      await scope.start();
      await scope.stop();
      expect(scope.getInterceptor().isActive).toBe(false);
    });

    it('does not enable interception when intercept is false', async () => {
      scope = new ServiceSpy({ intercept: false });
      await scope.start();
      expect(scope.getInterceptor().isActive).toBe(false);
    });

    it('starts and stops the inspector server', async () => {
      const port = 29787 + Math.floor(Math.random() * 1000);
      scope = new ServiceSpy({
        inspector: { port, stdout: false },
      });

      await scope.start();
      expect(scope.getInspector()!.isRunning).toBe(true);

      await scope.stop();
      expect(scope.getInspector()!.isRunning).toBe(false);
    });

    it('stops an active recording session on stop', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
      });

      scope.startRecording('auto-stop-test');
      expect(scope.getRecorder()!.isRecording).toBe(true);

      await scope.stop();
      expect(scope.getRecorder()!.isRecording).toBe(false);
    });
  });

  describe('recording API', () => {
    it('throws when recording without a recorder configured', () => {
      scope = new ServiceSpy();
      expect(() => scope.startRecording()).toThrow(/Recorder not configured/);
    });

    it('throws when stopping recording without a recorder configured', async () => {
      scope = new ServiceSpy();
      await expect(scope.stopRecording()).rejects.toThrow(/Recorder not configured/);
    });

    it('starts and stops a recording session', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
      });

      const session = scope.startRecording('test-session', { team: 'eng' });
      expect(session.name).toBe('test-session');
      expect(session.metadata).toEqual({ team: 'eng' });

      const stopped = await scope.stopRecording();
      expect(stopped.endedAt).toBeTypeOf('number');
    });

    it('throws when replaying without a recorder', async () => {
      scope = new ServiceSpy();
      const gen = scope.replay('some-id');
      await expect(gen.next()).rejects.toThrow(/Recorder not configured/);
    });

    it('throws when getting summary without a recorder', async () => {
      scope = new ServiceSpy();
      await expect(scope.sessionSummary('some-id')).rejects.toThrow(
        /Recorder not configured/
      );
    });

    it('throws when listing sessions without a recorder', async () => {
      scope = new ServiceSpy();
      await expect(scope.listSessions()).rejects.toThrow(
        /Recorder not configured/
      );
    });
  });

  describe('replay and summary', () => {
    it('replays a recorded session', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
      });

      scope.startRecording('replay-test');
      // Manually add an exchange through the recorder
      scope.getRecorder()!.record({
        request: {
          id: 'req_1',
          correlationId: 'cor_1',
          timestamp: Date.now(),
          direction: 'outbound',
          method: 'GET',
          url: 'https://example.com',
          headers: {},
          metadata: { tags: {} },
        },
        response: {
          requestId: 'req_1',
          correlationId: 'cor_1',
          timestamp: Date.now(),
          statusCode: 200,
          headers: {},
          latencyMs: 42,
        },
      });

      const session = await scope.stopRecording();

      const replayed = [];
      for await (const ex of scope.replay(session.id)) {
        replayed.push(ex);
      }
      expect(replayed).toHaveLength(1);
      expect(replayed[0].request.url).toBe('https://example.com');
    });

    it('returns a session summary', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
      });

      scope.startRecording('summary-test');
      scope.getRecorder()!.record({
        request: {
          id: 'req_1',
          correlationId: 'cor_1',
          timestamp: Date.now(),
          direction: 'outbound',
          method: 'POST',
          url: 'https://example.com/api',
          headers: {},
          metadata: { tags: {} },
        },
        response: {
          requestId: 'req_1',
          correlationId: 'cor_1',
          timestamp: Date.now(),
          statusCode: 201,
          headers: {},
          latencyMs: 150,
        },
      });

      const session = await scope.stopRecording();
      const summary = await scope.sessionSummary(session.id);

      expect(summary.totalExchanges).toBe(1);
      expect(summary.avgLatencyMs).toBe(150);
      expect(summary.statusCodeBreakdown[201]).toBe(1);
    });

    it('lists all sessions', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
      });

      scope.startRecording('s1');
      const s1 = await scope.stopRecording();
      scope.startRecording('s2');
      const s2 = await scope.stopRecording();

      const sessions = await scope.listSessions();
      expect(sessions).toContain(s1.id);
      expect(sessions).toContain(s2.id);
    });
  });

  describe('submodule access', () => {
    it('provides access to the interceptor', () => {
      scope = new ServiceSpy();
      expect(scope.getInterceptor()).toBeDefined();
    });

    it('provides access to configured modules', async () => {
      tmpDir = await mkdtemp(join(tmpdir(), 'service-spy-test-'));
      const port = 29787 + Math.floor(Math.random() * 1000);
      scope = new ServiceSpy({
        recorder: { storagePath: tmpDir },
        inspector: { port, stdout: false },
        tracer: { serviceName: 'test', output: nullStream() },
      });

      expect(scope.getRecorder()).not.toBeNull();
      expect(scope.getInspector()).not.toBeNull();
      expect(scope.getTracer()).not.toBeNull();
    });
  });
});
