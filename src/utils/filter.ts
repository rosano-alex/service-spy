import type { CapturedRequest, RequestFilter } from '../types.js';

/**
 * Check if a captured request passes the configured filter.
 */
export function matchesFilter(
  request: CapturedRequest,
  filter?: RequestFilter
): boolean {
  if (!filter) return true;

  // Method filter
  if (filter.methods && filter.methods.length > 0) {
    const upperMethods = filter.methods.map((m) => m.toUpperCase());
    if (!upperMethods.includes(request.method.toUpperCase())) {
      return false;
    }
  }

  // URL include filter
  if (filter.urls && filter.urls.length > 0) {
    const matches = filter.urls.some((pattern) =>
      typeof pattern === 'string'
        ? request.url.includes(pattern)
        : pattern.test(request.url)
    );
    if (!matches) return false;
  }

  // URL exclude filter
  if (filter.excludeUrls && filter.excludeUrls.length > 0) {
    const excluded = filter.excludeUrls.some((pattern) =>
      typeof pattern === 'string'
        ? request.url.includes(pattern)
        : pattern.test(request.url)
    );
    if (excluded) return false;
  }

  // Header filter
  if (filter.headers) {
    for (const [key, expected] of Object.entries(filter.headers)) {
      const actual = request.headers[key.toLowerCase()];
      if (!actual) return false;

      const value = Array.isArray(actual) ? actual.join(', ') : actual;
      if (typeof expected === 'string') {
        if (value !== expected) return false;
      } else {
        if (!expected.test(value)) return false;
      }
    }
  }

  // Custom predicate
  if (filter.predicate && !filter.predicate(request)) {
    return false;
  }

  return true;
}
