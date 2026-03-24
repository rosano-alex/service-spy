import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import type {
  CapturedRequest,
  CapturedResponse,
  CapturedError,
  CapturedExchange,
  RequestFilter,
  service-spyEventMap,
} from './types';
import { generateId, generateCorrelationId, generateSpanId } from './utils/ids';
import { getContext, withContext } from './utils/context';

type OriginalRequest = typeof http.request;

/**
 * The Interceptor hooks into Node's http/https modules to capture
 * all outbound HTTP requests and their responses transparently.
 */
export class Interceptor extends EventEmitter<service-spyEventMap > {
  private originalHttpRequest: OriginalRequest | null = null;
  private originalHttpsRequest: OriginalRequest | null = null;

  private active = false;
  private filter?: RequestFilter;
  private correlationHeader: string;

  constructor(
    filter?: RequestFilter,
    correlationHeader: string = 'x-correlation-id'
  ) {
    super();
    this.filter = filter;
    this.correlationHeader = correlationHeader;
  }

  /**
   * Start intercepting outbound HTTP/HTTPS requests.
   */
  enable(): void {
    if (this.active) return;

    this.originalHttpRequest = http.request;
    this.originalHttpsRequest = https.request;

    http.request = this.createProxy(http.request, 'http') as typeof http.request;
    https.request = this.createProxy(https.request, 'https') as typeof https.request;

    this.active = true;
  }

