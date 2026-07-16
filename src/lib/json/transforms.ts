import type { JsonValue } from './types';

function isPlainObject(v: unknown): v is Record<string, JsonValue> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    const out: Record<string, JsonValue> = {};
    for (const k of keys) out[k] = sortKeys(value[k] as JsonValue);
    return out;
  }
  return value;
}

export function stripNulls(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.filter((v) => v !== null).map(stripNulls);
  if (isPlainObject(value)) {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}

function isEmpty(value: JsonValue): boolean {
  if (value === null) return false;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

export function stripEmpty(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(stripEmpty).filter((v) => !isEmpty(v));
  }
  if (isPlainObject(value)) {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) {
      const next = stripEmpty(v);
      if (isEmpty(next)) continue;
      out[k] = next;
    }
    return out;
  }
  return value;
}
