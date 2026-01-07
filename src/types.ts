/**
 * Core types for service-spy
 */

export interface ServiceSpyConfig {
  /** Enable the interceptor to capture HTTP traffic */
  intercept?: boolean;
  /** Enable the recorder for record & replay */
  recorder?: RecorderConfig;
  /** Enable the live inspector */
  inspector?: InspectorConfig;
  /** Enable structured tracing */
  tracer?: TracerConfig;
  /** Filter which requests to capture */
  filter?: RequestFilter;
}

// ##########.  Captured Request/Response #############

export interface CapturedRequest {
  id: string;
  correlationId: string;
  timestamp: number;
  direction: 'outbound' | 'inbound';
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  body?: unknown;
  metadata: RequestMetadata;
}

export interface CapturedResponse {
  requestId: string;
  correlationId: string;
  timestamp: number;
  statusCode: number;
  headers: Record<string, string | string[]>;
  body?: unknown;
  latencyMs: number;
}

export interface CapturedExchange {
  request: CapturedRequest;
  response?: CapturedResponse;
  error?: CapturedError;
}

export interface CapturedError {
  requestId: string;
  correlationId: string;
  timestamp: number;
  code: string;
  message: string;
  stack?: string;
}

export interface RequestMetadata {
  service?: string;
  spanId?: string;
  parentSpanId?: string;
  tags: Record<string, string>;
}

// ##########.  Filtering   ################

export interface RequestFilter {
  /** Only capture requests matching these URL patterns (string or regex) */
  urls?: (string | RegExp)[];
  /** Exclude requests matching these URL patterns */
  excludeUrls?: (string | RegExp)[];
  /** Only capture these HTTP methods */
  methods?: string[];
  /** Only capture requests with these headers present */
  headers?: Record<string, string | RegExp>;
  /** Custom predicate for fine-grained filtering */
  predicate?: (req: CapturedRequest) => boolean;
}

// ##########.  Recorder   ##############

export interface RecorderConfig {
  /** Directory to store recorded sessions */
  storagePath?: string;
  /** Max exchanges to keep in memory before flushing */
  bufferSize?: number;
  /** Redact sensitive headers before recording */
  redactHeaders?: string[];
  /** Redact fields from request/response bodies */
  redactBodyPaths?: string[];
}

export interface RecordingSession {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  exchanges: CapturedExchange[];
  metadata: Record<string, string>;
}

// ##########.  Inspector   #############

export interface InspectorConfig {
  /** Port for the inspector WebSocket server */
  port?: number;
  /** Also print to stdout in a formatted way */
  stdout?: boolean;
  /** Highlight slow requests above this threshold (ms) */
  slowThresholdMs?: number;
}

export type InspectorEventType =
  | 'request:start'
  | 'request:end'
  | 'request:error'
  | 'session:start'
  | 'session:end';

export interface InspectorEvent {
  type: InspectorEventType;
  timestamp: number;
  data: CapturedRequest | CapturedResponse
  | CapturedError | RecordingSession;
}

// ##########.  Tracer   ###############

export interface TracerConfig {
  /** Service name to attach to all traces */
  serviceName: string;
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Output format */
  format?: 'json' | 'pretty';
  /** Custom output stream (defaults to stdout) */
  output?: NodeJS.WritableStream;
  /** Automatically propagate correlation IDs via headers */
  propagateCorrelation?: boolean;
  /** Header name for correlation ID (default: x-correlation-id) */
  correlationHeader?: string;
}

export interface TraceEntry {
  timestamp: string;
  level: string;
  correlationId: string;
  spanId: string;
  service: string;
  method: string;
  url: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  tags: Record<string, string>;
}

// ##########.  Event Emitter   ################─────

export type ServiceSpyEventMap = {
  'request:start': [CapturedRequest];
  'request:end': [CapturedExchange];
  'request:error': [CapturedError];
  'exchange:captured': [CapturedExchange];
};
