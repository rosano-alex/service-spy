import { describe, it, expect } from 'vitest';
import { matchesFilter } from '../src/utils/filter.js';
import type { CapturedRequest } from '../src/types.js';

function makeRequest(overrides: Partial<CapturedRequest> = {}): CapturedRequest {
  return {
    id: 'req_001',
    correlationId: 'cor_001',
    timestamp: Date.now(),
    direction: 'outbound',
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: { 'content-type': 'application/json' },
    metadata: { tags: {} },
    ...overrides,
  };
}

describe('matchesFilter', () => {
  it('returns true when no filter is provided', () => {
    expect(matchesFilter(makeRequest())).toBe(true);
  });

  it('returns true when filter is undefined', () => {
    expect(matchesFilter(makeRequest(), undefined)).toBe(true);
  });

  // ── Method filter ──────────────────────────────────────────────────

  it('allows a request when its method is in the filter list', () => {
    expect(
      matchesFilter(makeRequest({ method: 'POST' }), { methods: ['POST', 'PUT'] })
    ).toBe(true);
  });

  it('rejects a request when its method is not in the filter list', () => {
    expect(
      matchesFilter(makeRequest({ method: 'DELETE' }), { methods: ['GET', 'POST'] })
    ).toBe(false);
  });

  it('handles case-insensitive method matching', () => {
    expect(
      matchesFilter(makeRequest({ method: 'get' }), { methods: ['GET'] })
    ).toBe(true);
  });

  // ── URL include filter ─────────────────────────────────────────────

  it('allows a request when its URL matches a string pattern', () => {
    expect(
      matchesFilter(makeRequest(), { urls: ['api.example.com'] })
    ).toBe(true);
  });

  it('rejects a request when its URL does not match any pattern', () => {
    expect(
      matchesFilter(makeRequest(), { urls: ['other-api.com'] })
    ).toBe(false);
  });

  it('allows a request when its URL matches a regex pattern', () => {
    expect(
      matchesFilter(makeRequest(), { urls: [/example\.com/] })
    ).toBe(true);
  });

  it('rejects a request when its URL does not match a regex pattern', () => {
    expect(
      matchesFilter(makeRequest(), { urls: [/^https:\/\/other/] })
    ).toBe(false);
  });

  // ── URL exclude filter ─────────────────────────────────────────────

  it('rejects a request when its URL matches an exclude pattern', () => {
    expect(
      matchesFilter(makeRequest({ url: 'https://api.example.com/health' }), {
        excludeUrls: ['/health'],
      })
    ).toBe(false);
  });

  it('allows a request when its URL does not match any exclude pattern', () => {
    expect(
      matchesFilter(makeRequest(), { excludeUrls: ['/health', '/ready'] })
    ).toBe(true);
  });

  it('handles regex exclude patterns', () => {
    expect(
      matchesFilter(makeRequest({ url: 'https://api.example.com/healthz' }), {
        excludeUrls: [/health/],
      })
    ).toBe(false);
  });

  // ── Header filter ──────────────────────────────────────────────────

  it('allows a request when required headers are present with correct values', () => {
    expect(
      matchesFilter(makeRequest(), {
        headers: { 'content-type': 'application/json' },
      })
    ).toBe(true);
  });

  it('rejects a request when a required header is missing', () => {
    expect(
      matchesFilter(makeRequest(), {
        headers: { 'x-custom': 'value' },
      })
    ).toBe(false);
  });

  it('supports regex header matching', () => {
    expect(
      matchesFilter(makeRequest(), {
        headers: { 'content-type': /json/ },
      })
    ).toBe(true);
  });

  it('rejects when regex header does not match', () => {
    expect(
      matchesFilter(makeRequest(), {
        headers: { 'content-type': /xml/ },
      })
    ).toBe(false);
  });

  // ── Custom predicate ───────────────────────────────────────────────

  it('allows a request when the predicate returns true', () => {
    expect(
      matchesFilter(makeRequest(), {
        predicate: (req) => req.url.includes('users'),
      })
    ).toBe(true);
  });

  it('rejects a request when the predicate returns false', () => {
    expect(
      matchesFilter(makeRequest(), {
        predicate: () => false,
      })
    ).toBe(false);
  });

  // ── Combined filters ───────────────────────────────────────────────

  it('requires all filter conditions to pass', () => {
    const req = makeRequest({ method: 'POST', url: 'https://api.example.com/users' });
    expect(
      matchesFilter(req, {
        methods: ['POST'],
        urls: ['api.example.com'],
        excludeUrls: ['/health'],
        headers: { 'content-type': 'application/json' },
      })
    ).toBe(true);
  });

  it('rejects if any single filter condition fails', () => {
    const req = makeRequest({ method: 'DELETE' });
    expect(
      matchesFilter(req, {
        methods: ['GET', 'POST'],
        urls: ['api.example.com'],
      })
    ).toBe(false);
  });
});
