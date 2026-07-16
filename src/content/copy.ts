export const HERO = {
  eyebrow: 'RFC 8259 · Client-side · Free',
  title: 'Format, Validate, and Beautify JSON — Instantly',
  subtitle:
    'A fast, private JSON tool for developers. Paste, upload, or drop a file. Everything runs in your browser — no data leaves your device.',
};

export const FEATURES: Array<{ title: string; body: string }> = [
  {
    title: 'Beautify & Minify',
    body: 'Pretty-print with 2/4/tab indentation, or minify to the smallest valid representation.',
  },
  {
    title: 'Rich validation',
    body: 'Precise line and column errors with actionable suggestions for trailing commas, unquoted keys, and more.',
  },
  {
    title: 'Tree explorer',
    body: 'Virtualized JSON tree with expand/collapse, path breadcrumbs, and fast key/value search.',
  },
  {
    title: 'Diff view',
    body: 'Side-by-side comparison of your original and formatted output for effortless review.',
  },
  {
    title: 'Detailed stats',
    body: 'Keys, objects, arrays, depth, characters, lines, file size, and estimated memory footprint.',
  },
  {
    title: 'Keyboard-first',
    body: 'Command palette, discoverable shortcuts, and full keyboard operation from paste to copy.',
  },
];

export const WHY: Array<{ title: string; body: string }> = [
  { title: 'Private by construction', body: 'No backend for your JSON. No telemetry. No third-party scripts.' },
  { title: 'Fast', body: 'Parsing runs off the main thread in a Web Worker. Tree view is virtualized.' },
  { title: 'Accessible', body: 'WCAG 2.2 AA, keyboard-first, reduced-motion friendly.' },
  { title: 'Offline-ready', body: 'Works after the first load — no CDNs, no fonts fetched at runtime.' },
];
