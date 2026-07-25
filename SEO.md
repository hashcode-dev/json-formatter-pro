# SEO.md — Search Engine Optimization Checklist & Template

> **Purpose:** A strict, reusable checklist every page of a web application (starting with **jsonformatter.in**) must satisfy to rank high on search engines and maximize organic traffic.
>
> **How to use this file:**
> 1. The developer supplies a **researched keyword list** (from Google Keyword Planner, Ahrefs, Semrush, Ubersuggest, or Google Search Console) in the [Keyword Map](#1-keyword-research--mapping) section below.
> 2. For every new or existing page, work top-to-bottom through the checklist and tick each box.
> 3. Nothing ships until all **[MUST]** items pass. **[SHOULD]** items are strong recommendations; **[NICE]** are competitive extras.
>
> **Stack:** Astro (static-first, island architecture). Astro notes are called out inline as `▸ Astro:`.
> **Primary tool pages assumed:** JSON Formatter, JSON Validator, JSON Editor / Viewer, JSON Beautifier / Minifier, JSON to XML/CSV/YAML converters.

---

## Scoring / definitions

- **[MUST]** — Blocking. Page cannot ship without it.
- **[SHOULD]** — Do it unless there is a documented reason not to.
- **[NICE]** — Competitive edge; schedule when capacity allows.
- **Owner** — Assign a name per section so nothing is orphaned.

---

## 1. Keyword Research & Mapping

> Fill this table BEFORE writing or optimizing a page. One primary keyword per page. Do not target the same primary keyword on two pages (keyword cannibalization).

List of key words are metioned below:

json formatter chrome extension
chrome extension json formatter
chrome json formatter extension
json format chrome extension
json format convert
json file structure
json format parser
json configuration file
json form
json string to json online
string to json converter online

**Checklist**

- [ ] **[MUST]** Every page has exactly **one primary keyword** and a documented search intent.
- [ ] **[MUST]** Primary keyword pulled from a real tool (Keyword Planner / Ahrefs / Semrush / GSC), not guessed.
- [ ] **[MUST]** No two pages compete for the same primary keyword (avoid cannibalization).
- [ ] **[SHOULD]** Capture 3–8 secondary/long-tail keywords per page (long-tails convert and rank faster).
- [ ] **[SHOULD]** Map keywords to intent: informational (blog), transactional/tool (tool pages), navigational (brand).
- [ ] **[SHOULD]** Prioritize low-difficulty + decent-volume terms first to earn early rankings.
- [ ] **[NICE]** Track "People Also Ask" and related searches to seed FAQ content.

---

## 2. On-Page SEO (per page)

### 2.1 Title tag
- [ ] **[MUST]** Unique `<title>` on every page, 50–60 chars (avoid truncation ~600px).
- [ ] **[MUST]** Primary keyword near the front. e.g. `JSON Formatter – Format, Beautify & Validate JSON Online | jsonformatter.in`
- [ ] **[SHOULD]** Include a value word (Online, Free, Fast) and brand at the end.
- [ ] **[MUST]** No duplicate titles across the site.

### 2.2 Meta description
- [ ] **[MUST]** Unique meta description, 140–160 chars, includes primary keyword naturally.
- [ ] **[SHOULD]** Write it as ad copy with a call-to-action ("Format and validate JSON instantly — free, no signup").
- [ ] **[NICE]** Front-load the benefit; Google may rewrite it, but a good one lifts CTR.

### 2.3 Headings
- [ ] **[MUST]** Exactly one `<h1>` per page containing the primary keyword.
- [ ] **[MUST]** Logical heading hierarchy (`h1 → h2 → h3`), no skipped levels.
- [ ] **[SHOULD]** Use secondary keywords in `h2`/`h3` where natural.

### 2.4 URL
- [ ] **[MUST]** Short, lowercase, hyphen-separated, keyword-rich slugs (`/json-validator`, not `/page?id=3`).
- [ ] **[MUST]** No stop words / dates / IDs when avoidable; keep URLs stable (301 if they must change).
- [ ] **[SHOULD]** Flat structure; avoid deep nesting (max ~2 levels from root).

### 2.5 Content body
- [ ] **[MUST]** Primary keyword appears in the first 100 words, naturally (no stuffing).
- [ ] **[MUST]** Enough unique, useful text on tool pages (aim 300+ words explaining what the tool does, how to use it, FAQs) — tool pages with only a widget rank poorly.
- [ ] **[SHOULD]** Cover the topic comprehensively (topical authority): what/why/how, examples, edge cases.
- [ ] **[SHOULD]** Use synonyms and related terms (LSI) rather than repeating the exact keyword.
- [ ] **[SHOULD]** Add a short FAQ section targeting "People Also Ask" queries.
- [ ] **[NICE]** Format for scannability and AI Overviews: clear question-style headings, concise definitions, tables, bullet answers up top (Google's RAG pulls passages from positions 4–20).

### 2.6 Images & media
- [ ] **[MUST]** Descriptive `alt` text on every meaningful image (keyword where natural, not stuffed).
- [ ] **[MUST]** Descriptive filenames (`json-formatter-screenshot.webp`, not `img1.png`).
- [ ] **[MUST]** Serve modern formats (WebP/AVIF), compressed, correctly sized.
- [ ] **[SHOULD]** Set explicit `width`/`height` to prevent layout shift (CLS).
- [ ] **[SHOULD]** Lazy-load below-the-fold images (`loading="lazy"`); never lazy-load the LCP image.
  - `▸ Astro:` Use the `<Image />` / `<Picture />` components from `astro:assets` for automatic optimization, format conversion, and dimension attributes.

### 2.7 Internal linking
- [ ] **[MUST]** Every page links to and is linked from other relevant pages (no orphan pages).
- [ ] **[MUST]** Descriptive anchor text (link "JSON validator", not "click here").
- [ ] **[SHOULD]** Link tool pages to each other and to supporting blog posts (build topic clusters).
- [ ] **[SHOULD]** Keep important pages within ~3 clicks of the homepage.

---

## 3. Technical SEO

### 3.1 Indexability & crawl
- [ ] **[MUST]** `robots.txt` present at root, allows crawling of all indexable pages, links to sitemap.
- [ ] **[MUST]** XML sitemap generated, submitted to Google Search Console & Bing Webmaster Tools.
  - `▸ Astro:` Install `@astrojs/sitemap`; it auto-generates `/sitemap-index.xml` at build. Set `site` in `astro.config.mjs`.
- [ ] **[MUST]** No accidental `noindex` on pages you want ranked; confirm important pages are indexed (`site:jsonformatter.in` in Google).
- [ ] **[MUST]** Canonical tag (`<link rel="canonical">`) on every page pointing to the preferred URL (prevents duplicate-content dilution).
- [ ] **[SHOULD]** Handle pagination/parameters cleanly; block thin/utility pages from index via `noindex` if needed.
- [ ] **[SHOULD]** Return proper status codes: 200 for live, 301 for moved, 404 for gone, no soft-404s.

### 3.2 Rendering & crawlability (critical for JS tools)
- [ ] **[MUST]** Core content is present in the initial HTML, not injected only by client JS (Google renders JS but SSR/SSG is more reliable and faster).
  - `▸ Astro:` Ship pages as static HTML (SSG). Keep the interactive JSON tool as a hydrated **island** (`client:load` / `client:visible`) so the surrounding SEO content renders server-side. Prefer `client:visible` for below-the-fold widgets to cut JS on load.
- [ ] **[MUST]** Meta tags, headings, and copy render without JavaScript.
- [ ] **[SHOULD]** Minimize client-side JS; Astro ships zero JS by default — keep it that way outside islands.

### 3.3 HTTPS & security
- [ ] **[MUST]** Entire site served over HTTPS with a valid certificate.
- [ ] **[MUST]** Force HTTPS redirect; no mixed content warnings.
- [ ] **[SHOULD]** Enable HSTS.

### 3.4 Canonicalization & duplicates
- [ ] **[MUST]** One canonical host — pick `https://jsonformatter.in` OR `https://www.jsonformatter.in` and 301 the other.
- [ ] **[MUST]** Consistent trailing-slash policy; 301 the variant.
- [ ] **[SHOULD]** No duplicate content across parameterized URLs.

### 3.5 Structured data (Schema.org / JSON-LD)
- [ ] **[MUST]** Add `WebApplication` (or `SoftwareApplication`) JSON-LD to tool pages (name, description, `applicationCategory: DeveloperApplication`, `offers` price 0, `operatingSystem`).
- [ ] **[SHOULD]** Add `FAQPage` JSON-LD for FAQ sections (eligible for rich results).
- [ ] **[SHOULD]** Add `BreadcrumbList` JSON-LD + visible breadcrumbs.
- [ ] **[SHOULD]** Add `Organization` / `WebSite` schema on the homepage (enables sitelinks search box, brand knowledge panel).
- [ ] **[MUST]** Validate every schema block with Google's [Rich Results Test](https://search.google.com/test/rich-results) — zero errors.
- [ ] **[NICE]** `HowTo` schema for "how to format JSON" style content.

### 3.6 Mobile
- [ ] **[MUST]** Responsive, mobile-first design (Google uses mobile-first indexing).
- [ ] **[MUST]** `<meta name="viewport" content="width=device-width, initial-scale=1">` present.
- [ ] **[MUST]** Tap targets ≥ 48px, no horizontal scroll, readable font sizes.
- [ ] **[MUST]** Passes Google's mobile-friendly checks (test in GSC / Lighthouse).

### 3.7 International / localization (if applicable)
- [ ] **[NICE]** `hreflang` tags if you serve multiple languages/regions.
- [ ] **[NICE]** Declare `<html lang="en">`.

---

## 4. Performance & Core Web Vitals

> Google measures Core Web Vitals at the **75th percentile of real user data** — 75% of visits must be "good" to pass. INP is the most commonly failed metric (≈43% of sites fail it). Verified July 2026.

**Thresholds (aim for "Good"):**

| Metric | Good | Needs work | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) — loading | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) — responsiveness | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) — visual stability | ≤ 0.1 | 0.1–0.25 | > 0.25 |

