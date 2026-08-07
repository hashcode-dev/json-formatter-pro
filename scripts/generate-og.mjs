/**
 * Post-build: generate a branded 1200×630 Open Graph image for every page.
 *
 * Reads each built HTML file's <h1> (falling back to og:title, then the site
 * name), renders an on-brand SVG card, and rasterizes it to PNG with sharp
 * (already a dependency — no new install). Output: dist/og/<slug>.png, matched
 * by Meta.astro's per-page `og:image`. Runs after `astro build`.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const OUT_DIR = path.join(DIST, 'og');

// Brand palette (dark theme tokens from src/styles/tokens.css).
const BG = '#0e1117';
const FG = '#eaeef6';
const ACCENT = '#60a5fa';
const SUBTLE = '#8d96a8';

const escapeXml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—');

/** Greedy word-wrap into lines of at most `maxChars` characters. */
function wrap(text, maxChars, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[.,;:]$/, '') + '…';
    return kept;
  }
  return lines;
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

function slugFor(relPath) {
  if (relPath === 'index.html') return 'home';
  if (relPath.endsWith('/index.html')) return relPath.slice(0, -'/index.html'.length).replace(/\//g, '-');
  return relPath.replace(/\.html$/, '').replace(/\//g, '-');
}

function titleFrom(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let raw = h1 ? h1[1] : '';
  if (!raw) {
    const og = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
    raw = og ? og[1].split(/\s+[-|·]\s+/)[0] : 'JSON Formatter Pro';
  }
  return decodeEntities(raw.replace(/<[^>]+>/g, '')).trim() || 'JSON Formatter Pro';
}

function buildSvg(title) {
  const lines = wrap(title, 22, 3);
  const fontSize = 66;
  const lineH = 82;
  const startY = 300 - ((lines.length - 1) * lineH) / 2;
  const titleTspans = lines
    .map((l, i) => `<text x="80" y="${startY + i * lineH}" class="t">${escapeXml(l)}</text>`)
    .join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <style>
    .t { font-family: sans-serif; font-weight: 700; font-size: ${fontSize}px; fill: ${FG}; }
    .kicker { font-family: sans-serif; font-weight: 700; font-size: 30px; letter-spacing: 3px; fill: ${ACCENT}; }
    .tag { font-family: monospace; font-size: 30px; fill: ${SUBTLE}; }
    .brace { font-family: monospace; font-weight: 700; font-size: 320px; fill: ${ACCENT}; opacity: 0.06; }
  </style>
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="0" width="14" height="630" fill="${ACCENT}"/>
  <text x="980" y="470" class="brace" text-anchor="middle">{ }</text>
  <text x="80" y="112" class="kicker">JSON FORMATTER PRO</text>
  ${titleTspans}
  <text x="80" y="556" class="tag">formatjson.in · Free · 100% client-side · no uploads</text>
</svg>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let count = 0;
  for await (const file of walk(DIST)) {
    const rel = path.relative(DIST, file);
    if (rel.startsWith('og' + path.sep)) continue;
    const slug = slugFor(rel);
    const html = await fs.readFile(file, 'utf8');
    const svg = buildSvg(titleFrom(html));
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, `${slug}.png`));
    count++;
  }
  console.log(`[generate-og] Wrote ${count} Open Graph image(s) to dist/og/`);
}

main().catch((err) => {
  console.error('[generate-og] failed:', err);
  process.exit(1);
});
