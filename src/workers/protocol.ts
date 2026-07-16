import type { FormatOptions, JsonError, JsonStats, JsonValue } from '@lib/json/types';

export type WorkerRequest =
  | { id: number; kind: 'process'; raw: string; options: FormatOptions }
  | { id: number; kind: 'minify'; raw: string };

export type WorkerResponse =
  | {
      id: number;
      kind: 'process';
      ok: true;
      formatted: string;
      stats: JsonStats;
      value: JsonValue;
    }
  | { id: number; kind: 'process'; ok: false; error: JsonError }
  | { id: number; kind: 'minify'; ok: true; minified: string }
  | { id: number; kind: 'minify'; ok: false; error: JsonError };
