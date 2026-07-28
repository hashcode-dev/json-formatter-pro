import type { JsonValue } from './types';

export function isPlainObject(v: unknown): v is Record<string, JsonValue> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEmpty(value: JsonValue): boolean {
  if (value === null) return false;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

interface TreeRules {
  /** Reorder an object's own keys before it is rebuilt. */
  orderKeys?: (keys: string[]) => string[];
  /**
   * Drop an array element or object entry. Applied *after* the value has been
   * mapped, so the predicate sees the transformed value, not the original.
   */
  drop?: (mapped: JsonValue) => boolean;
}

/** Rebuild a JSON tree, optionally reordering object keys and dropping values. */
function mapTree(value: JsonValue, rules: TreeRules): JsonValue {
  const recurse = (v: JsonValue): JsonValue => mapTree(v, rules);

  if (Array.isArray(value)) {
    const mapped = value.map(recurse);
    return rules.drop ? mapped.filter((v) => !rules.drop!(v)) : mapped;
  }

  if (isPlainObject(value)) {
    const keys = rules.orderKeys
      ? rules.orderKeys(Object.keys(value))
      : Object.keys(value);
    const out: Record<string, JsonValue> = {};
    for (const k of keys) {
      const next = recurse(value[k] as JsonValue);
      if (rules.drop?.(next)) continue;
      out[k] = next;
    }
    return out;
  }

  return value;
}

export function sortKeys(value: JsonValue): JsonValue {
  return mapTree(value, { orderKeys: (keys) => keys.sort((a, b) => a.localeCompare(b)) });
}

/**
 * Dropping after recursion is equivalent to dropping before it here, because
 * stripNulls returns null only when its input was already null.
 */
export function stripNulls(value: JsonValue): JsonValue {
  return mapTree(value, { drop: (v) => v === null });
}

export function stripEmpty(value: JsonValue): JsonValue {
  return mapTree(value, { drop: isEmpty });
}
