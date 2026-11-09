import type { APIRoute } from 'astro';
import { getUpdates } from '../lib/updates';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://tolgworks.co');
  const updates = await getUpdates();
  const latestDate = updates[0]?.data.date.toISOString().split('T')[0];

  const staticPages: Array<{ path: string; lastmod?: string; changefreq: string; priority: string }> = [
    { path: '/', lastmod: latestDate, changefreq: 'weekly', priority: '1.0' },
    { path: '/updates/', lastmod: latestDate, changefreq: 'weekly', priority: '0.9' },
    { path: '/cv/', lastmod: latestDate, changefreq: 'monthly', priority: '0.8' },
    { path: '/contact/', changefreq: 'yearly', priority: '0.6' },
  ];

  const urls = [
    ...staticPages.map(p => ({
      loc: new URL(p.path, base).href,
      lastmod: p.lastmod,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
    ...updates.map(u => {
      const d = u.data.endDate ?? u.data.date;
      return {
        loc: new URL(`/updates/${u.id}/`, base).href,
        lastmod: d.toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: u.data.featured ? '0.8' : '0.7',
      };
    }),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        u =>
          `  <url>\n` +
          `    <loc>${esc(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority}</priority>\n` +
          `  </url>`,
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
