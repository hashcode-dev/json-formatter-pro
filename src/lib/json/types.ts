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

export type IndentOption = 2 | 4 | '\t';

export interface FormatOptions {
  indent: IndentOption;
  sortKeys: boolean;
  stripNull: boolean;
  stripEmpty: boolean;
  decodeUnicode: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: 2,
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
