/**
 * service-spy — A debugging toolkit for server-to-server HTTP communication.
 *
 * Record & replay traffic, inspect requests in real-time, and trace
 * calls with correlation IDs and latency breakdowns.
 *
 * @example
 * ```ts
 * import { ServiceSpy } from '@codigos/service-spy';
 *
 * const scope = new ServiceSpy({
 *   intercept: true,
 *   recorder: { storagePath: '.service-spy/recordings' },
 *   inspector: { port: 8787, stdout: true },
 *   tracer: { serviceName: 'order-service', format: 'pretty' },
 * });
 *
 * await scope.start();
 * ```
 */

import { Interceptor } from './interceptor';
import { Recorder } from './recorder';
import { Inspector } from './inspector';
import { Tracer } from './tracer';
import type {
  ServiceSpyConfig,
  CapturedRequest,
  CapturedExchange,
  CapturedError,
  RecordingSession,
} from './types';

export class ServiceSpy {
  private interceptor: Interceptor;
  private recorder: Recorder | null = null;
  private inspector: Inspector | null = null;
  private tracer: Tracer | null = null;
  private config: ServiceSpyConfig;

  constructor(config: ServiceSpyConfig = {}) {
    this.config = config;

    // Always create the interceptor — it's the backbone
    const correlationHeader =
      config.tracer?.correlationHeader ?? 'x-correlation-id';
    this.interceptor = new Interceptor(config.filter, correlationHeader);

    // Conditionally create modules
    if (config.recorder) {
      this.recorder = new Recorder(config.recorder);
    }

    if (config.inspector) {
      this.inspector = new Inspector(config.inspector);
    }

    if (config.tracer) {
      this.tracer = new Tracer(config.tracer);
    }

    this.wireEvents();
  }

  /**
   * Start service-spy — enables interception and starts the inspector server.
   */
  async start(): Promise<void> {
    if (this.config.intercept !== false) {
      this.interceptor.enable();
    }

    if (this.inspector) {
      await this.inspector.start();
    }
  }

  /**
   * Stop service-spy — disables interception and shuts down the inspector.
   */
  async stop(): Promise<void> {
    this.interceptor.disable();

    if (this.recorder?.isRecording) {
      await this.recorder.stopSession();
    }

    if (this.inspector) {
      await this.inspector.stop();
    }
  }


  // ##########  Recording API   ################

  /**
   * Start recording HTTP exchanges to a session.
   */
  startRecording(
    name?: string,
    metadata?: Record<string, string>
  ): RecordingSession {
    if (!this.recorder) {
      throw new Error(
        'Recorder not configured. Pass a `recorder` config to ServiceSpy.'
      );
    }
    return this.recorder.startSession(name, metadata);
  }

  /**
   * Stop recording and persist the session.
   */
  async stopRecording(): Promise<RecordingSession> {
    if (!this.recorder) {
      throw new Error('Recorder not configured.');
    }
    return this.recorder.stopSession();
  }

  dd
  async *replay(
    sessionId: string
  ): AsyncGenerator<CapturedExchange, void, unknown> {
    if (!this.recorder) {
      throw new Error('Recorder not configured.');
    }
    yield* this.recorder.replay(sessionId);
  }

  /**
   * Get a summary of a recorded session.
   */
  async sessionSummary(sessionId: string) {
    if (!this.recorder) {
      throw new Error('Recorder not configured.');
    }
    return this.recorder.summarize(sessionId);
  }

  /**
   * List all recorded sessions.
   */
  async listSessions(): Promise<string[]> {
    if (!this.recorder) {
      throw new Error('Recorder not configured.');
    }
    return this.recorder.listSessions();
  }


  // ##########  Access to submodules ──────────────────────────────────────

  /** Direct access to the interceptor for advanced use */
  getInterceptor(): Interceptor {
    return this.interceptor;
  }

  /** Direct access to the recorder for advanced use */
  getRecorder(): Recorder | null {
    return this.recorder;
  }

  /** Direct access to the inspector for advanced use */
  getInspector(): Inspector | null {
    return this.inspector;
  }

  /** Direct access to the tracer for advanced use */
  getTracer(): Tracer | null {
    return this.tracer;
  }


  // ##########  Internal wiring ───────────────────────────────────────────

  /**
   * Wire interceptor events to all active modules.
   */
  private wireEvents(): void {
    this.interceptor.on(
      'request:start',
      (request: CapturedRequest) => {
        this.inspector?.onRequestStart(request);
        this.tracer?.traceRequestStart(request);
      }
    );

    this.interceptor.on(
      'request:end',
      (exchange: CapturedExchange) => {
        this.inspector?.onRequestEnd(exchange);
        this.tracer?.traceRequestEnd(exchange);
        this.recorder?.record(exchange);
      }
    );

    this.interceptor.on(
      'request:error',
      (error: CapturedError) => {
        this.inspector?.onRequestError(error);
      }
    );

    this.interceptor.on(
      'exchange:captured',
      (exchange: CapturedExchange) => {
        if (exchange.error) {
          this.recorder?.record(exchange);
        }
      }
    );
  }
}



// export it ....

export { Interceptor } from './interceptor';
export { Recorder } from './recorder';
export { Inspector } from './inspector';
export { Tracer } from './tracer';
export { withContext, getContext, getCorrelationId, addContextTags } from './utils/context';
export type * from './types';
