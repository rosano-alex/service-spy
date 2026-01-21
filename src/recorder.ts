import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type {
  RecorderConfig,
  RecordingSession,
  CapturedExchange,
} from './types';

import { generateId } from './utils/ids';
import { redactHeaders, redactBodyFields } from './utils/redact';

const DEFAULT_STORAGE_PATH = '.service-spy/recordings';
const DEFAULT_BUFFER_SIZE = 500;

/**
 * The Recorder captures HTTP exchanges and persists them as sessions
 * that can be replayed later for debugging and testing.
 */
export class Recorder {
  private config: Required<
    Pick<RecorderConfig, 'storagePath' | 'bufferSize'>
  > &
    RecorderConfig;
  private currentSession: RecordingSession | null = null;
  private recording = false;

  constructor(config: RecorderConfig = {}) {
    this.config = {
      storagePath: config.storagePath ?? DEFAULT_STORAGE_PATH,
      bufferSize: config.bufferSize ?? DEFAULT_BUFFER_SIZE,
      ...config,
    };
  }

  /**
   * Start a new recording session.
   */
  startSession(name?: string, metadata?: Record<string, string>): RecordingSession {
    if (this.recording) {
      throw new Error(
        'A recording session is already active. Stop it before starting a new one.'
      );
    }

    this.currentSession = {
      id: generateId('ses'),
      name: name ?? `session-${new Date().toISOString()}`,
      startedAt: Date.now(),
      exchanges: [],
      metadata: metadata ?? {},
    };

    this.recording = true;
    return this.currentSession;
  }

  /**
   * Stop the current recording session and persist it.
   */
  async stopSession(): Promise<RecordingSession> {
    if (!this.currentSession) {
      throw new Error('No active recording session.');
    }

    this.currentSession.endedAt = Date.now();
    this.recording = false;

    const session = this.currentSession;
    await this.persist(session);
    this.currentSession = null;

    return session;
  }

  /**
   * Record a captured exchange into the current session.
   * Automatically redacts sensitive data based on config.
   */
  record(exchange: CapturedExchange): void {
    if (!this.recording || !this.currentSession) return;

    const sanitized = this.sanitize(exchange);
    this.currentSession.exchanges.push(sanitized);

    // Flush to disk if buffer is full
    if (this.currentSession.exchanges.length >= this.config.bufferSize) {
      this.flush().catch(() => {
        // Silently handle flush errors — data is still in memory
      });
    }
  }

  /**
   * Load a previously recorded session from disk.
   */
  async loadSession(sessionId: string): Promise<RecordingSession> {
    const filePath = join(this.config.storagePath, `${sessionId}.json`);
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data) as RecordingSession;
  }

  /**
   * List all recorded session IDs.
   */
  async listSessions(): Promise<string[]> {
    const { readdir } = await import('node:fs/promises');
    if (!existsSync(this.config.storagePath)) return [];

    const files = await readdir(this.config.storagePath);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  /**
   * Replay a session by yielding exchanges one at a time.
   * Useful for feeding recorded traffic into test assertions.
   */
  async *replay(
    sessionId: string
  ): AsyncGenerator<CapturedExchange, void, unknown> {
    const session = await this.loadSession(sessionId);
    for (const exchange of session.exchanges) {
      yield exchange;
    }
  }

  /**
   * Get a summary of a recorded session.
   */
  async summarize(
    sessionId: string
  ): Promise<{
    totalExchanges: number;
    errors: number;
    avgLatencyMs: number;
    slowest: { url: string; latencyMs: number } | null;
    statusCodeBreakdown: Record<number, number>;
    duration: number;
  }> {
    const session = await this.loadSession(sessionId);
    const exchanges = session.exchanges;

    let totalLatency = 0;
    let latencyCount = 0;
    let slowest: { url: string; latencyMs: number } | null = null;
    let errors = 0;
    const statusCodes: Record<number, number> = {};

    for (const ex of exchanges) {
      if (ex.error) errors++;
      if (ex.response) {
        totalLatency += ex.response.latencyMs;
        latencyCount++;

        statusCodes[ex.response.statusCode] =
          (statusCodes[ex.response.statusCode] ?? 0) + 1;

        if (!slowest || ex.response.latencyMs > slowest.latencyMs) {
          slowest = {
            url: ex.request.url,
            latencyMs: ex.response.latencyMs,
          };
        }
      }
    }

    return {
      totalExchanges: exchanges.length,
      errors,
      avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
      slowest,
      statusCodeBreakdown: statusCodes,
      duration: (session.endedAt ?? Date.now()) - session.startedAt,
    };
  }

  get isRecording(): boolean {
    return this.recording;
  }

  get activeSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Redact sensitive data from an exchange.
   */
  private sanitize(exchange: CapturedExchange): CapturedExchange {
    const sanitized: CapturedExchange = {
      request: {
        ...exchange.request,
        headers: redactHeaders(
          exchange.request.headers,
          this.config.redactHeaders
        ),
        body: redactBodyFields(
          exchange.request.body,
          this.config.redactBodyPaths
        ),
      },
    };

    if (exchange.response) {
      sanitized.response = {
        ...exchange.response,
        headers: redactHeaders(
          exchange.response.headers,
          this.config.redactHeaders
        ),
        body: redactBodyFields(
          exchange.response.body,
          this.config.redactBodyPaths
        ),
      };
    }

    if (exchange.error) {
      sanitized.error = { ...exchange.error };
    }

    return sanitized;
  }

  /**
   * Flush the current session buffer to disk.
   */
  private async flush(): Promise<void> {
    if (!this.currentSession) return;
    await this.persist(this.currentSession);
  }

  /**
   * Persist a session to disk as JSON.
   */
  private async persist(session: RecordingSession): Promise<void> {
    if (!existsSync(this.config.storagePath)) {
      await mkdir(this.config.storagePath, { recursive: true });
    }

    const filePath = join(this.config.storagePath, `${session.id}.json`);
    await writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }
}