  /**
   * Stop intercepting and restore original functions.
   */
  disable(): void {
    if (!this.active) return;

    if (this.originalHttpRequest) {
      http.request = this.originalHttpRequest as typeof http.request;
    }
    if (this.originalHttpsRequest) {
      https.request = this.originalHttpsRequest as typeof https.request;
    }

    this.originalHttpRequest = null;
    this.originalHttpsRequest = null;
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Create a proxy wrapper around http.request / https.request.
   */
  private createProxy(
    originalFn: OriginalRequest,
    protocol: 'http' | 'https'
  ): OriginalRequest {
    const self = this;

    return function interceptedRequest(
      this: unknown,
      ...args: Parameters<OriginalRequest>
    ): ReturnType<OriginalRequest> {
      const startTime = Date.now();
      const requestId = generateId('req');

      // Resolve the URL and options from the flexible argument signature
      const { url, options } = self.resolveArgs(args, protocol);

      // Build correlation context
      const existingCtx = getContext();
      const correlationId =
        existingCtx?.correlationId ?? generateCorrelationId();
      const spanId = generateSpanId();

      // Inject correlation header into outbound request
      if (options.headers) {
        (options.headers as Record<string, string>)[self.correlationHeader] =
          correlationId;
      }

      const captured: CapturedRequest = {
        id: requestId,
        correlationId,
        timestamp: startTime,
        direction: 'outbound',
        method: (options.method ?? 'GET').toUpperCase(),
        url,
        headers: self.normalizeHeaders(options.headers as http.OutgoingHttpHeaders | undefined),
        metadata: {
          spanId,
          parentSpanId: existingCtx?.spanId,
          tags: existingCtx?.tags ?? {},
        },
      };

      // Check filter — if it doesn't match, pass through untouched
      if (!matchesFilter(captured, self.filter)) {
        return originalFn.apply(this, args);
      }

      self.emit('request:start', captured);

      // Capture request body
      const bodyChunks: Buffer[] = [];

      const req = originalFn.apply(this, args);

      const originalWrite = req.write.bind(req);
      req.write = function (
        chunk: unknown,
        ...rest: unknown[]
      ): boolean {
        if (chunk) {
          bodyChunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
          );
        }
        return (originalWrite as Function)(chunk, ...rest);
      };

      const originalEnd = req.end.bind(req);
      req.end = function (
        chunk?: unknown,
        ...rest: unknown[]
      ): ReturnType<typeof req.end> {
        if (chunk) {
          bodyChunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
          );
        }

        captured.body = self.parseBody(Buffer.concat(bodyChunks));

        return (originalEnd as Function)(chunk, ...rest);
      };

      // Capture response
      req.on('response', (res: http.IncomingMessage) => {
        const responseChunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          responseChunks.push(chunk);
        });

        res.on('end', () => {
          const capturedResponse: CapturedResponse = {
            requestId,
            correlationId,
            timestamp: Date.now(),
            statusCode: res.statusCode ?? 0,
            headers: self.normalizeHeaders(res.headers),
            body: self.parseBody(Buffer.concat(responseChunks)),
            latencyMs: Date.now() - startTime,
          };

          const exchange: CapturedExchange = {
            request: captured,
            response: capturedResponse,
          };

          self.emit('request:end', exchange);
          self.emit('exchange:captured', exchange);
        });
      });

      // Capture errors
      req.on('error', (err: Error & { code?: string }) => {
        const capturedError: CapturedError = {
          requestId,
          correlationId,
          timestamp: Date.now(),
          code: err.code ?? 'UNKNOWN',
          message: err.message,
          stack: err.stack,
        };

        const exchange: CapturedExchange = {
          request: captured,
          error: capturedError,
        };

        self.emit('request:error', capturedError);
        self.emit('exchange:captured', exchange);
      });

      return req;
    } as OriginalRequest;
  }

  /**
   * Resolve the flexible http.request argument signature into a URL + options.
   */
  private resolveArgs(
    args: Parameters<OriginalRequest>,
    protocol: string
  ): { url: string; options: http.RequestOptions } {
    const first = args[0];

    if (typeof first === 'string') {
      return { url: first, options: (args[1] as http.RequestOptions) ?? {} };
    }

    if (first instanceof URL) {
      return {
        url: first.toString(),
        options: (args[1] as http.RequestOptions) ?? {},
      };
    }

    // It's a RequestOptions object
    const opts = first as http.RequestOptions;
    const host = opts.hostname ?? opts.host ?? 'localhost';
    const port = opts.port ? `:${opts.port}` : '';
    const path = opts.path ?? '/';
    return {
      url: `${protocol}://${host}${port}${path}`,
      options: opts,
    };
  }

  /**
   * Normalize headers to a flat Record.
   */
  private normalizeHeaders(
    headers?: http.OutgoingHttpHeaders | http.IncomingHttpHeaders
  ): Record<string, string | string[]> {
    if (!headers) return {};

    const result: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      result[key.toLowerCase()] = Array.isArray(value)
        ? value.map(String)
        : String(value);
    }
    return result;
  }

  /**
   * Attempt to parse a response body buffer as JSON, falling back to string.
   */
  private parseBody(buffer: Buffer): unknown {
    if (buffer.length === 0) return undefined;

    const text = buffer.toString('utf-8');
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
function matchesFilter(
  captured: CapturedRequest,
  filter: RequestFilter | undefined
): boolean {
  if (!filter) return true;

  if (typeof filter === 'function') {
    try {
      return Boolean(filter(captured) as unknown);
    } catch {
      return false;
    }
  }

  if (typeof filter === 'string') {
    return captured.url.includes(filter);
  }

  if (filter instanceof RegExp) {
    return filter.test(captured.url);
  }

  if (typeof filter !== 'object') {
    return false;
  }

  const candidate = filter as {
    method?: string | string[] | RegExp;
    url?: string | RegExp | ((value: string) => boolean);
    headers?: Record<string, string | string[] | RegExp>;
  };

  if (candidate.method && !matchesString(captured.method, candidate.method)) {
    return false;
  }

  if (candidate.url) {
    const { url } = captured;
    const matchesUrl =
      typeof candidate.url === 'function'
        ? candidate.url(url)
        : matchesString(url, candidate.url);

    if (!matchesUrl) {
      return false;
    }
  }

  if (candidate.headers) {
    for (const [key, expected] of Object.entries(candidate.headers)) {
      const actual = captured.headers[key.toLowerCase()];
      if (!matchesHeader(actual, expected)) {
        return false;
      }
    }
  }

  return true;
}

function matchesString(
  actual: string,
  expected: string | string[] | RegExp
): boolean {
  if (expected instanceof RegExp) {
    return expected.test(actual);
  }

  if (Array.isArray(expected)) {
    return expected.some((value) => value === actual);
  }

  return actual === expected || actual.includes(expected);
}

function matchesHeader(
  actual: string | string[] | undefined,
  expected: string | string[] | RegExp
): boolean {
  if (actual === undefined) return false;

  if (Array.isArray(actual)) {
    return actual.some((value) => matchesString(value, expected));
  }

  return matchesString(actual, expected);
}

