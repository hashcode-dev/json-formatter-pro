import type { FormatOptions, JsonError, JsonStats, JsonValue } from '@lib/json/types';

export type WorkerRequest =
  | { id: number; kind: 'process'; raw: string; options: FormatOptions }
  | { id: number; kind: 'minify'; raw: string };

export type WorkerKind = WorkerRequest['kind'];

type Failure<K extends WorkerKind> = { id: number; kind: K; ok: false; error: JsonError };

export type WorkerResponse =
  | {
      id: number;
      kind: 'process';
      ok: true;
      formatted: string;
      stats: JsonStats;
      value: JsonValue;
    }
  | { id: number; kind: 'minify'; ok: true; minified: string }
  | Failure<WorkerKind>;
