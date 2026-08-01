#!/usr/bin/env node
/**
 * Postbuild optimizer for the static `dist/` output produced by `astro build`.
 *
 * This runs against Astro's own generated HTML — the structure is stable and
 * predictable enough that plain string/regex manipulation is safe here, so we
 * intentionally avoid pulling in an HTML parser dependency.
 *
 * It performs two independent transforms on every dist/**\/*.html page:
 *
 *   A. Stylesheet reorder — moves the page's <link rel="stylesheet"> tag(s)
 *      to sit immediately after <meta charset="UTF-8">, ahead of
 *      canonical/favicon/manifest/JSON-LD/GA4/theme-init, so the CSS is
 *      discovered by the browser preload scanner as early as possible.
 *
 *   B. Modulepreload hints — for pages that mount the FormatterApp React
 *      island (client:only="react"), injects <link rel="modulepreload">
 *      tags for the full transitive chunk graph the browser will eventually
 *      need to fetch via dynamic import() when <astro-island> upgrades.
 *      The chunk graph is derived from Vite's build manifest
 *      (dist/.vite/manifest.json, enabled via `vite.build.manifest: true`
 *      in astro.config.mjs) so we never hardcode content hashes.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const MANIFEST_PATH = path.join(DIST_DIR, ".vite", "manifest.json");

function log(msg) {
  console.log(`[postbuild-optimize] ${msg}`);
}
function warn(msg) {
  console.warn(`[postbuild-optimize] WARNING: ${msg}`);
}

/** Recursively list every *.html file under `dir`. */
function findHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Load the Vite build manifest, if present, and build a reverse index from
 * emitted file path (e.g. "_astro/FormatterApp.abc123.js") back to its
 * manifest key, so we can walk the import graph starting from a URL we
 * scraped out of an actual built page.
 */
function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    warn(
      `No Vite manifest found at ${path.relative(ROOT_DIR, MANIFEST_PATH)}. ` +
        `Modulepreload hints will be skipped. Ensure vite.build.manifest is enabled in astro.config.mjs.`,
    );
    return null;
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const fileToKey = new Map();
  for (const [key, entry] of Object.entries(manifest)) {
    if (entry && typeof entry.file === "string") {
      fileToKey.set(entry.file, key);
    }
  }
  return { manifest, fileToKey };
}

/**
 * Given a manifest and a starting key, collect the `file` of that entry plus
 * every transitively-imported chunk's `file`, in first-seen order.
 */
function collectChunkFiles(manifest, startKey, seen = new Set(), out = []) {
  if (seen.has(startKey)) return out;
  seen.add(startKey);
  const entry = manifest[startKey];
  if (!entry) return out;
  if (typeof entry.file === "string" && !out.includes(entry.file)) {
    out.push(entry.file);
  }
  for (const importKey of entry.imports || []) {
    collectChunkFiles(manifest, importKey, seen, out);
  }
  return out;
}

/**
 * Resolve the full set of modulepreload hrefs needed for the FormatterApp
 * island on one page, using the *actual* component-url/renderer-url
 * attributes present in that page's <astro-island> tag as the ground truth
 * starting points (rather than guessing the manifest's entry-key naming,
 * which can vary depending on the exact import specifier used in source).
 */
