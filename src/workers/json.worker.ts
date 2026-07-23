/// <reference lib="webworker" />

import { parse } from '@lib/json/parser';
import { stringify, minify, decodeUnicodeEscapes } from '@lib/json/formatter';
import { sortKeys, stripNulls, stripEmpty } from '@lib/json/transforms';
import { computeStats } from '@lib/json/stats';
import {
  jsonToYaml,
  jsonToXml,
  jsonToCsv,
  jsonToTypeScript,
  jsonToJsonSchema,
} from '@lib/json/converters';
import type { WorkerRequest, WorkerResponse } from './protocol';
import type { JsonValue } from '@lib/json/types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

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
      const result = parse(msg.raw);
      if (!result.ok) {
        const response: WorkerResponse = { id: msg.id, kind: 'process', ok: false, error: result.error };
        ctx.postMessage(response);
        return;
      }
      const transformed = applyTransforms(result.value, msg.options);
      let formatted = stringify(transformed, msg.options.indent);
      if (msg.options.decodeUnicode) formatted = decodeUnicodeEscapes(formatted);
      const stats = computeStats(transformed, formatted);
      const response: WorkerResponse = {
        id: msg.id, kind: 'process', ok: true,
        formatted, stats, value: transformed,
      };
      ctx.postMessage(response);
      return;
    }

    if (msg.kind === 'minify') {
      const result = parse(msg.raw);
      if (!result.ok) {
        ctx.postMessage({ id: msg.id, kind: 'minify', ok: false, error: result.error } as WorkerResponse);
        return;
      }
      ctx.postMessage({ id: msg.id, kind: 'minify', ok: true, minified: minify(result.value) } as WorkerResponse);
      return;
    }

    if (
      msg.kind === 'convert-yaml' ||
      msg.kind === 'convert-xml' ||
      msg.kind === 'convert-csv' ||
      msg.kind === 'convert-ts' ||
      msg.kind === 'convert-schema'
    ) {
      const result = parse(msg.raw);
      if (!result.ok) {
        ctx.postMessage({ id: msg.id, kind: msg.kind, ok: false, error: result.error } as WorkerResponse);
        return;
      }

      let output = '';
      if (msg.kind === 'convert-yaml') output = jsonToYaml(result.value);
      else if (msg.kind === 'convert-xml') output = jsonToXml(result.value);
      else if (msg.kind === 'convert-csv') output = jsonToCsv(result.value);
      else if (msg.kind === 'convert-ts') output = jsonToTypeScript(result.value);
      else if (msg.kind === 'convert-schema') output = jsonToJsonSchema(result.value);

      ctx.postMessage({ id: msg.id, kind: msg.kind, ok: true, output } as WorkerResponse);
      return;
    }
  } catch (err) {
    ctx.postMessage({
      id: (msg as WorkerRequest).id,
      kind: (msg as WorkerRequest).kind,
      ok: false,
      error: {
        line: 1, column: 1, offset: 0, length: 0,
        message: err instanceof Error ? err.message : 'Unknown worker error',
      },
    } as WorkerResponse);
  }
});
