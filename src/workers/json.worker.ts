/// <reference lib="webworker" />

import { parse } from '@lib/json/parser';
import { stringify, minify, decodeUnicodeEscapes } from '@lib/json/formatter';
import { sortKeys, stripNulls, stripEmpty } from '@lib/json/transforms';
import { computeStats } from '@lib/json/stats';
import type { WorkerKind, WorkerRequest, WorkerResponse } from './protocol';
import type { JsonError, JsonValue, ParseResult } from '@lib/json/types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function send(response: WorkerResponse): void {
  ctx.postMessage(response);
}

function fail(id: number, kind: WorkerKind, error: JsonError): void {
  send({ id, kind, ok: false, error });
}

/**
 * Parse, reporting any failure to the client. Returns the whole ParseResult so
 * callers narrow on `ok` — a valid `null` document must not read as a failure.
 */
function parseOrFail(msg: WorkerRequest): ParseResult {
  const result = parse(msg.raw);
  if (!result.ok) fail(msg.id, msg.kind, result.error);
  return result;
}

function applyTransforms(
  value: JsonValue,
  opts: { sortKeys: boolean; stripNull: boolean; stripEmpty: boolean },
): JsonValue {
  let out = value;
  if (opts.stripNull) out = stripNulls(out);
  if (opts.stripEmpty) out = stripEmpty(out);
  if (opts.sortKeys) out = sortKeys(out);
  return out;
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.kind === 'process') {
      const result = parseOrFail(msg);
      if (!result.ok) return;
      const transformed = applyTransforms(result.value, msg.options);
      let formatted = stringify(transformed, msg.options.indent);
      if (msg.options.decodeUnicode) formatted = decodeUnicodeEscapes(formatted);
      send({
        id: msg.id,
        kind: 'process',
        ok: true,
        formatted,
        stats: computeStats(transformed, formatted),
        value: transformed,
      });
      return;
    }

    if (msg.kind === 'minify') {
      const result = parseOrFail(msg);
      if (!result.ok) return;
      send({ id: msg.id, kind: 'minify', ok: true, minified: minify(result.value) });
      return;
    }
  } catch (err) {
    fail(msg.id, msg.kind, {
      line: 1,
      column: 1,
      offset: 0,
      length: 0,
      message: err instanceof Error ? err.message : 'Unknown worker error',
    });
  }
});
