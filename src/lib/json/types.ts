export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonError {
  line: number;
  column: number;
  offset: number;
  length: number;
  message: string;
  suggestion?: string;
  token?: string;
}

export interface JsonStats {
  keys: number;
  objects: number;
  arrays: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  depth: number;
  characters: number;
  lines: number;
  bytes: number;
  estimatedMemoryBytes: number;
}

export type IndentOption = 2 | 3 | 4 | '\t';

/**
 * Which JSON specification to validate against.
 * - RFC8259: current standard (default).
 * - RFC7159: 2014 revision; any value allowed at the top level.
 * - RFC4627: original 2006 spec; top-level MUST be object or array.
 * - ECMA404: permissive syntax spec, no interoperability constraints.
 * - SKIP:    lenient parse — allow trailing commas and comments.
 */
export type JsonSpec = 'RFC8259' | 'RFC7159' | 'RFC4627' | 'ECMA404' | 'SKIP';

export const JSON_SPEC_LABELS: Record<JsonSpec, string> = {
  RFC8259: 'RFC 8259',
  RFC7159: 'RFC 7159',
  RFC4627: 'RFC 4627',
  ECMA404: 'ECMA-404',
  SKIP: 'Skip Validation',
};

export interface FormatOptions {
  indent: IndentOption;
  spec: JsonSpec;
  sortKeys: boolean;
  stripNull: boolean;
  stripEmpty: boolean;
  decodeUnicode: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: 2,
  spec: 'RFC8259',
  sortKeys: false,
  stripNull: false,
  stripEmpty: false,
  decodeUnicode: false,
};

export interface ParseSuccess {
  ok: true;
  value: JsonValue;
}
export interface ParseFailure {
  ok: false;
  error: JsonError;
}
export type ParseResult = ParseSuccess | ParseFailure;
