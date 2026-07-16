import type { IndentOption, JsonValue } from './types';

function indentString(indent: IndentOption): string {
  if (indent === '\t') return '\t';
  return ' '.repeat(indent);
}

export function stringify(value: JsonValue, indent: IndentOption): string {
  const spacer = indentString(indent);
  return JSON.stringify(value, null, spacer);
}

export function minify(value: JsonValue): string {
  return JSON.stringify(value);
}

/**
 * Decode `\uXXXX` sequences inside string literals of a serialized JSON string,
 * without touching characters inside numeric/keyword tokens. Assumes input is
 * already valid JSON produced by JSON.stringify.
 */
export function decodeUnicodeEscapes(json: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]!;
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === '\\') {
      const next = json[i + 1];
      if (next === 'u') {
        const hex = json.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          const code = parseInt(hex, 16);
          // Preserve escaping for control characters and quote/backslash to keep validity.
          if (code >= 0x20 && code !== 0x22 && code !== 0x5c && code < 0xd800) {
            out += String.fromCharCode(code);
            i += 5;
            continue;
          }
        }
      }
      out += ch;
      if (next !== undefined) {
        out += next;
        i++;
      }
      continue;
    }
    if (ch === '"') inString = false;
    out += ch;
  }
  return out;
}
