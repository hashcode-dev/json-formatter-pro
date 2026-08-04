import type { IndentOption, JsonValue } from './types';

/**
 * Reverse converters: a source format in, JSON out.
 *
 * Everything else in `src/lib/json` assumes the editor already holds JSON.
 * These three parsers run the other direction (CSV/YAML/XML → JSON) and back
 * the "X to JSON" tool pages. They follow `parseJwt` (src/lib/json/jwt.ts):
 * failures come back as an `ok: false` result carrying a human-readable
 * reason, never as a thrown exception, so the status bar can say *why* the
 * paste is invalid instead of falling back to a generic "Invalid JSON".
 *
 * All three are pure functions of their input with one environment caveat:
 * `xmlToJson` needs the browser's `DOMParser`. It is only ever called from a
 * React island (`client:only`), so that is available at runtime, but the
 * module is still imported during the Astro build — hence the guard rather
 * than a top-level reference.
 */

export interface ReverseConvertSuccess {
  ok: true;
  /** The parsed document. */
  value: JsonValue;
  /** `value` serialised with the requested indentation — what the UI renders. */
  json: string;
}

export interface ReverseConvertFailure {
  ok: false;
  error: string;
}

export type ReverseConvertResult = ReverseConvertSuccess | ReverseConvertFailure;

export interface ReverseConvertOptions {
  /** Indentation of the emitted JSON. Defaults to 2 spaces. */
  indent?: IndentOption;
}

function succeed(value: JsonValue, options?: ReverseConvertOptions): ReverseConvertSuccess {
  return { ok: true, value, json: JSON.stringify(value, null, options?.indent ?? 2) };
}

function fail(error: string): ReverseConvertFailure {
  return { ok: false, error };
}

/* ------------------------------------------------------------------ *
 * CSV / TSV → JSON
 * ------------------------------------------------------------------ */

/** Separators the sniffer knows about, in preference order on a tie. */
const CSV_DELIMITERS = [',', '\t', ';', '|'];

export interface CsvToJsonOptions extends ReverseConvertOptions {
  /**
   * Field separator. `'auto'` (the default) picks whichever of `, \t ; |`
   * occurs most often outside quotes, which is what makes TSV and
   * semicolon-separated European exports work with no extra UI.
   */
  delimiter?: string;
}

interface CsvField {
  text: string;
  /** Quoted fields skip type inference — see `inferCsvValue`. */
  quoted: boolean;
}

/**
 * RFC 4180 tokeniser. Quoted fields may contain the delimiter, CR/LF and
 * doubled quotes (`""` → `"`). Two deliberate leniencies, because real
 * exports contain both: a bare `"` inside an unquoted field is kept as a
 * literal character, and text after a closing quote is appended to the field
 * instead of raising an error.
 */
function splitCsvRecords(
  text: string,
  delimiter: string,
): { ok: true; records: CsvField[][] } | { ok: false; error: string } {
  const records: CsvField[][] = [];
  let record: CsvField[] = [];
  let field = '';
  let fieldQuoted = false;
  let inQuotes = false;
  let quoteStartLine = 0;
  let line = 1;
  let i = 0;

  const endField = (): void => {
    record.push({ text: field, quoted: fieldQuoted });
    field = '';
    fieldQuoted = false;
  };

  const endRecord = (): void => {
    endField();
    // A physically blank line produces one empty unquoted field; drop it so
    // trailing newlines and blank separator lines do not become null rows.
    const blank = record.length === 1 && !record[0]!.quoted && record[0]!.text === '';
    if (!blank) records.push(record);
    record = [];
  };

  while (i < text.length) {
    const ch = text.charAt(i);

    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\n') line += 1;
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && field === '' && !fieldQuoted) {
      inQuotes = true;
      fieldQuoted = true;
      quoteStartLine = line;
      i += 1;
      continue;
    }

    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text.charAt(i + 1) === '\n') i += 1;
      i += 1;
      line += 1;
      endRecord();
      continue;
    }

    field += ch;
    i += 1;
  }

  if (inQuotes) {
    return {
      ok: false,
      error: `Unterminated quoted field starting on line ${quoteStartLine} (add the closing " or escape it as "").`,
    };
  }

  if (field !== '' || fieldQuoted || record.length > 0) endRecord();

  return { ok: true, records };
}

