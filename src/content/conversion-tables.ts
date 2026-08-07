/**
 * Per-tool type/construct mapping tables — comparative, tabular reference data
 * rendered by ToolPageLayout.astro after the worked example. Where the diagram
 * shows one example, the table gives the complete mapping, which is both a
 * strong structural signal (tables for comparative data) and highly citable.
 *
 * Rows are accurate to what each tool produces (verified against the codegen /
 * converter unit tests). Keyed by the page's bare slug.
 */
export interface MappingTable {
  caption: string;
  headers: [string, string];
  rows: Array<[string, string]>;
}

export const CONVERSION_TABLES: Record<string, MappingTable> = {
  'json-to-typescript': {
    caption: 'How JSON values map to TypeScript types',
    headers: ['JSON value', 'TypeScript type'],
    rows: [
      ['string', 'string'],
      ['number', 'number'],
      ['true / false', 'boolean'],
      ['null', 'null'],
      ['array', 'T[] (typed array)'],
      ['object', 'a named interface'],
      ['key absent in some records', 'optional (field?)'],
    ],
  },
  'json-to-python': {
    caption: 'How JSON values map to Python types',
    headers: ['JSON value', 'Python type'],
    rows: [
      ['string', 'str'],
      ['integer', 'int'],
      ['fractional number', 'float'],
      ['true / false', 'bool'],
      ['null', 'Any'],
      ['array', 'list[T]'],
      ['object', 'a @dataclass'],
      ['key absent in some records', 'Optional[T]'],
    ],
  },
  'json-to-java': {
    caption: 'How JSON values map to Java types',
    headers: ['JSON value', 'Java type'],
    rows: [
      ['string', 'String'],
      ['integer', 'int (long if too large)'],
      ['fractional number', 'double'],
      ['true / false', 'boolean'],
      ['null', 'Object'],
      ['array', 'List<T>'],
      ['object', 'a static nested class'],
      ['key not a valid identifier', 'camelCase field + @JsonProperty'],
    ],
  },
  'json-to-go': {
    caption: 'How JSON values map to Go types',
    headers: ['JSON value', 'Go type'],
    rows: [
      ['string', 'string'],
      ['integer', 'int64'],
      ['fractional number', 'float64'],
      ['true / false', 'bool'],
      ['array', '[]T (slice)'],
      ['object', 'a named struct'],
      ['optional / null field', '*T with omitempty / any'],
      ['every field', 'carries a `json:"key"` tag'],
    ],
  },
  'json-to-json-schema': {
    caption: 'How JSON values map to a Draft-07 schema',
    headers: ['JSON value', 'Schema fragment'],
    rows: [
      ['string', '{ "type": "string" }'],
      ['integer', '{ "type": "integer" }'],
      ['fractional number', '{ "type": "number" }'],
      ['true / false', '{ "type": "boolean" }'],
      ['null', '{ "type": "null" }'],
      ['array', '{ "type": "array", "items": … }'],
      ['object', '{ "type": "object", "properties": … }'],
    ],
  },
  'json-to-yaml': {
    caption: 'How JSON constructs map to YAML',
    headers: ['JSON', 'YAML'],
    rows: [
      ['object', 'indented key: value pairs'],
      ['array', 'dash-prefixed list (- item)'],
      ['string', 'scalar (quoted only when needed)'],
      ['number', 'number (unquoted)'],
      ['true / false', 'true / false'],
      ['null', 'null'],
    ],
  },
  'json-to-xml': {
    caption: 'How JSON constructs map to XML',
    headers: ['JSON', 'XML'],
    rows: [
      ['object', 'nested elements'],
      ['key', 'element name (<key>)'],
      ['array', 'the element repeated'],
      ['string / number / boolean', 'element text'],
      ['whole document', 'wrapped in one root element'],
      ['(prolog)', '<?xml version="1.0"?> declaration'],
    ],
  },
  'json-to-csv': {
    caption: 'How JSON maps to CSV',
    headers: ['JSON', 'CSV'],
    rows: [
      ['array of objects', 'one row per object'],
      ['object keys', 'the header row'],
      ['string with comma or quote', 'quoted and escaped'],
      ['number / boolean', 'written as-is'],
      ['the whole array', 'one flat table'],
    ],
  },
  'yaml-to-json': {
    caption: 'How YAML constructs map to JSON',
    headers: ['YAML', 'JSON'],
    rows: [
      ['indented key: value', 'object'],
      ['dash list (- item)', 'array'],
      ['number', 'number'],
      ['true / false', 'boolean'],
      ['unquoted text', 'string'],
      ['null / ~', 'null'],
    ],
  },
  'xml-to-json': {
    caption: 'How XML maps to JSON',
    headers: ['XML', 'JSON'],
    rows: [
      ['element', 'key'],
      ['nested elements', 'nested object'],
      ['repeated element', 'array'],
      ['attribute', '"@name" key'],
      ['element text', 'the value'],
    ],
  },
  'csv-to-json': {
    caption: 'How CSV maps to JSON',
    headers: ['CSV', 'JSON'],
    rows: [
      ['header row', 'object keys'],
      ['each data row', 'one object'],
      ['numeric cell', 'number'],
      ['true / false', 'boolean'],
      ['empty cell', 'null'],
      ['quoted field', 'string (commas/newlines kept)'],
    ],
  },
};
