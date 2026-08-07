# JSON Formatter Pro

A fast, private, client-side JSON formatter, validator, and beautifier.

**Live site: [www.formatjson.in](https://www.formatjson.in)**

Format, validate, beautify and minify JSON; explore it as a collapsible tree; convert
two-way between JSON and YAML, XML and CSV; generate types for TypeScript, Go, Java and
Python; and decode JWTs. Everything runs in your browser — no JSON is ever uploaded.

## Stack

- **Astro 5** (static output, islands architecture)
- **React 18** for the formatter island
- **CodeMirror 6** for the editor (JSON language + tolerant diagnostics)
- **jsonc-parser** for RFC 8259 parsing with precise offsets
- **Zustand** for state (with size-capped localStorage persistence)
- **Web Worker** for parse / format / minify / transforms / stats
- **Tailwind CSS 3** with CSS-variable theming (light + dark)
- **@tanstack/react-virtual** for the tree view

## Getting started

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview
```

Requires Node **>= 20**.

## Deploy — Cloudflare Pages

1. Create a Pages project connected to the repository.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Set `PUBLIC_SITE_URL` in Pages env vars to the production URL.
5. `public/_headers` and `public/_redirects` are picked up automatically.

The site is fully static; no server functions are required.

## Architecture

```
src/
├── pages/          # Astro pages (SSG): /, /about, /faq, /privacy, /404
├── layouts/        # BaseLayout.astro
├── components/
│   ├── seo/        # Meta + StructuredData (JSON-LD)
│   ├── site/       # Header, Footer, ThemeToggle
│   └── formatter/  # React island: FormatterApp, editor, output views
├── store/          # Zustand store + persisted subset
├── hooks/          # useWorker, useDebouncedEffect, useHotkeys, useTheme
├── workers/        # Web Worker + typed protocol
├── lib/
│   ├── json/       # parser, formatter, stats, transforms, suggestions, types
│   ├── clipboard.ts
│   ├── download.ts
│   ├── upload.ts
│   ├── shortcuts.ts
│   └── format-bytes.ts
├── styles/         # tokens.css, global.css
└── content/        # faq.json, copy.ts
```

## Security

- Strict CSP declared in `public/_headers`; no third-party origins are needed at runtime.
- No user JSON is ever transmitted — the app is 100% client-side.
- File uploads are size-limited (50 MB hard cap, 5 MB soft-warn) and MIME/ext gated.

## Accessibility

- WCAG 2.2 AA target
- Full keyboard operation, visible focus rings, ARIA landmarks and live regions
- Reduced-motion friendly
- Skip-to-editor link

## Scripts

| Script            | Purpose                              |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Astro dev server                     |
| `npm run build`   | Type-check + static build            |
| `npm run preview` | Preview the production build         |
| `npm test`        | Unit tests (Vitest)                  |
| `npm run test:e2e`| Playwright e2e tests                 |
| `npm run lint`    | ESLint                               |
| `npm run format`  | Prettier                             |
