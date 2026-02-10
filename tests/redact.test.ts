import { describe, it, expect } from 'vitest';
import { redactHeaders, redactBodyFields } from '../src/utils/redact.js';

describe('redactHeaders', () => {
  it('redacts default sensitive headers', () => {
    const headers = {
      authorization: 'Bearer token123',
      'content-type': 'application/json',
      cookie: 'session=abc',
      'x-api-key': 'secret',
    };
    const result = redactHeaders(headers);
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.cookie).toBe('[REDACTED]');
    expect(result['x-api-key']).toBe('[REDACTED]');
    expect(result['content-type']).toBe('application/json');
  });

  it('redacts case-insensitively', () => {
    const headers = { Authorization: 'Bearer token', 'X-Api-Key': 'secret' };
    const result = redactHeaders(headers);
    expect(result.Authorization).toBe('[REDACTED]');
    expect(result['X-Api-Key']).toBe('[REDACTED]');
  });

  it('uses a custom redact list when provided', () => {
    const headers = {
      authorization: 'Bearer token',
      'x-custom-secret': 'value',
      'content-type': 'text/plain',
    };
    const result = redactHeaders(headers, ['x-custom-secret']);
    // Only the custom list is used, authorization is NOT redacted
    expect(result.authorization).toBe('Bearer token');
    expect(result['x-custom-secret']).toBe('[REDACTED]');
    expect(result['content-type']).toBe('text/plain');
  });

  it('handles array header values by redacting entirely', () => {
    const headers = { 'set-cookie': ['a=1', 'b=2'] as unknown as string };
    const result = redactHeaders(headers as Record<string, string | string[]>);
    expect(result['set-cookie']).toBe('[REDACTED]');
  });

  it('passes through non-sensitive headers untouched', () => {
    const headers = { 'content-type': 'text/html', accept: '*/*' };
    const result = redactHeaders(headers);
    expect(result).toEqual(headers);
  });

  it('handles empty headers', () => {
    expect(redactHeaders({})).toEqual({});
  });
});

describe('redactBodyFields', () => {
  it('redacts top-level fields', () => {
    const body = { username: 'alice', password: 'secret123' };
    const result = redactBodyFields(body, ['password']);
    expect(result).toEqual({ username: 'alice', password: '[REDACTED]' });
  });

  it('redacts nested fields via dot-notation', () => {
    const body = { user: { name: 'alice', ssn: '123-45-6789' } };
    const result = redactBodyFields(body, ['user.ssn']);
    expect(result).toEqual({
      user: { name: 'alice', ssn: '[REDACTED]' },
    });
  });

  it('redacts deeply nested fields', () => {
    const body = { a: { b: { c: 'sensitive' } } };
    const result = redactBodyFields(body, ['a.b.c']);
    expect(result).toEqual({ a: { b: { c: '[REDACTED]' } } });
  });

  it('does not modify the original object', () => {
    const body = { password: 'secret' };
    redactBodyFields(body, ['password']);
    expect(body.password).toBe('secret');
  });

  it('returns null/undefined as-is', () => {
    expect(redactBodyFields(null, ['a'])).toBeNull();
    expect(redactBodyFields(undefined, ['a'])).toBeUndefined();
  });

  it('returns primitives as-is', () => {
    expect(redactBodyFields('hello', ['a'])).toBe('hello');
    expect(redactBodyFields(42, ['a'])).toBe(42);
  });

  it('returns body unchanged when no paths are given', () => {
    const body = { secret: 'value' };
    expect(redactBodyFields(body, [])).toEqual(body);
    expect(redactBodyFields(body)).toEqual(body);
  });

  it('ignores paths that do not exist in the body', () => {
    const body = { name: 'alice' };
    const result = redactBodyFields(body, ['nonexistent.field']);
    expect(result).toEqual({ name: 'alice' });
  });

  it('handles multiple redact paths', () => {
    const body = {
      password: 'secret',
      creditCard: { number: '4111', cvv: '123' },
    };
    const result = redactBodyFields(body, [
      'password',
      'creditCard.number',
      'creditCard.cvv',
    ]);
    expect(result).toEqual({
      password: '[REDACTED]',
      creditCard: { number: '[REDACTED]', cvv: '[REDACTED]' },
    });
  });
});