/** Counts a candidate delimiter, ignoring anything inside quoted fields. */
function countOutsideQuotes(text: string, needle: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (ch === '"') {
      if (inQuotes && text.charAt(i + 1) === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === needle) count += 1;
  }
  return count;
}

function sniffDelimiter(text: string): string {
  let best = ',';
  let bestCount = 0;
  for (const candidate of CSV_DELIMITERS) {
    const count = countOutsideQuotes(text, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Type inference, kept deliberately conservative:
 *
 * - A **quoted** field is always a string. RFC 4180 quoting is the author's
 *   own signal that the value is text, so `"007"`, `"true"` and `""` survive.
 * - An **unquoted** field becomes `null` when empty or `null` (any case), a
 *   boolean for `true`/`false` (any case), and a number only when it matches
 *   JSON's own number grammar *and* round-trips exactly
 *   (`String(Number(s)) === s`).
 *
 * The round-trip rule is what keeps IDs, zip codes, phone numbers and long
 * account numbers intact: `007`, `+1`, `1.10`, `1e999` and
 * `12345678901234567890` all stay strings rather than being silently
 * rewritten or losing precision.
 *
 * Unquoted fields are also trimmed, because `a, b` from a spreadsheet export
 * means `b` rather than `" b"`; quote the field to keep the padding.
 */
function inferCsvValue(field: CsvField): JsonValue {
  if (field.quoted) return field.text;
  const raw = field.text.trim();
  if (raw === '') return null;
  const lower = raw.toLowerCase();
  if (lower === 'null') return null;
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num) && String(num) === raw) return num;
  }
  return raw;
}

/**
 * Header names must be unique and non-empty to make usable JSON keys: a blank
 * header becomes `column_N` (1-based) and a repeat gets a `_2`, `_3`, … suffix.
 */
function normaliseHeaders(header: CsvField[]): string[] {
  const seen = new Map<string, number>();
  return header.map((field, index) => {
    const base = field.text.trim() === '' ? `column_${index + 1}` : field.text.trim();
    const used = seen.get(base) ?? 0;
    seen.set(base, used + 1);
    return used === 0 ? base : `${base}_${used + 1}`;
  });
}

/**
 * CSV (or TSV) with a header row → an array of objects.
 *
 * Row length mismatches are tolerated rather than rejected, because exports
 * routinely have ragged rows: missing trailing columns become `null`, and
 * surplus columns are named `field_N` after the last header.
 */
export function csvToJson(text: string, options: CsvToJsonOptions = {}): ReverseConvertResult {
  if (text.trim() === '') return fail('CSV input is empty.');

  const delimiter = options.delimiter ?? sniffDelimiter(text);
  if (delimiter.length !== 1) {
    return fail('Delimiter must be a single character.');
  }

  const split = splitCsvRecords(text, delimiter);
  if (!split.ok) return fail(split.error);

  const [header, ...rows] = split.records;
  if (!header) return fail('CSV input has no header row.');

  const headers = normaliseHeaders(header);
  const out: JsonValue[] = rows.map((record) => {
    const row: Record<string, JsonValue> = {};
    headers.forEach((name, index) => {
      const cell = record[index];
      row[name] = cell ? inferCsvValue(cell) : null;
    });
    for (let index = headers.length; index < record.length; index += 1) {
      row[`field_${index + 1}`] = inferCsvValue(record[index]!);
    }
    return row;
  });

  return succeed(out, options);
}

/* ------------------------------------------------------------------ *
 * YAML → JSON
 * ------------------------------------------------------------------ */

/**
 * Thrown while walking YAML and converted to a `ReverseConvertFailure` at the
 * public boundary, so the recursive walker can bail out from any depth.
 */
class YamlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YamlError';
  }
}

export type YamlToJsonOptions = ReverseConvertOptions;

/**
 * Which of `|`/`>` block scalar header a value is, if any: an indicator, an
 * optional chomping modifier (`-` strip, `+` keep) and an optional explicit
 * indentation digit, in either order.
 */
const BLOCK_SCALAR_HEADER = /^([|>])([+-]?)(\d?)([+-]?)$/;

function isBlockScalarHeader(text: string): boolean {
  return BLOCK_SCALAR_HEADER.test(text);
}

/** Leading spaces. Tabs are illegal YAML indentation, so they are rejected. */
function yamlIndentOf(raw: string, lineNo: number): number {
  let indent = 0;
  while (indent < raw.length && raw.charAt(indent) === ' ') indent += 1;
  if (raw.charAt(indent) === '\t') {
    throw new YamlError(`Tab indentation on line ${lineNo}. YAML requires spaces for indentation.`);
  }
  return indent;
}

/**
 * Strips a trailing `# comment`. A `#` only starts a comment when it follows
 * whitespace (or opens the line) and sits outside quotes, so `a#b` and
 * `url: http://x/#frag` keep their hash.
 */
function stripYamlComment(raw: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charAt(i);
    if (quote) {
      if (ch === '\\' && quote === '"') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || raw.charAt(i - 1) === ' ' || raw.charAt(i - 1) === '\t')) {
      return raw.slice(0, i).trimEnd();
    }
  }
  return raw.trimEnd();
}

function isIgnorableYamlLine(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

/**
 * Splits `key: value` at the first top-level colon — one that is outside
 * quotes and outside any `[]`/`{}` flow collection, and followed by a space or
 * the end of the line. Returns null when the line is not a mapping entry, so
 * `- 12:30` and `http://x` are read as scalars.
 */
function splitYamlEntry(content: string): { key: string; rest: string } | null {
  let quote: '"' | "'" | null = null;
  let depth = 0;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content.charAt(i);
    if (quote) {
      if (ch === '\\' && quote === '"') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === ']' || ch === '}') {
      depth -= 1;
      continue;
    }
    if (ch === ':' && depth === 0) {
      const next = content.charAt(i + 1);
      if (next === '' || next === ' ') {
        return { key: content.slice(0, i).trim(), rest: content.slice(i + 1).trim() };
      }
    }
  }
  return null;
}

function unquoteYaml(text: string): string {
  const quote = text.charAt(0);
  const body = text.slice(1, -1);
  if (quote === "'") {
    // Single quotes are literal; only '' is an escape.
    return body.replace(/''/g, "'");
  }
  try {
    return JSON.parse(`"${body}"`) as string;
  } catch {
    // Not a JSON-compatible escape sequence; fall back to the raw body so a
    // stray backslash does not fail the whole document.
    return body;
  }
}

function isYamlQuoted(text: string): boolean {
  return (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))
  );
}

/**
 * Plain scalar resolution follows the YAML 1.2 **core schema**: `null`/`~`/
 * empty, `true`/`false` (plus `True`/`TRUE` spellings), and integers/floats.
 * Notably `yes`, `no`, `on`, `off` stay strings — that is 1.2 behaviour and
 * avoids the classic "Norway problem" of turning `NO` into `false`. Numbers
 * must round-trip exactly, for the same reason as in CSV: no silently
 * corrupted IDs.
 */
