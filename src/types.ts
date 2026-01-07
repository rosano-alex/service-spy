/**
 * Core types for @codigos/service-spy
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
