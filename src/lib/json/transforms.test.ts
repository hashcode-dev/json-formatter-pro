import { describe, it, expect } from 'vitest';
import { sortKeys, stripNulls, stripEmpty } from './transforms';

describe('sortKeys', () => {
  it('sorts object keys recursively and leaves array order alone', () => {
    expect(sortKeys({ b: 1, a: { d: 2, c: 3 } })).toEqual({ a: { c: 3, d: 2 }, b: 1 });
    expect(Object.keys(sortKeys({ b: 1, a: 2 }) as object)).toEqual(['a', 'b']);
    expect(sortKeys([3, 1, 2])).toEqual([3, 1, 2]);
  });

  it('keeps every value, including nulls and empties', () => {
    expect(sortKeys({ b: null, a: '', c: [] })).toEqual({ a: '', b: null, c: [] });
  });

  it('passes primitives through', () => {
    expect(sortKeys(null)).toBe(null);
    expect(sortKeys('x')).toBe('x');
  });
});

describe('stripNulls', () => {
  it('drops null object entries and null array elements', () => {
    expect(stripNulls({ a: 1, b: null })).toEqual({ a: 1 });
    expect(stripNulls([1, null, 2])).toEqual([1, 2]);
  });

  it('recurses into nested containers', () => {
    expect(stripNulls({ a: { b: null, c: [null, 1] } })).toEqual({ a: { c: [1] } });
  });

  it('keeps empty strings, objects, and arrays', () => {
    expect(stripNulls({ a: '', b: {}, c: [] })).toEqual({ a: '', b: {}, c: [] });
  });

  it('returns null unchanged at the root', () => {
    expect(stripNulls(null)).toBe(null);
  });
});

describe('stripEmpty', () => {
  it('drops empty strings, objects, and arrays', () => {
    expect(stripEmpty({ a: 1, b: '', c: {}, d: [] })).toEqual({ a: 1 });
    expect(stripEmpty(['x', '', [], {}])).toEqual(['x']);
  });

  it('keeps nulls, zero, and false', () => {
    expect(stripEmpty({ a: null, b: 0, c: false })).toEqual({ a: null, b: 0, c: false });
  });

  it('drops containers that become empty after their children are dropped', () => {
    expect(stripEmpty({ a: { b: '' } })).toEqual({});
    expect(stripEmpty({ a: [['']] })).toEqual({});
  });
});

describe('all transforms', () => {
  it('do not mutate their input', () => {
    const input = { b: [1, null, ''], a: { z: null } };
    const snapshot = JSON.stringify(input);
    sortKeys(input);
    stripNulls(input);
    stripEmpty(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