**Checklist**

- [ ] **[MUST]** All three Core Web Vitals in the "Good" range on mobile (check GSC → Core Web Vitals + [PageSpeed Insights](https://pagespeed.web.dev/)).
- [ ] **[MUST]** LCP: optimize the largest element — preload hero/critical assets, no lazy-load on LCP image, fast server/CDN response (TTFB < 0.8s).
- [ ] **[MUST]** INP: minimize main-thread work; break up long JS tasks; keep the JSON parser/formatter off the main thread for large inputs (Web Worker) so typing/interaction stays responsive.
- [ ] **[MUST]** CLS: set explicit dimensions on images/embeds/ads; reserve space for dynamic UI; use `font-display: swap` with fallback metrics.
- [ ] **[SHOULD]** Serve via CDN; enable HTTP/2 or HTTP/3, gzip/Brotli compression, and long-lived caching for static assets.
- [ ] **[SHOULD]** Minify HTML/CSS/JS; remove unused CSS/JS.
  - `▸ Astro:` Build output is already minified and ships zero JS by default. Use `client:visible`/`client:idle` to defer island hydration. Self-host or preload fonts. Audit island bundle size.
- [ ] **[SHOULD]** Preconnect/preload critical third-party origins; defer non-critical third-party scripts (analytics, ads).
- [ ] **[SHOULD]** Target Lighthouse Performance ≥ 90 on mobile.
- [ ] **[NICE]** Test with large JSON payloads — ensure the tool doesn't freeze the tab (chunked parsing / worker).

---

## 5. Content Quality, E-E-A-T & Topical Authority

> Google's primary quality lens is **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness). Strong E-E-A-T pages have materially higher odds of top-3 placement and citation in AI Overviews. Verified July 2026.

- [ ] **[MUST]** Content is original, accurate, and genuinely useful — "people-first," not written just for search engines.
- [ ] **[MUST]** No thin/duplicate/auto-spun content; each page earns its place.
- [ ] **[SHOULD]** Demonstrate **Experience/Expertise**: real examples, correct technical detail, up-to-date info.
- [ ] **[SHOULD]** Demonstrate **Trust**: clear About page, contact info, privacy policy, and a note that JSON is processed in-browser (privacy is a strong trust signal for a dev tool).
- [ ] **[SHOULD]** Build **topical authority** with a content cluster: pillar page + supporting posts (what is JSON, JSON vs XML, JSON syntax rules, common JSON errors, JSON best practices) all interlinked.
- [ ] **[SHOULD]** Keep content fresh — review and update dated posts; add "last updated" dates.
- [ ] **[NICE]** Structure answers for **AI Overviews / featured snippets**: lead with a concise definition/answer, use Q&A headings, tables, and cite reputable sources.
- [ ] **[NICE]** Add author bylines/bios where a human expert is credited.

---

## 6. Off-Page SEO & Authority

- [ ] **[MUST]** Verified profiles in Google Search Console **and** Bing Webmaster Tools; sitemap submitted to both.
- [ ] **[SHOULD]** Earn backlinks from relevant, authoritative sites (dev blogs, tool directories, Stack Overflow answers, GitHub READMEs, "best JSON tools" listicles).
- [ ] **[SHOULD]** List the tool in reputable directories and developer tool roundups.
- [ ] **[SHOULD]** Prioritize link **quality/relevance** over quantity; avoid paid link schemes / PBNs (penalty risk).
- [ ] **[SHOULD]** Consistent brand mentions and NAP (if a business entity) across the web.
- [ ] **[NICE]** Create shareable assets (cheat sheets, an API, an embeddable widget) that naturally attract links.
- [ ] **[NICE]** Encourage social sharing; add Open Graph + Twitter Card tags (below) so shares render well.

---

## 7. Social & Rich Sharing Meta

- [ ] **[MUST]** Open Graph tags on every page: `og:title`, `og:description`, `og:type`, `og:url`, `og:image` (1200×630), `og:site_name`.
- [ ] **[MUST]** Twitter Card tags: `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.
- [ ] **[SHOULD]** Validate with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and Twitter Card Validator.
  - `▸ Astro:` Centralize these in a reusable `<SEO>` / `<BaseHead>` component that takes props (title, description, image, canonical) and renders all meta + JSON-LD, so every page is consistent by construction.

---

## 8. Analytics, Monitoring & Maintenance

- [ ] **[MUST]** Analytics installed (GA4 or a privacy-friendly alternative like Plausible) — deferred so it doesn't hurt CWV.
- [ ] **[MUST]** Google Search Console monitored weekly: coverage errors, CWV report, queries, CTR, average position.
- [ ] **[SHOULD]** Set up rank tracking for the target keyword list.
- [ ] **[SHOULD]** Monthly technical audit (broken links, 404s, crawl errors, orphan pages) with Lighthouse / Screaming Frog / Ahrefs.
- [ ] **[SHOULD]** Watch for and disavow toxic backlinks if they appear.
- [ ] **[NICE]** Track AI Overview / featured-snippet appearances and zero-click impressions.

---

## 9. Per-Page Pre-Launch Gate (copy this block for each new page)

```
Page: ____________________   Primary keyword: ____________________   Owner: ______

[ ] Unique title (50–60 chars, keyword front-loaded)
[ ] Unique meta description (140–160 chars, CTA)
[ ] One H1 with primary keyword; clean heading hierarchy
[ ] Keyword-rich, hyphenated URL slug
[ ] Primary keyword in first 100 words; 300+ words of useful content
[ ] Internal links in + out with descriptive anchors (not orphaned)
[ ] Images: alt text, WebP/AVIF, dimensions set, lazy-loaded (except LCP)
[ ] Canonical tag correct
[ ] Indexable (no stray noindex); in sitemap
[ ] JSON-LD schema added + passes Rich Results Test
[ ] OG + Twitter Card tags + validated
[ ] Mobile-friendly; viewport meta present
[ ] Core Web Vitals Good on mobile (LCP ≤2.5s / INP ≤200ms / CLS ≤0.1)
[ ] Renders core content without JS (SSG/SSR)
[ ] Content is original, accurate, people-first (E-E-A-T)
[ ] Submitted / requested indexing in GSC
```

**Ship rule:** All **[MUST]** boxes checked = green light. Any unchecked [MUST] = do not deploy.

---

## Quick reference — highest-leverage wins for jsonformatter.in

1. Render SEO content as static HTML (Astro SSG); keep the JSON widget as a hydrated island.
2. One well-optimized page per primary keyword, each with 300+ words + FAQ, all interlinked.
3. Nail Core Web Vitals — especially INP (offload heavy JSON parsing to a Web Worker).
4. Add `WebApplication` + `FAQPage` JSON-LD and validate it.
5. Build a JSON content cluster (what is JSON, JSON vs XML, common errors) to earn topical authority and links.
6. Set up GSC + Bing, submit sitemap, and monitor weekly.

---

### Sources (best-practice references, verified July 2026)
- Core Web Vitals thresholds: https://www.corewebvitals.io/core-web-vitals
- Core Web Vitals 2026 optimization: https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide
- E-E-A-T & ranking factors 2026: https://optinmonster.com/seo-ranking-factors/
- AI Overviews ranking factors: https://wellows.com/blog/google-ai-overviews-ranking-factors/
