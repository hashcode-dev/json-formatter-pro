import type { APIRoute } from 'astro';
import { SITE_URL, ORG_NAME } from '@lib/site';

/**
 * /llms.txt — a curated, plain-text map of the site for AI assistants.
 *
 * Note on weight: Google Search (including its AI features) **ignores** llms.txt
 * per Google's AI-optimization guidance, so this is not a Google ranking lever.
 * It is a low-cost, harmless aid for non-Google AI tools that do read it. Kept
 * deliberately short and link-first, matching the llms.txt convention.
 */
const getLlmsTxt = (siteUrl: string): string => {
  const u = (p: string) => `${siteUrl}${p}`;
  return `# JSON Formatter Pro
> Fast, private, 100% client-side JSON tools: format, validate, minify, view, and convert JSON. All processing runs in the browser — nothing you paste is uploaded to a server. Free, no signup, works offline after first load.

## Core JSON tools
- [JSON Formatter](${u('/json-formatter/')}): Beautify and pretty-print JSON with syntax highlighting and inline error detection.
- [JSON Validator](${u('/json-validator/')}): Validate JSON and pinpoint syntax errors with line and column numbers.
- [JSON Minifier](${u('/json-minifier/')}): Compact JSON by stripping whitespace to shrink payload size.
- [JSON Viewer](${u('/json-viewer/')}): Explore large JSON as a collapsible, searchable tree.

## Convert from JSON
- [JSON to YAML](${u('/json-to-yaml/')}): Convert JSON to YAML.
- [JSON to XML](${u('/json-to-xml/')}): Convert JSON to XML.
- [JSON to CSV](${u('/json-to-csv/')}): Flatten JSON arrays into CSV.
- [JSON to TypeScript](${u('/json-to-typescript/')}): Generate TypeScript interfaces from JSON.
- [JSON to Python](${u('/json-to-python/')}): Generate Python @dataclass models from JSON.
- [JSON to Java](${u('/json-to-java/')}): Generate Java classes from JSON.
- [JSON to Go](${u('/json-to-go/')}): Generate Go structs from JSON.
- [JSON to JSON Schema](${u('/json-to-json-schema/')}): Infer a JSON Schema (draft) from a JSON sample.

## Convert to JSON
- [YAML to JSON](${u('/yaml-to-json/')}): Convert YAML to JSON.
- [XML to JSON](${u('/xml-to-json/')}): Convert XML to JSON.
- [CSV to JSON](${u('/csv-to-json/')}): Convert CSV to JSON.

## Other tools
- [JWT Decoder](${u('/jwt-decoder/')}): Decode and inspect JSON Web Tokens locally — header, payload, and claims with human-readable timestamps. Inspection only; signatures are not verified.

## About & reference
- [JSON Formatter alternatives — honest comparison](${u('/json-formatter-alternatives/')}): How this suite compares to jsonformatter.org, jsoneditoronline.org, codebeautify.org, and jam.dev, including where each is the better pick.
- [About](${u('/about/')}): What the suite is and its privacy-first, client-side design.
- [FAQ](${u('/faq/')}): Common questions about the tools and data handling.

## Key facts
- All parsing, formatting, and conversion happen client-side in the browser; JSON is never sent to a server.
- Free to use, no account required, works offline after the first visit.
- Open source: https://github.com/hashcode-dev/json-formatter-pro
- Publisher: ${ORG_NAME}.
`;
};

export const GET: APIRoute = ({ site }) => {
  const siteUrl = (site?.href ?? SITE_URL).replace(/\/$/, '');

  return new Response(getLlmsTxt(siteUrl), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
