import { parseTree, printParseErrorCode } from 'jsonc-parser';
import type { ParseError, Node } from 'jsonc-parser';
import type { JsonError, JsonSpec, JsonValue, ParseResult } from './types';
import { messageForCode, suggestFix } from './suggestions';

function offsetToLineColumn(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(offset, source.length);
  for (let i = 0; i < end; i++) {
    const ch = source.charCodeAt(i);
    if (ch === 10 /* \n */) {
      line++;
      column = 1;
    } else if (ch === 13 /* \r */) {
      // Handle CRLF as a single logical break; CR alone still counts.
      if (source.charCodeAt(i + 1) === 10) i++;
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function nodeToValue(node: Node | undefined): JsonValue {
  if (!node) return null;
  switch (node.type) {
    case 'object': {
      const out: Record<string, JsonValue> = {};
      for (const prop of node.children ?? []) {
        const [keyNode, valueNode] = prop.children ?? [];
        if (!keyNode || typeof keyNode.value !== 'string') continue;
        out[keyNode.value] = nodeToValue(valueNode);
      }
      return out;
    }
    case 'array':
      return (node.children ?? []).map(nodeToValue);
    case 'string':
    case 'number':
    case 'boolean':
      return node.value as JsonValue;
    case 'null':
      return null;
    default:
      return null;
  }
}

function toJsonError(source: string, err: ParseError): JsonError {
  const { line, column } = offsetToLineColumn(source, err.offset);
  return {
    line,
    column,
    offset: err.offset,
    length: Math.max(1, err.length),
    message: messageForCode(err.error),
    suggestion: suggestFix(source, err.error, err.offset),
    token: printParseErrorCode(err.error),
  };
}

export function parse(raw: string, spec: JsonSpec = 'RFC8259'): ParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: {
        line: 1,
        column: 1,
        offset: 0,
        length: 0,
        message: 'Empty input',
        suggestion: 'Paste, type, or upload some JSON to get started.',
      },
    };
  }
  const lenient = spec === 'SKIP';
  const errors: ParseError[] = [];
  const tree = parseTree(raw, errors, {
    allowTrailingComma: lenient,
    disallowComments: !lenient,
    allowEmptyContent: false,
  });
  if (errors.length > 0 || !tree) {
    const first = errors[0];
    if (first) return { ok: false, error: toJsonError(raw, first) };
    return {
      ok: false,
      error: {
        line: 1,
        column: 1,
        offset: 0,
        length: raw.length,
        message: 'Unable to parse JSON',
      },
    };
  }
  // RFC 4627 forbids top-level primitives — only object or array are allowed.
  if (spec === 'RFC4627' && tree.type !== 'object' && tree.type !== 'array') {
    const { line, column } = offsetToLineColumn(raw, tree.offset);
    return {
      ok: false,
      error: {
        line,
        column,
        offset: tree.offset,
        length: tree.length,
        message: 'RFC 4627 requires the top-level value to be an object or array.',
        suggestion: 'Wrap the value, or switch to RFC 7159 / RFC 8259 / ECMA-404.',
      },
    };
  }
  return { ok: true, value: nodeToValue(tree) };
}