function resolveYamlScalar(text: string, lineNo: number): JsonValue {
  if (isYamlQuoted(text)) return unquoteYaml(text);

  const first = text.charAt(0);
  if (first === '&' || first === '*' || first === '!') {
    throw new YamlError(
      `Anchors, aliases and tags are not supported (line ${lineNo}). Inline the value instead.`,
    );
  }

  if (text === '' || text === '~' || text === 'null' || text === 'Null' || text === 'NULL') {
    return null;
  }
  if (text === 'true' || text === 'True' || text === 'TRUE') return true;
  if (text === 'false' || text === 'False' || text === 'FALSE') return false;

  if (/^[-+]?(\d+|\d*\.\d+)([eE][-+]?\d+)?$/.test(text)) {
    const num = Number(text);
    if (Number.isFinite(num) && String(num) === text) return num;
  }
  if (/^0o[0-7]+$/.test(text)) return parseInt(text.slice(2), 8);
  if (/^0x[0-9a-fA-F]+$/.test(text)) return parseInt(text.slice(2), 16);

  return text;
}

/**
 * Single-line flow collections (`[a, b]`, `{a: 1, b: [2]}`), nested freely.
 * Multi-line flow style is not supported — an unbalanced bracket raises a
 * message that says so rather than guessing.
 */
function parseYamlFlow(text: string, lineNo: number): JsonValue {
  let i = 0;

  const skipSpace = (): void => {
    while (i < text.length && (text.charAt(i) === ' ' || text.charAt(i) === '\t')) i += 1;
  };

  const readQuoted = (): string => {
    const quote = text.charAt(i);
    let out = quote;
    i += 1;
    while (i < text.length) {
      const ch = text.charAt(i);
      out += ch;
      i += 1;
      if (ch === '\\' && quote === '"') {
        out += text.charAt(i);
        i += 1;
        continue;
      }
      if (ch === quote) return out;
    }
    throw new YamlError(`Unterminated quoted string on line ${lineNo}.`);
  };

  /** Reads a plain scalar up to the next structural character. */
  const readPlain = (stopAtColon: boolean): string => {
    const start = i;
    while (i < text.length) {
      const ch = text.charAt(i);
      if (ch === ',' || ch === ']' || ch === '}') break;
      if (stopAtColon && ch === ':' && (text.charAt(i + 1) === ' ' || text.charAt(i + 1) === '')) break;
      i += 1;
    }
    return text.slice(start, i).trim();
  };

  const parseValue = (): JsonValue => {
    skipSpace();
    const ch = text.charAt(i);

    if (ch === '[') {
      i += 1;
      const arr: JsonValue[] = [];
      skipSpace();
      if (text.charAt(i) === ']') {
        i += 1;
        return arr;
      }
      for (;;) {
        arr.push(parseValue());
        skipSpace();
        const sep = text.charAt(i);
        if (sep === ',') {
          i += 1;
          skipSpace();
          if (text.charAt(i) === ']') {
            i += 1;
            return arr;
          }
          continue;
        }
        if (sep === ']') {
          i += 1;
          return arr;
        }
        throw new YamlError(`Expected "," or "]" in the flow sequence on line ${lineNo}.`);
      }
    }

    if (ch === '{') {
      i += 1;
      const obj: Record<string, JsonValue> = {};
      skipSpace();
      if (text.charAt(i) === '}') {
        i += 1;
        return obj;
      }
      for (;;) {
        skipSpace();
        const keyRaw =
          text.charAt(i) === '"' || text.charAt(i) === "'" ? readQuoted() : readPlain(true);
        skipSpace();
        if (text.charAt(i) !== ':') {
          throw new YamlError(`Expected ":" in the flow mapping on line ${lineNo}.`);
        }
        i += 1;
        const key = isYamlQuoted(keyRaw) ? unquoteYaml(keyRaw) : keyRaw;
        obj[key] = parseValue();
        skipSpace();
        const sep = text.charAt(i);
        if (sep === ',') {
          i += 1;
          skipSpace();
          if (text.charAt(i) === '}') {
            i += 1;
            return obj;
          }
          continue;
        }
        if (sep === '}') {
          i += 1;
          return obj;
        }
        throw new YamlError(`Expected "," or "}" in the flow mapping on line ${lineNo}.`);
      }
    }

    if (ch === '"' || ch === "'") return unquoteYaml(readQuoted());
    return resolveYamlScalar(readPlain(false), lineNo);
  };

  const value = parseValue();
  skipSpace();
  if (i < text.length) {
    throw new YamlError(
      `Unexpected "${text.slice(i, i + 12)}" after the flow collection on line ${lineNo}. Multi-line flow style is not supported.`,
    );
  }
  return value;
}

