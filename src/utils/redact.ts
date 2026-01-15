/**
 * Redact sensitive values from headers and bodies before recording.
 */

const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'proxy-authorization',
];

/**
 * Redact specified headers, replacing values with [REDACTED].
 */
export function redactHeaders(
  headers: Record<string, string | string[]>,
  redactList?: string[]
): Record<string, string | string[]> {
  const sensitiveKeys = new Set(
    (redactList ?? DEFAULT_SENSITIVE_HEADERS).map((h) => h.toLowerCase())
  );

  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return result;
}

/**
 * Redact fields from a JSON body by dot-notation paths.
 * e.g., redactBodyFields({ user: { password: 'secret' } }, ['user.password'])
 */
export function redactBodyFields(
  body: unknown,
  paths?: string[]
): unknown {
  if (!paths || paths.length === 0 || body === null || body === undefined) {
    return body;
  }

  if (typeof body !== 'object') return body;

  // Deep clone to avoid mutating originals
  const cloned = JSON.parse(JSON.stringify(body));

  for (const path of paths) {
    const segments = path.split('.');
    let current: Record<string, unknown> = cloned;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]!;
      if (current[seg] && typeof current[seg] === 'object') {
        current = current[seg] as Record<string, unknown>;
      } else {
        current = undefined as unknown as Record<string, unknown>;
        break;
      }
    }

    if (current) {
      const lastSeg = segments[segments.length - 1]!;
      if (lastSeg in current) {
        current[lastSeg] = '[REDACTED]';
      }
    }
  }

  return cloned;
}