function resolveFormatterAppPreloads(html, manifestData) {
  const islandMatch = html.match(
    /<astro-island\b[^>]*component-export="FormatterApp"[^>]*>/,
  );
  if (!islandMatch) return [];
  const tag = islandMatch[0];

  const componentUrlMatch = tag.match(/component-url="([^"]+)"/);
  const rendererUrlMatch = tag.match(/renderer-url="([^"]+)"/);
  if (!componentUrlMatch) {
    warn("Found FormatterApp <astro-island> but could not read component-url; skipping preloads for this page.");
    return [];
  }

  const rootUrls = [componentUrlMatch[1], rendererUrlMatch?.[1]].filter(Boolean);

  if (!manifestData) {
    // No manifest available: fall back to preloading just the directly
    // referenced files (no transitive graph), which is still strictly
    // better than nothing.
    return [...new Set(rootUrls)];
  }

  const { manifest, fileToKey } = manifestData;
  const hrefs = new Set();

  for (const url of rootUrls) {
    // Emitted file paths in the manifest never include the leading "/",
    // and (in the default, non-`base`-prefixed case) match the URL as-is
    // once that slash is stripped.
    const bareUrl = url.startsWith("/") ? url.slice(1) : url;
    const key = fileToKey.get(bareUrl);

    if (!key) {
      // Can't find it in the manifest (e.g. differing `base` prefix) —
      // still preload the file we know is directly needed.
      hrefs.add(url);
      continue;
    }

    // Prefix = whatever precedes the manifest's own `file` value in the
    // real URL we scraped from HTML. Computed per-URL so this is correct
    // even under a non-default Astro `base`.
    const entry = manifest[key];
    const prefix = url.slice(0, url.length - entry.file.length);

    for (const file of collectChunkFiles(manifest, key)) {
      hrefs.add(`${prefix}${file}`);
    }
  }

  return [...hrefs];
}