function parseYamlScalarOrFlow(text: string, lineNo: number): JsonValue {
  if (text.startsWith('[') || text.startsWith('{')) return parseYamlFlow(text, lineNo);
  return resolveYamlScalar(text, lineNo);
}

/**
 * YAML → JSON for the practical subset people actually paste: nested maps by
 * indentation, block sequences, quoted and plain scalars, comments, single-line
 * flow collections and `|`/`>` block scalars.
 *
 * Deliberately **not** supported, each with an explicit error rather than a
 * silent mangling: anchors/aliases/tags (`&a`, `*a`, `!!str`), merge keys,
 * multi-document streams, explicit `? key` syntax, multi-line plain scalars and
 * multi-line flow collections. Duplicate keys resolve last-wins, matching
 * `JSON.parse`.
 */
export function yamlToJson(text: string, options: YamlToJsonOptions = {}): ReverseConvertResult {
  if (text.trim() === '') return fail('YAML input is empty.');

  const lines = text.split(/\r\n|\r|\n/);
  let i = 0;

  const skipIgnorable = (): void => {
    while (i < lines.length && isIgnorableYamlLine(lines[i] ?? '')) i += 1;
  };

  /** The next meaningful line, or null at end of document. */
  const peek = (): { indent: number; content: string; n: number } | null => {
    skipIgnorable();
    if (i >= lines.length) return null;
    const raw = lines[i] ?? '';
    const n = i + 1;
    return { indent: yamlIndentOf(raw, n), content: stripYamlComment(raw).trim(), n };
  };

  /**
   * Reads a `|`/`>` block scalar. `parentIndent` is the indentation of the
   * line carrying the indicator; the body is whatever is indented past it.
   */
  const readBlockScalar = (header: string, parentIndent: number): string => {
    const match = BLOCK_SCALAR_HEADER.exec(header)!;
    const folded = match[1] === '>';
    const chomp = (match[2] || match[4] || '') as '' | '-' | '+';
    const explicitIndent = match[3] ? Number(match[3]) : 0;
    i += 1; // consume the indicator line

    let bodyIndent = explicitIndent > 0 ? parentIndent + explicitIndent : -1;
    if (bodyIndent < 0) {
      for (let probe = i; probe < lines.length; probe += 1) {
        const candidate = lines[probe] ?? '';
        if (candidate.trim() === '') continue;
        const candidateIndent = yamlIndentOf(candidate, probe + 1);
        bodyIndent = candidateIndent > parentIndent ? candidateIndent : -1;
        break;
      }
    }
    if (bodyIndent < 0) return '';

    const body: string[] = [];
    while (i < lines.length) {
      const raw = lines[i] ?? '';
      if (raw.trim() === '') {
        body.push('');
        i += 1;
        continue;
      }
      if (yamlIndentOf(raw, i + 1) < bodyIndent) break;
      body.push(raw.slice(bodyIndent));
      i += 1;
    }

    // Trailing blank lines only matter for the "keep" chomping indicator.
    let trailing = 0;
    while (body.length > 0 && body[body.length - 1] === '') {
      body.pop();
      trailing += 1;
    }

    let joined: string;
    if (!folded) {
      joined = body.join('\n');
    } else {
      // Folding: single line breaks become spaces, blank lines stay as breaks,
      // and more-indented lines keep their own break (as YAML specifies).
      joined = '';
      body.forEach((lineText, index) => {
        if (index === 0) {
          joined = lineText;
          return;
        }
        const previous = body[index - 1] ?? '';
        if (lineText === '' || previous === '' || lineText.startsWith(' ')) {
          joined += `\n${lineText}`;
        } else {
          joined += ` ${lineText}`;
        }
      });
    }

    if (chomp === '-') return joined;
    if (chomp === '+') return joined + '\n'.repeat(trailing + (joined === '' ? 0 : 1));
    return joined === '' ? '' : `${joined}\n`;
  };

  /**
   * Rewrites the current line so a value that begins on a `-` line (`- a: 1`,
   * `- - x`) can be parsed by the ordinary block parsers: the dash is replaced
   * with spaces, leaving the nested node at its true column.
   */
  const reindentAfterDash = (dashIndent: number): number => {
    const raw = lines[i] ?? '';
    const afterDash = raw.slice(dashIndent + 1);
    const childIndent = dashIndent + 1 + (afterDash.length - afterDash.trimStart().length);
    lines[i] = ' '.repeat(childIndent) + afterDash.trimStart();
    return childIndent;
  };

  const parseBlock = (indent: number): JsonValue => {
    const line = peek();
    if (!line) return null;
    const isSequence = line.content === '-' || line.content.startsWith('- ');
    return isSequence ? parseSequence(indent) : parseMapping(indent);
  };

  /** The child node of a `key:`/`-` line whose value lives on later lines. */
  const parseChildOrNull = (parentIndent: number): JsonValue => {
    const next = peek();
    if (!next || next.indent <= parentIndent) return null;
    return parseBlock(next.indent);
  };

  const parseMapping = (indent: number): JsonValue => {
    const obj: Record<string, JsonValue> = {};
    for (;;) {
      const line = peek();
      if (!line || line.indent < indent) break;
      if (line.content === '---' || line.content === '...') break;
      if (line.indent > indent) {
        throw new YamlError(
          `Unexpected indentation on line ${line.n}. Multi-line plain scalars are not supported — use a "|" or ">" block scalar.`,
        );
      }
      if (line.content.startsWith('? ')) {
        throw new YamlError(`Explicit "? key" syntax is not supported (line ${line.n}).`);
      }
      const entry = splitYamlEntry(line.content);
      if (!entry) {
        throw new YamlError(`Expected "key: value" on line ${line.n}, found "${line.content}".`);
      }
      const key = isYamlQuoted(entry.key) ? unquoteYaml(entry.key) : entry.key;
      if (key === '<<') {
        throw new YamlError(`Merge keys ("<<") are not supported (line ${line.n}).`);
      }
      if (entry.rest === '') {
        i += 1;
        obj[key] = parseChildOrNull(indent);
      } else if (isBlockScalarHeader(entry.rest)) {
        obj[key] = readBlockScalar(entry.rest, indent);
      } else {
        obj[key] = parseYamlScalarOrFlow(entry.rest, line.n);
        i += 1;
      }
    }
    return obj;
  };

  const parseSequence = (indent: number): JsonValue => {
    const arr: JsonValue[] = [];
    for (;;) {
      const line = peek();
      if (!line || line.indent < indent) break;
      if (line.content === '---' || line.content === '...') break;
      if (line.indent > indent) {
        throw new YamlError(`Unexpected indentation on line ${line.n} inside a sequence.`);
      }
      if (line.content !== '-' && !line.content.startsWith('- ')) break;

      const rest = line.content.slice(1).trim();
      if (rest === '') {
        i += 1;
        arr.push(parseChildOrNull(indent));
      } else if (isBlockScalarHeader(rest)) {
        arr.push(readBlockScalar(rest, indent));
      } else if (rest === '-' || rest.startsWith('- ') || splitYamlEntry(rest) !== null) {
        arr.push(parseBlock(reindentAfterDash(indent)));
      } else {
        arr.push(parseYamlScalarOrFlow(rest, line.n));
        i += 1;
      }
    }
    return arr;
  };

  try {
    const first = peek();
    if (!first) return fail('YAML input has no content (only blank lines or comments).');
    if (first.content === '---') i += 1;

    const start = peek();
    const value = start ? parseBlock(start.indent) : null;

    const after = peek();
    if (after) {
      if (after.content === '---') {
        return fail(
          `Multi-document YAML streams are not supported (second document starts on line ${after.n}). Convert one document at a time.`,
        );
      }
      if (after.content !== '...') {
        return fail(`Unexpected content on line ${after.n}: "${after.content}".`);
      }
      i += 1;
      const tail = peek();
      if (tail) {
        return fail(
          `Multi-document YAML streams are not supported (more content after "..." on line ${tail.n}).`,
        );
      }
    }

    return succeed(value, options);
  } catch (err) {
    if (err instanceof YamlError) return fail(err.message);
    return fail(`Could not parse YAML: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/* ------------------------------------------------------------------ *
 * XML → JSON
 * ------------------------------------------------------------------ */

export interface XmlToJsonOptions extends ReverseConvertOptions {
  /** Prefix for attribute keys. Defaults to `@`. */
  attributePrefix?: string;
  /** Key holding an element's text when it also carries attributes or children. Defaults to `#text`. */
  textKey?: string;
}

/**
 * XML → JSON using the browser's own `DOMParser`, so there is no XML
 * dependency to ship and the parse is exactly the one the browser performs.
 *
 * Mapping conventions (all documented on the page copy too):
 * - the root element becomes the single top-level key;
 * - attributes become `@name` keys;
 * - an element with only text and no attributes becomes that string;
 * - an empty element (`<a/>`) becomes `null`;
 * - text alongside attributes or children lands under `#text`;
 * - repeated sibling elements with the same tag collapse into an array;
 * - comments, processing instructions and whitespace-only text are dropped,
 *   CDATA is treated as text, and namespace prefixes are kept verbatim
 *   (`ns:tag`, `@xmlns:ns`).
 */
export function xmlToJson(text: string, options: XmlToJsonOptions = {}): ReverseConvertResult {
  if (text.trim() === '') return fail('XML input is empty.');
  if (typeof DOMParser === 'undefined') {
    return fail('XML parsing needs a browser environment (DOMParser is unavailable here).');
  }

  const attributePrefix = options.attributePrefix ?? '@';
  const textKey = options.textKey ?? '#text';

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, 'application/xml');
  } catch (err) {
    return fail(`Could not parse XML: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Browsers report XML errors by returning a document containing a
  // <parsererror> element rather than by throwing.
  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    const detail = (parserError.textContent ?? '').replace(/\s+/g, ' ').trim();
    return fail(detail === '' ? 'Invalid XML.' : `Invalid XML: ${detail}`);
  }

  const root = doc.documentElement;
  if (!root) return fail('XML input has no root element.');

  const elementToJson = (el: Element): JsonValue => {
    const obj: Record<string, JsonValue> = {};

    for (let a = 0; a < el.attributes.length; a += 1) {
      const attr = el.attributes[a]!;
      obj[`${attributePrefix}${attr.name}`] = attr.value;
    }

    // Direct text and CDATA children only; descendant text belongs to its own element.
    let ownText = '';
    const children: Element[] = [];
    for (let c = 0; c < el.childNodes.length; c += 1) {
      const node = el.childNodes[c]!;
      if (node.nodeType === 1) {
        children.push(node as Element);
      } else if (node.nodeType === 3 || node.nodeType === 4) {
        ownText += node.nodeValue ?? '';
      }
    }
    const trimmedText = ownText.trim();

    if (children.length === 0 && el.attributes.length === 0) {
      return trimmedText === '' ? null : trimmedText;
    }

    // Group by tag name so repeated siblings become an array. Non-adjacent
    // repeats are merged into the same array, which loses their interleaved
    // order — the usual trade-off for object-shaped output.
    for (const child of children) {
      const key = child.nodeName;
      const value = elementToJson(child);
      const existing = obj[key];
      if (existing === undefined) {
        obj[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        obj[key] = [existing, value];
      }
    }

    if (trimmedText !== '') obj[textKey] = trimmedText;
    return obj;
  };

  return succeed({ [root.nodeName]: elementToJson(root) }, options);
}
