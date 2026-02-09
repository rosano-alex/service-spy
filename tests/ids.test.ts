import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateCorrelationId,
  generateSpanId,
} from '../src/utils/ids.js';

describe('generateId', () => {
  it('returns a hex string when no prefix is given', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-f0-9]{16}$/);
  });

  it('returns a prefixed ID when prefix is provided', () => {
    const id = generateId('req');
    expect(id).toMatch(/^req_[a-f0-9]{16}$/);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('x')));
    expect(ids.size).toBe(100);
  });
});

describe('generateCorrelationId', () => {
  it('returns an ID with the "cor" prefix', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^cor_[a-f0-9]{16}$/);
  });
});

describe('generateSpanId', () => {
  it('returns an ID with the "spn" prefix', () => {
    const id = generateSpanId();
    expect(id).toMatch(/^spn_[a-f0-9]{16}$/);
  });
});
