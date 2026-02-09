import { describe, it, expect } from 'vitest';
import {
  withContext,
  getContext,
  getCorrelationId,
  addContextTags,
  type RequestContext,
} from '../src/utils/context.js';

describe('withContext / getContext', () => {
  it('provides context inside the callback', () => {
    const ctx: RequestContext = {
      correlationId: 'cor_test1',
      spanId: 'spn_test1',
      tags: {},
    };

    withContext(ctx, () => {
      expect(getContext()).toBe(ctx);
    });
  });

  it('returns undefined outside of any context', () => {
    expect(getContext()).toBeUndefined();
  });

  it('returns the value produced by the callback', () => {
    const ctx: RequestContext = {
      correlationId: 'cor_x',
      spanId: 'spn_x',
      tags: {},
    };
    const result = withContext(ctx, () => 42);
    expect(result).toBe(42);
  });

  it('supports nested contexts with independent scopes', () => {
    const outer: RequestContext = {
      correlationId: 'cor_outer',
      spanId: 'spn_outer',
      tags: {},
    };
    const inner: RequestContext = {
      correlationId: 'cor_inner',
      spanId: 'spn_inner',
      tags: {},
    };

    withContext(outer, () => {
      expect(getCorrelationId()).toBe('cor_outer');

      withContext(inner, () => {
        expect(getCorrelationId()).toBe('cor_inner');
      });

      // Outer context is restored after inner exits
      expect(getCorrelationId()).toBe('cor_outer');
    });
  });
});

describe('getCorrelationId', () => {
  it('returns the correlation ID from current context', () => {
    const ctx: RequestContext = {
      correlationId: 'cor_abc',
      spanId: 'spn_abc',
      tags: {},
    };
    withContext(ctx, () => {
      expect(getCorrelationId()).toBe('cor_abc');
    });
  });

  it('returns undefined when no context is set', () => {
    expect(getCorrelationId()).toBeUndefined();
  });
});

describe('addContextTags', () => {
  it('adds tags to the current context', () => {
    const ctx: RequestContext = {
      correlationId: 'cor_tags',
      spanId: 'spn_tags',
      tags: { existing: 'value' },
    };

    withContext(ctx, () => {
      addContextTags({ newTag: 'added' });
      expect(getContext()!.tags).toEqual({
        existing: 'value',
        newTag: 'added',
      });
    });
  });

  it('overwrites existing tags with the same key', () => {
    const ctx: RequestContext = {
      correlationId: 'cor_overwrite',
      spanId: 'spn_overwrite',
      tags: { key: 'old' },
    };

    withContext(ctx, () => {
      addContextTags({ key: 'new' });
      expect(getContext()!.tags.key).toBe('new');
    });
  });

  it('does nothing when called outside of a context', () => {
    // Should not throw
    expect(() => addContextTags({ key: 'value' })).not.toThrow();
  });
});
