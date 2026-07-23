import type { FormatOptions, JsonError, JsonStats, JsonValue } from '@lib/json/types';

export type WorkerRequest =
  | { id: number; kind: 'process'; raw: string; options: FormatOptions }
  | { id: number; kind: 'minify'; raw: string }
  | { id: number; kind: 'convert-yaml'; raw: string }
  | { id: number; kind: 'convert-xml'; raw: string }
  | { id: number; kind: 'convert-csv'; raw: string }
  | { id: number; kind: 'convert-ts'; raw: string }
  | { id: number; kind: 'convert-schema'; raw: string };

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
  | { id: number; kind: 'minify'; ok: false; error: JsonError }
  | { id: number; kind: 'convert-yaml'; ok: true; output: string }
  | { id: number; kind: 'convert-yaml'; ok: false; error: JsonError }
  | { id: number; kind: 'convert-xml'; ok: true; output: string }
  | { id: number; kind: 'convert-xml'; ok: false; error: JsonError }
  | { id: number; kind: 'convert-csv'; ok: true; output: string }
  | { id: number; kind: 'convert-csv'; ok: false; error: JsonError }
  | { id: number; kind: 'convert-ts'; ok: true; output: string }
  | { id: number; kind: 'convert-ts'; ok: false; error: JsonError }
  | { id: number; kind: 'convert-schema'; ok: true; output: string }
  | { id: number; kind: 'convert-schema'; ok: false; error: JsonError };
