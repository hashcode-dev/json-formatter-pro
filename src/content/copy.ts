export const HERO = {
  eyebrow: 'RFC 8259 · Client-side · Free JSON Tools',
  title: 'Format, Validate, Beautify & Minify JSON Online',
  subtitle:
    'The best free JSON formatter and validator for developers. Format JSON, validate syntax, beautify, minify, debug, and view JSON tree. Paste, upload, or drop a file. Everything runs in your browser — no data leaves your device.',
};

export const FEATURES: Array<{ title: string; body: string }> = [
  {
    title: 'JSON Beautifier & Minifier',
    body: 'Pretty-print and beautify JSON with 2/4/tab indentation, or minify JSON to the smallest valid representation.',
  },
  {
    title: 'JSON Validator & Syntax Checker',
    body: 'Validate JSON with precise line and column errors. Lint JSON and get actionable suggestions for trailing commas, unquoted keys, and RFC 8259 compliance.',
  },
  {
    title: 'JSON Tree View & Explorer',
    body: 'Virtualized JSON tree viewer with expand/collapse, path breadcrumbs, and fast key/value search. Navigate and explore complex JSON structures.',
  },
  {
    title: 'JSON Diff Viewer',
    body: 'Side-by-side comparison and diff view of your original and formatted JSON output for effortless review.',
  },
  {
    title: 'Detailed JSON Statistics',
    body: 'JSON parser statistics: keys, objects, arrays, depth, characters, lines, file size, and estimated memory footprint.',
  },
  {
    title: 'JSON Editor & Keyboard Navigation',
    body: 'Full-featured JSON editor with command palette, discoverable shortcuts, keyboard-first operation, and full keyboard navigation from paste to copy.',
  },
];

export const WHY: Array<{ title: string; body: string }> = [
  { title: 'Private & Secure', body: 'No backend server for your JSON data. Zero telemetry, no data collection, no third-party scripts. Your JSON never leaves your device.' },
  { title: 'Lightning Fast', body: 'JSON parsing runs off the main thread in a Web Worker. Tree view is virtualized for instant loading of large JSON files.' },
  { title: 'Accessible & Inclusive', body: 'WCAG 2.2 AA compliant JSON tool. Keyboard-first, reduced-motion friendly, full accessibility support for all users.' },
  { title: 'Works Offline', body: 'Free JSON formatter that works offline after the first load. No CDNs, no fonts fetched at runtime, fully self-contained.' },
];
