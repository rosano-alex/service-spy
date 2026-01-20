import type {
  TracerConfig,
  CapturedRequest,
  CapturedExchange,
  CapturedError,
  TraceEntry,
} from './types';

const DEFAULT_CORRELATION_HEADER = 'x-correlation-id';

/**
 * The Tracer produces structured log output for every HTTP exchange,
 * with correlation IDs, span tracking, and latency breakdowns.
 */
export class Tracer {
  private config: Required<TracerConfig>;

  constructor(config: TracerConfig) {
    this.config = {
      serviceName: config.serviceName,
      level: config.level ?? 'info',
      format: config.format ?? 'json',
      output: config.output ?? process.stdout,
      propagateCorrelation: config.propagateCorrelation ?? true,
      correlationHeader: config.correlationHeader ?? DEFAULT_CORRELATION_HEADER,
    };
  }

  /**
   * Log the start of an outbound request.
   */
  traceRequestStart(request: CapturedRequest): void {
    if (!this.shouldLog('debug')) return;

    const entry: TraceEntry = {
      timestamp: new Date(request.timestamp).toISOString(),
      level: 'debug',
      correlationId: request.correlationId,
      spanId: request.metadata.spanId ?? '',
      service: this.config.serviceName,
      method: request.method,
      url: request.url,
      tags: {
        direction: request.direction,
        ...request.metadata.tags,
      },
    };

    this.write(entry);
  }

  /**
   * Log a completed request/response exchange.
   */
  traceRequestEnd(exchange: CapturedExchange): void {
    if (!this.shouldLog('info')) return;

    const { request, response, error } = exchange;

    const entry: TraceEntry = {
      timestamp: new Date().toISOString(),
      level: this.determineLevel(response?.statusCode, error),
      correlationId: request.correlationId,
      spanId: request.metadata.spanId ?? '',
      service: this.config.serviceName,
      method: request.method,
      url: request.url,
      statusCode: response?.statusCode,
      latencyMs: response?.latencyMs,
      error: error?.message,
      tags: {
        direction: request.direction,
        ...request.metadata.tags,
      },
    };

    this.write(entry);
  }

  /**
   * Log a request error.
   */
  traceError(request: CapturedRequest, error: CapturedError): void {
    if (!this.shouldLog('error')) return;

    const entry: TraceEntry = {
      timestamp: new Date(error.timestamp).toISOString(),
      level: 'error',
      correlationId: error.correlationId,
      spanId: request.metadata.spanId ?? '',
      service: this.config.serviceName,
      method: request.method,
      url: request.url,
      error: `${error.code}: ${error.message}`,
      tags: {
        direction: request.direction,
        errorCode: error.code,
        ...request.metadata.tags,
      },
    };

    this.write(entry);
  }


  // ##########  Private helpers ───────────────────────────────────────────

  private write(entry: TraceEntry): void {
    const line =
      this.config.format === 'pretty'
        ? this.formatPretty(entry)
        : JSON.stringify(entry);

    this.config.output.write(line + '\n');
  }

  private formatPretty(entry: TraceEntry): string {
    const level = this.colorLevel(entry.level);
    const latency = entry.latencyMs != null ? ` ${entry.latencyMs}ms` : '';
    const status = entry.statusCode != null ? ` → ${entry.statusCode}` : '';
    const err = entry.error ? ` ERR: ${entry.error}` : '';
    const tags =
      Object.keys(entry.tags).length > 0
        ? ` ${JSON.stringify(entry.tags)}`
        : '';

    return `${entry.timestamp} ${level} [${entry.service}] ${entry.method} ${entry.url}${status}${latency}${err} cor=${entry.correlationId} span=${entry.spanId}${tags}`;
  }

  private colorLevel(level: string): string {
    const colors: Record<string, string> = {
      debug: '\x1b[2mDEBUG\x1b[0m',
      info: '\x1b[36mINFO \x1b[0m',
      warn: '\x1b[33mWARN \x1b[0m',
      error: '\x1b[31mERROR\x1b[0m',
    };
    return colors[level] ?? level.toUpperCase();
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  private determineLevel(
    statusCode?: number,
    error?: CapturedError
  ): string {
    if (error) return 'error';
    if (!statusCode) return 'warn';
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }
}
