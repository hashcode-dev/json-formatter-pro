/**
 * Worked-example data for the per-tool conversion diagrams (see
 * ConversionDiagram.astro, injected by ToolPageLayout.astro).
 *
 * Every input→output pair is drawn from the tool's own asserted unit tests
 * (converters.test.ts / reverse-converters.test.ts / codegen.test.ts), so the
 * diagrams show what the tools genuinely produce — no invented output. Keep
 * lines short (≈32 chars) so they fit the SVG cards on narrow screens.
 *
 * Keyed by the page's bare slug (path with slashes trimmed).
 */
export interface ConversionExample {
  fromLabel: string;
  toLabel: string;
  fromLines: string[];
  toLines: string[];
  caption: string;
  /** Label on the arrow between the two panels. Defaults to "convert". */
  arrowLabel?: string;
}

export const CONVERSION_EXAMPLES: Record<string, ConversionExample> = {
  'json-editor': {
    fromLabel: 'Editing — invalid',
    toLabel: 'Validated & fixed',
    fromLines: ['{', '  "name": "api",', '  "port": 8080,', '  "tags": ["web",],', '}'],
    toLines: ['{', '  "name": "api",', '  "port": 8080,', '  "tags": ["web"]', '}'],
    caption:
      'Type or paste JSON and the editor flags errors — like these trailing commas — inline as you go, then reformats the moment it is valid.',
    arrowLabel: 'validate',
  },
  'json-formatter': {
    fromLabel: 'JSON (minified)',
    toLabel: 'Formatted',
    fromLines: ['{"id":1,"name":"Alice",', '"roles":["admin","dev"]}'],
    toLines: ['{', '  "id": 1,', '  "name": "Alice",', '  "roles": ["admin", "dev"]', '}'],
    caption:
      'Paste minified or messy JSON and get clean, consistently indented output with syntax highlighting — nothing leaves your browser.',
  },
  'json-minifier': {
    fromLabel: 'Formatted JSON',
    toLabel: 'Minified',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice"', '}'],
    toLines: ['{"id":1,"name":"Alice"}'],
    caption:
      'Strips every non-essential byte of whitespace to shrink a JSON payload for storage or transport.',
  },
  'json-validator': {
    fromLabel: 'JSON (invalid)',
    toLabel: 'Result',
    fromLines: ['{', '  "id": 1,', '  "name":', '}'],
    toLines: ['✗ Invalid JSON', '', 'Line 3: a value is', 'expected after "name":'],
    caption:
      'Validates the document and pinpoints the first syntax error with its location, so you can fix it fast (example error shown).',
  },
  'json-viewer': {
    fromLabel: 'JSON',
    toLabel: 'Tree view',
    fromLines: ['{"id":1,', ' "roles":["admin","dev"]}'],
    toLines: ['▾ {} root', '    id: 1', '  ▾ [] roles', '      0: "admin"', '      1: "dev"'],
    caption:
      'Explore large or deeply nested JSON as a collapsible, searchable tree instead of scrolling raw text.',
  },
  'json-to-yaml': {
    fromLabel: 'JSON',
    toLabel: 'YAML',
    fromLines: ['{', '  "name": "api",', '  "port": 8080,', '  "tags": ["web", "prod"]', '}'],
    toLines: ['name: api', 'port: 8080', 'tags:', '  - web', '  - prod'],
    caption:
      'Arrays become dash lists and nested objects become indented keys — ready for Kubernetes, Docker Compose, or CI configs.',
  },
  'json-to-xml': {
    fromLabel: 'JSON',
    toLabel: 'XML',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice"', '}'],
    toLines: ['<?xml version="1.0"?>', '<root>', '  <id>1</id>', '  <name>Alice</name>', '</root>'],
    caption:
      'Each key becomes an element and the document is wrapped in a single root element, with a standard XML declaration.',
  },
  'json-to-csv': {
    fromLabel: 'JSON',
    toLabel: 'CSV',
    fromLines: ['[', '  {"id": 1, "name": "Alice"},', '  {"id": 2, "name": "Bob"}', ']'],
    toLines: ['id,name', '1,Alice', '2,Bob'],
    caption:
      'An array of objects becomes a header row plus one line per record — open it straight in Excel or Google Sheets.',
  },
  'json-to-typescript': {
    fromLabel: 'JSON',
    toLabel: 'TypeScript',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice",', '  "active": true', '}'],
    toLines: ['export interface Root {', '  id: number;', '  name: string;', '  active: boolean;', '}'],
    caption:
      'Infers a typed interface from a JSON sample — numbers, strings, booleans, arrays, and one interface per nested object.',
  },
  'json-to-python': {
    fromLabel: 'JSON',
    toLabel: 'Python',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice",', '  "roles": ["admin"]', '}'],
    toLines: ['@dataclass', 'class Root:', '    id: int', '    name: str', '    roles: list[str]'],
    caption:
      'Generates @dataclass models with correct type hints — int vs float, Optional for missing keys, and a class per nested object.',
  },
  'json-to-java': {
    fromLabel: 'JSON',
    toLabel: 'Java',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice",', '  "roles": ["admin"]', '}'],
    toLines: ['public class Root {', '  private int id;', '  private String name;', '  private List<String> roles;', '}'],
    caption:
      'Emits a public class with typed private fields (and Jackson @JsonProperty when a JSON key is not a valid Java identifier).',
  },
  'json-to-go': {
    fromLabel: 'JSON',
    toLabel: 'Go',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice",', '  "roles": ["admin"]', '}'],
    toLines: ['type Root struct {', '  ID    int64    `json:"id"`', '  Name  string   `json:"name"`', '  Roles []string `json:"roles"`', '}'],
    caption:
      'Produces aligned Go structs with a json tag on every field — int64 for integers, []string for arrays, nested types by name.',
  },
  'json-to-json-schema': {
    fromLabel: 'JSON',
    toLabel: 'JSON Schema',
    fromLines: ['{', '  "id": 1,', '  "name": "Alice"', '}'],
    toLines: ['{', '  "$schema": "…/draft-07#",', '  "type": "object",', '  "properties": {', '    "id": {"type":"integer"}', '  }', '}'],
    caption:
      'Infers a Draft-07 JSON Schema — types, properties, and required fields — from one representative sample document.',
  },
  'csv-to-json': {
    fromLabel: 'CSV',
    toLabel: 'JSON',
    fromLines: ['id,name,active', '1,Alice,true'],
    toLines: ['[', '  {', '    "id": 1,', '    "name": "Alice",', '    "active": true', '  }', ']'],
    caption:
      'Parses the header row and infers types — numbers, booleans, and empty cells as null — with full quoted-field handling.',
  },
  'yaml-to-json': {
    fromLabel: 'YAML',
    toLabel: 'JSON',
    fromLines: ['name: api-server', 'replicas: 3', 'debug: false'],
    toLines: ['{', '  "name": "api-server",', '  "replicas": 3,', '  "debug": false', '}'],
    caption:
      'Turns a manifest or CI config back into JSON, preserving numbers, booleans, nesting, and sequences.',
  },
  'xml-to-json': {
    fromLabel: 'XML',
    toLabel: 'JSON',
    fromLines: ['<note id="1" lang="en">', '  <to>Tove</to>', '  <body>Hi</body>', '</note>'],
    toLines: ['{', '  "note": {', '    "@id": "1",', '    "@lang": "en",', '    "to": "Tove",', '    "body": "Hi"', '  }', '}'],
    caption:
      'Elements become keys, attributes are prefixed with @, and text content is inlined — the inverse of JSON to XML.',
  },
  'jwt-decoder': {
    fromLabel: 'JWT',
    toLabel: 'Decoded',
    fromLines: ['eyJhbGciOiJIUzI1NiIs…', '.eyJzdWIiOiIxMjM0…', '.SflKxwRJSMeKKF2QT4…'],
    toLines: ['// header', '{ "alg": "HS256",', '  "typ": "JWT" }', '// payload', '{ "sub": "1234567890",', '  "name": "Alice" }'],
    caption:
      'Splits the token and Base64URL-decodes the header and payload locally. Inspection only — the signature is never verified.',
  },
};
