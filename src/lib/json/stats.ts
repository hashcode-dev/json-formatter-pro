import type { JsonStats, JsonValue } from './types';

interface Accumulator {
  keys: number;
  objects: number;
  arrays: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  depth: number;
  approxMemory: number;
}

function walk(value: JsonValue, depth: number, acc: Accumulator): void {
  if (depth > acc.depth) acc.depth = depth;

  if (value === null) {
    acc.nulls++;
    acc.approxMemory += 4;
    return;
  }
  const t = typeof value;
  if (t === 'string') {
    acc.strings++;
    acc.approxMemory += (value as string).length * 2 + 16;
    return;
  }
  if (t === 'number') {
    acc.numbers++;
    acc.approxMemory += 8;
    return;
  }
  if (t === 'boolean') {
    acc.booleans++;
    acc.approxMemory += 4;
    return;
  }
  if (Array.isArray(value)) {
    acc.arrays++;
    acc.approxMemory += 32 + value.length * 8;
    for (const item of value) walk(item as JsonValue, depth + 1, acc);
    return;
  }
  // object
  acc.objects++;
  const entries = Object.entries(value);
  acc.keys += entries.length;
  acc.approxMemory += 40 + entries.length * 24;
  for (const [k, v] of entries) {
    acc.approxMemory += k.length * 2 + 16;
    walk(v as JsonValue, depth + 1, acc);
  }
}

export function computeStats(value: JsonValue, raw: string): JsonStats {
  const acc: Accumulator = {
    keys: 0, objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0,
    depth: 0, approxMemory: 0,
  };
  walk(value, 1, acc);
  const lines = raw.length === 0 ? 0 : raw.split(/\r\n|\r|\n/).length;
  const bytes = new TextEncoder().encode(raw).byteLength;
  return {
    keys: acc.keys,
    objects: acc.objects,
    arrays: acc.arrays,
    strings: acc.strings,
    numbers: acc.numbers,
    booleans: acc.booleans,
    nulls: acc.nulls,
    depth: acc.depth,
    characters: raw.length,
    lines,
    bytes,
    estimatedMemoryBytes: acc.approxMemory,
  };
}
