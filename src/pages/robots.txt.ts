import type { APIRoute } from 'astro';

const getRobotsTxt = (siteUrl: string): string => {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}/sitemap-index.xml
`;
};

export const GET: APIRoute = ({ site }) => {
  const siteUrl = (site?.href ?? 'https://formatjson.in').replace(/\/$/, '');

  return new Response(getRobotsTxt(siteUrl), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
