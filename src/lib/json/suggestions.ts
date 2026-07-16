// Numeric mirror of jsonc-parser's ParseErrorCode enum. Duplicated here as a
// plain const object because jsonc-parser exports it as a `const enum`, which
// cannot be imported under TypeScript's `isolatedModules` setting.
export const ErrorCode = {
  InvalidSymbol: 1,
  InvalidNumberFormat: 2,
  PropertyNameExpected: 3,
  ValueExpected: 4,
  ColonExpected: 5,
  CommaExpected: 6,
  CloseBraceExpected: 7,
  CloseBracketExpected: 8,
  EndOfFileExpected: 9,
  InvalidCommentToken: 10,
  UnexpectedEndOfComment: 11,
  UnexpectedEndOfString: 12,
  UnexpectedEndOfNumber: 13,
  InvalidUnicode: 14,
  InvalidEscapeCharacter: 15,
  InvalidCharacter: 16,
} as const;

const CODE_MESSAGES: Record<number, string> = {
  [ErrorCode.InvalidSymbol]: 'Invalid symbol',
  [ErrorCode.InvalidNumberFormat]: 'Invalid number format',
  [ErrorCode.PropertyNameExpected]: 'Property name expected',
  [ErrorCode.ValueExpected]: 'Value expected',
  [ErrorCode.ColonExpected]: 'Colon (":") expected',
  [ErrorCode.CommaExpected]: 'Comma (",") expected',
  [ErrorCode.CloseBraceExpected]: 'Closing brace ("}") expected',
  [ErrorCode.CloseBracketExpected]: 'Closing bracket ("]") expected',
  [ErrorCode.EndOfFileExpected]: 'End of file expected',
  [ErrorCode.InvalidCommentToken]: 'Comments are not permitted in strict JSON',
  [ErrorCode.UnexpectedEndOfComment]: 'Unexpected end of comment',
  [ErrorCode.UnexpectedEndOfString]: 'Unterminated string',
  [ErrorCode.UnexpectedEndOfNumber]: 'Unexpected end of number',
  [ErrorCode.InvalidUnicode]: 'Invalid unicode escape',
  [ErrorCode.InvalidEscapeCharacter]: 'Invalid escape character',
  [ErrorCode.InvalidCharacter]: 'Invalid character',
};

export function messageForCode(code: number): string {
  return CODE_MESSAGES[code] ?? 'Syntax error';
}

/**
 * Cheap heuristics on the raw source near the error offset.
 * Returns a human-actionable suggestion when a common mistake is detected.
 */
export function suggestFix(raw: string, code: number, offset: number): string | undefined {
  const context = raw.slice(Math.max(0, offset - 32), offset + 32);
  const before = raw.slice(Math.max(0, offset - 8), offset);
  const after = raw.slice(offset, offset + 8);

  if (code === ErrorCode.PropertyNameExpected) {
    if (/,\s*[}\]]/.test(context)) return 'Remove the trailing comma before the closing brace/bracket.';
    if (/'[^']*'\s*:/.test(context)) return 'JSON requires double quotes around property names.';
    if (/[A-Za-z_$][\w$]*\s*:/.test(context)) return 'Wrap the property name in double quotes.';
  }
  if (code === ErrorCode.ValueExpected) {
    if (/,\s*[}\]]/.test(context)) return 'Remove the trailing comma.';
    if (/'/.test(context)) return 'JSON requires double quotes for strings, not single quotes.';
    if (/\bundefined\b/.test(context)) return '"undefined" is not valid JSON — use null instead.';
    if (/\bNaN\b|\bInfinity\b/.test(context)) return 'NaN and Infinity are not valid JSON numbers.';
  }
  if (code === ErrorCode.CommaExpected) {
    return 'A comma is missing between two values or properties.';
  }
  if (code === ErrorCode.ColonExpected) {
    return 'Insert a ":" between the property name and its value.';
  }
  if (code === ErrorCode.CloseBraceExpected) {
    return 'Add a closing "}" to match the opening brace.';
  }
  if (code === ErrorCode.CloseBracketExpected) {
    return 'Add a closing "]" to match the opening bracket.';
  }
  if (code === ErrorCode.UnexpectedEndOfString) {
    return 'The string is not terminated — add a closing double quote.';
  }
  if (code === ErrorCode.InvalidEscapeCharacter) {
    return 'Only \\", \\\\, \\/, \\b, \\f, \\n, \\r, \\t, and \\uXXXX are valid escapes.';
  }
  if (code === ErrorCode.InvalidCommentToken) {
    return 'Strip // or /* */ comments — strict JSON does not allow them.';
  }
  if (code === ErrorCode.InvalidNumberFormat) {
    if (/\.\D|\D\./.test(before + after)) return 'Numbers cannot start or end with a decimal point.';
    return 'Numbers must match RFC 8259 (no leading zeros, no + sign).';
  }
  return undefined;
}
