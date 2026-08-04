import type { OutputMode } from '@store/index';
import { parseJwt } from '@lib/json/jwt';
import { csvToJson, xmlToJson, yamlToJson } from '@lib/json/reverse-converters';

/**
 * What the *input* pane holds, per mode.
 *
 * Most modes read JSON, but not all of them: `/jwt-decoder/` takes a token and
 * the reverse converters take CSV/YAML/XML. Those pastes are never valid JSON,
 * so the shared worker's parse (which FormatterApp runs mode-agnostically)
 * reports "Invalid" for perfectly good input. This registry is the single place
 * that answers the three questions that follow from that: what is this mode's
 * input called, how is it validated for the status bar, and what sample seeds
 * it on a first visit.
 *
 * JSON deliberately has no `validate`: the worker already owns JSON validation,
 * complete with line/column and fix suggestions, and duplicating it here would
 * be a second source of truth.
 */

export type InputFormatId = 'json' | 'jwt' | 'csv' | 'yaml' | 'xml';

export interface InputValidation {
  ok: boolean;
  /** Why the input is invalid; rendered next to the status pill. */
  error?: string;
}

export interface InputFormat {
  id: InputFormatId;
  /** Noun for the status pill and the input pane's label: "Valid CSV". */
  label: string;
  /** Right-hand hint in the input pane header. */
  hint: string;
  /** `accept` for the toolbar's file picker. */
  uploadAccept: string;
  /** Seeded on a first visit to a page whose mode uses this format. */
  sample: string;
  /** Structural validation, or null when the JSON worker already owns it. */
  validate: ((raw: string) => InputValidation) | null;
  /**
   * True when the buffer is plausibly a document of this format, used to decide
   * whether leftover content from another tool page should be replaced by
   * `sample`. See `detectInputFormat` for the shape rules, and the seeding
   * effect in FormatterApp for why this is not simply "is it valid?".
   */
  claims: (raw: string) => boolean;
}

const SAMPLE_JSON = `{
  "app": "JSON Formatter Pro",
  "version": "1.0.0",
  "features": ["format", "validate", "minify", "tree", "stats", "converters", "jwt"],
  "author": {
    "name": "You",
    "email": "you@example.com"
  },
  "flags": {
    "private": true,
    "offline": true,
    "telemetry": false
  }
}`;

/**
 * Demo token for the JWT Inspector's first-load state. Based on the
 * well-known jwt.io example (header/`sub`/`name`/`iat` are the canonical
 * placeholder values), with an added `exp` claim (2100-01-01) so the
 * "check token expiration" feature has something to demonstrate too. The
 * signature is not real and is never verified — `parseJwt` (src/lib/json/jwt.ts)
 * only decodes and displays the header/payload, it does not check the
 * signature — so this is safe to embed and does not represent a real
 * credential.
 */
const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjQxMDI0NDQ4MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/** Quoted commas and a date column, so the first load shows the parser working. */
const SAMPLE_CSV = `id,name,role,active,joined
1,Ada Lovelace,"Engineer, Analytical",true,2024-01-15
2,Grace Hopper,Compiler Architect,true,2024-03-02
3,Alan Turing,Researcher,false,2023-11-27`;

const SAMPLE_YAML = `# Sample service definition
name: json-formatter-pro
version: "1.0.0"
private: true
build:
  runtime: static
  output: dist
features:
  - format
  - validate
  - convert
limits:
  maxUploadMb: 5
  retries: 3`;

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<library>
  <book id="1" available="true">
    <title>The Pragmatic Programmer</title>
    <author>Andrew Hunt</author>
    <year>1999</year>
  </book>
  <book id="2" available="false">
    <title>Refactoring</title>
    <author>Martin Fowler</author>
    <year>1999</year>
  </book>
</library>`;

/**
 * The format a buffer clearly belongs to, or null when it cannot be told apart
 * (prose, a half-typed fragment, a single bare word). Shape only — never
 * validity — so a document with a syntax error still resolves to its format
 * and a user's broken paste is not mistaken for another tool's leftovers.
 */
export function detectInputFormat(raw: string): InputFormatId | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (parseJwt(trimmed).ok) return 'jwt';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  const first = lines[0] ?? '';

  // A CSV/TSV header is delimited and is not itself a `key: value` pair, which
  // is what keeps `tags: [a, b]` on the YAML side of the fence.
  const isPair = /^("[^"]*"|'[^']*'|[\w.$ -]+)\s*:(\s|$)/;
  if (!isPair.test(first) && /[,;\t|]/.test(first)) return 'csv';
  if (lines.some((line) => line === '---' || line === '-' || line.startsWith('- ') || isPair.test(line))) {
    return 'yaml';
  }
  return null;
}

/** Only this format claims the buffer — used by the strict, non-JSON formats. */
function claimsExactly(id: InputFormatId): (raw: string) => boolean {
  return (raw) => detectInputFormat(raw) === id;
}

function fromReverseResult(result: { ok: boolean; error?: string }): InputValidation {
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export const INPUT_FORMATS: Record<InputFormatId, InputFormat> = {
  json: {
    id: 'json',
    label: 'JSON',
    hint: 'Paste, type, or drop a file',
    uploadAccept: '.json,.jsonc,.ndjson,.txt,application/json,text/plain',
    sample: SAMPLE_JSON,
    validate: null,
    // JSON claims anything it cannot rule out: it is the default across the
    // site, and a half-typed document must never be swapped for the sample.
    claims: (raw) => {
      const detected = detectInputFormat(raw);
      return detected === null || detected === 'json';
    },
  },
  jwt: {
    id: 'jwt',
    label: 'JWT',
    hint: 'Paste a JWT token',
    uploadAccept: '.txt,text/plain',
    sample: SAMPLE_JWT,
    validate: (raw) => {
      const result = parseJwt(raw);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    },
    claims: (raw) => parseJwt(raw).ok,
  },
  csv: {
    id: 'csv',
    label: 'CSV',
    hint: 'Paste CSV or TSV, or drop a file',
    uploadAccept: '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain',
    sample: SAMPLE_CSV,
    validate: (raw) => fromReverseResult(csvToJson(raw)),
    claims: claimsExactly('csv'),
  },
  yaml: {
    id: 'yaml',
    label: 'YAML',
    hint: 'Paste YAML, or drop a file',
    uploadAccept: '.yaml,.yml,.txt,text/yaml,application/yaml,text/plain',
    sample: SAMPLE_YAML,
    validate: (raw) => fromReverseResult(yamlToJson(raw)),
    claims: claimsExactly('yaml'),
  },
  xml: {
    id: 'xml',
    label: 'XML',
    hint: 'Paste XML, or drop a file',
    uploadAccept: '.xml,.txt,application/xml,text/xml,text/plain',
    sample: SAMPLE_XML,
    validate: (raw) => fromReverseResult(xmlToJson(raw)),
    claims: claimsExactly('xml'),
  },
};

/** Modes whose input pane is not JSON. Everything else falls through to JSON. */
const MODE_INPUT_FORMATS: Partial<Record<OutputMode, InputFormatId>> = {
  jwt: 'jwt',
  csvToJson: 'csv',
  yamlToJson: 'yaml',
  xmlToJson: 'xml',
};

export function inputFormatFor(mode: OutputMode): InputFormat {
  return INPUT_FORMATS[MODE_INPUT_FORMATS[mode] ?? 'json'];
}

/** True when the toolbar's JSON-only actions (Format, Minify) make sense. */
export function inputIsJson(mode: OutputMode): boolean {
  return inputFormatFor(mode).id === 'json';
}
