import type { APIRoute } from 'astro';
import { SITE_URL } from '@lib/site';

/**
 * Origin robots.txt. This intentionally allows ALL crawlers — including AI
 * search/citation bots (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,
 * Google-Extended, etc.) — via the wildcard `Allow: /`. We want AI-search
 * visibility, so there is deliberately no per-bot `Disallow` here.
 *
 * IMPORTANT: the robots.txt served in production may NOT match this file.
 * Cloudflare's Content Signals Policy / AI Crawl Control (a zone dashboard
 * setting) PREPENDS a managed block that Disallows several named AI crawlers.
 * That block is edge-injected and cannot be changed from this repo — toggle it
 * in the Cloudflare dashboard (AI Crawl Control → robots.txt). See GEO-ANALYSIS.md.
 */
const getRobotsTxt = (siteUrl: string): string => {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}/sitemap-index.xml
`;
};

export const GET: APIRoute = ({ site }) => {
  const siteUrl = (site?.href ?? SITE_URL).replace(/\/$/, '');

  return new Response(getRobotsTxt(siteUrl), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
