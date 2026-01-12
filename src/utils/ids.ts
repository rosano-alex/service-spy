import { randomBytes } from 'node:crypto';

/**
 * Generate a short unique ID for requests and spans.
 * Uses crypto.randomBytes for uniqueness without external deps.
 */
export function generateId(prefix: string = ''): string {
  const bytes = randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${bytes}` : bytes;
}

/**
 * Generate a correlation ID.
 * If one already exists in the current async context, reuse it.
 */
export function generateCorrelationId(): string {
  return generateId('cor');
}

/**
 * Generate a span ID for tracing.
 */
export function generateSpanId(): string {
  return generateId('spn');
}