/** Move all <link rel="stylesheet"> tags to right after <meta charset>. */
function reorderStylesheet(html, filePath) {
  const styleLinkRe = /<link[^>]*\brel=["']stylesheet["'][^>]*>/gi;
  const styleLinks = html.match(styleLinkRe);

  if (!styleLinks || styleLinks.length === 0) {
    warn(`No <link rel="stylesheet"> found in ${path.relative(DIST_DIR, filePath)}; skipping reorder.`);
    return html;
  }

  let result = html.replace(styleLinkRe, "");

  const charsetRe = /<meta\s+charset=["']UTF-8["']\s*\/?>/i;
  const charsetMatch = result.match(charsetRe);
  if (!charsetMatch) {
    warn(`No <meta charset="UTF-8"> anchor found in ${path.relative(DIST_DIR, filePath)}; leaving stylesheet in place.`);
    // Put the stylesheet tags back where they were (best-effort) by
    // re-appending before </head> so we don't lose them entirely.
    return html;
  }

  const insertAt = charsetMatch.index + charsetMatch[0].length;
  result = result.slice(0, insertAt) + styleLinks.join("") + result.slice(insertAt);
  return result;
}

/** Inject modulepreload links right after the (now-relocated) stylesheet. */
function injectModulepreloads(html, hrefs) {
  if (hrefs.length === 0) return html;

  const tags = hrefs.map((href) => `<link rel="modulepreload" href="${href}">`).join("");

  const styleLinkRe = /<link[^>]*\brel=["']stylesheet["'][^>]*>/i;
  const match = html.match(styleLinkRe);
  if (match) {
    const insertAt = match.index + match[0].length;
    return html.slice(0, insertAt) + tags + html.slice(insertAt);
  }

  // Fallback: no stylesheet link found (shouldn't happen) — insert right
  // after <meta charset> instead.
  const charsetRe = /<meta\s+charset=["']UTF-8["']\s*\/?>/i;
  const charsetMatch = html.match(charsetRe);
  if (charsetMatch) {
    const insertAt = charsetMatch.index + charsetMatch[0].length;
    return html.slice(0, insertAt) + tags + html.slice(insertAt);
  }

  warn("Could not find an anchor to inject modulepreload tags; skipping.");
  return html;
}

/**
 * Astro's own client-hydration runtime (used for every `client:*` directive)
 * injects a handful of small inline `<script>` bootstrap blocks — the
 * `astro-island` custom-element definition/prop-deserializer, and one tiny
 * dispatcher per hydration strategy actually used on the page (`client:load`,
 * `client:only`, etc.). These are NOT anything authored in this repo's own
 * templates (all 3 of *our* inline scripts were already converted to
 * same-origin external files, covered by CSP's 'self' with zero hash
 * maintenance) — they're generated by the installed Astro version itself,
 * so hashing them here (recomputed on every build, never hardcoded) is the
 * correct, low-maintenance way to keep CSP's script-src strict without
 * 'unsafe-inline' while still allowing Astro's own runtime to execute.
 *
 * `application/ld+json` blocks are excluded: CSP's script-src only governs
 * script elements with an empty type, "module", or "importmap" (i.e.
 * genuinely executable script), not data blocks like JSON-LD — hashing them
 * would be harmless noise, but excluding them keeps the CSP line minimal and
 * correctly scoped to what actually needs it.
 */
function collectInlineScriptHashes(html) {
  const hashes = new Set();
  const scriptRe = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html))) {
    const attrs = match[1];
    const body = match[2];
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    if (!body.trim()) continue;
    const hash = crypto.createHash("sha256").update(body, "utf8").digest("base64");
    hashes.add(`'sha256-${hash}'`);
  }
  return hashes;
}

/**
 * Rewrite dist/_headers' Content-Security-Policy line, inserting the given
 * script hashes into the script-src directive. Leaves every other directive
 * and every other header line completely untouched.
 */
function patchCspHeader(headersPath, scriptHashes) {
  if (!fs.existsSync(headersPath)) {
    warn(`No _headers file found at ${path.relative(ROOT_DIR, headersPath)}; skipping CSP hash injection.`);
    return;
  }
  if (scriptHashes.size === 0) return;

  let content = fs.readFileSync(headersPath, "utf8");
  const cspLineRe = /^(\s*Content-Security-Policy:\s*)(.*)$/m;
  const lineMatch = content.match(cspLineRe);
  if (!lineMatch) {
    warn("No Content-Security-Policy line found in _headers; skipping CSP hash injection.");
    return;
  }

  const [, prefix, policy] = lineMatch;
  const directives = policy.split(";").map((d) => d.trim()).filter(Boolean);
  const hashList = [...scriptHashes].join(" ");

  const newDirectives = directives.map((d) => {
    if (/^script-src\b/.test(d)) {
      return `${d} ${hashList}`;
    }
    return d;
  });

  const newPolicy = newDirectives.join("; ") + (policy.trim().endsWith(";") ? ";" : "");
  content = content.replace(cspLineRe, `${prefix}${newPolicy}`);
  fs.writeFileSync(headersPath, content, "utf8");
  log(`Injected ${scriptHashes.size} inline-script hash(es) into dist/_headers' CSP script-src.`);
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`dist/ directory not found at ${DIST_DIR}. Run \`astro build\` first.`);
  }

  const manifestData = loadManifest();
  const htmlFiles = findHtmlFiles(DIST_DIR);

  let reordered = 0;
  let preloadedPages = 0;
  let totalPreloadTags = 0;
  const scriptHashes = new Set();

  for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, "utf8");
    const before = html;

    html = reorderStylesheet(html, filePath);

    const preloadHrefs = resolveFormatterAppPreloads(html, manifestData);
    if (preloadHrefs.length > 0) {
      html = injectModulepreloads(html, preloadHrefs);
      preloadedPages += 1;
      totalPreloadTags += preloadHrefs.length;
    }

    for (const h of collectInlineScriptHashes(html)) scriptHashes.add(h);

    if (html !== before) {
      fs.writeFileSync(filePath, html, "utf8");
      reordered += 1;
    }
  }

  log(`Processed ${htmlFiles.length} HTML file(s).`);
  log(`Reordered stylesheet link in ${reordered} file(s).`);
  log(`Injected modulepreload hints on ${preloadedPages} page(s) (${totalPreloadTags} tag(s) total).`);

  patchCspHeader(path.join(DIST_DIR, "_headers"), scriptHashes);

  // Clean up the Vite manifest dir — it's only needed by this script, not
  // by the deployed site.
  const viteMetaDir = path.join(DIST_DIR, ".vite");
  if (fs.existsSync(viteMetaDir)) {
    fs.rmSync(viteMetaDir, { recursive: true, force: true });
  }
}

main();
