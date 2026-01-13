import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Async-context-based correlation ID propagation.
 * This allows correlation IDs to flow through async boundaries
 * without manual parameter passing.
 */

export interface RequestContext {
  correlationId: string;
  spanId: string;
  parentSpanId?: string;
  tags: Record<string, string>;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a function within a request context.
 * All async operations inside will have access to the context.
 */
export function withContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return storage.run(context, fn);
}

/**
 * Get the current request context, if any.
 */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Get the current correlation ID from async context.
 */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/**
 * Add tags to the current context.
 */
export function addContextTags(tags: Record<string, string>): void {
  const ctx = storage.getStore();
  if (ctx) {
    Object.assign(ctx.tags, tags);
  }
}
