import { DurableObject } from 'cloudflare:workers';

const DAY_SEC = 86400;
const COUNTER_EPOCH = 2; // bump to wipe all counts & seen hashes once on next deploy
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|linkedin|embedly|quora|pinterest|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|curl|wget|python|go-http|axios|node-fetch/i;

export class ViewCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS counts (
          slug TEXT PRIMARY KEY,
          n INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS seen (
          slug TEXT NOT NULL,
          vh TEXT NOT NULL,
          ts INTEGER NOT NULL,
          PRIMARY KEY (slug, vh)
        );
        CREATE TABLE IF NOT EXISTS meta (
          k TEXT PRIMARY KEY,
          v INTEGER NOT NULL
        );
      `);
      const ep = this.ctx.storage.sql
        .exec("SELECT v FROM meta WHERE k = 'epoch'")
        .toArray()[0];
      if (!ep || Number(ep.v) < COUNTER_EPOCH) {
        this.ctx.storage.sql.exec('DELETE FROM counts; DELETE FROM seen;');
        this.ctx.storage.sql.exec(
          "INSERT INTO meta (k, v) VALUES ('epoch', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
          COUNTER_EPOCH
        );
      }
    });
  }

  get(slug) {
    const row = this.ctx.storage.sql
      .exec('SELECT n FROM counts WHERE slug = ?', slug)
      .toArray()[0];
    return row ? Number(row.n) : 0;
  }

  hit(slug, vh, nowSec) {
    this.ctx.storage.sql.exec('DELETE FROM seen WHERE ts < ?', nowSec - DAY_SEC);

    const prev = this.ctx.storage.sql
      .exec('SELECT ts FROM seen WHERE slug = ? AND vh = ?', slug, vh)
      .toArray()[0];

    if (!prev) {
      this.ctx.storage.sql.exec(
        'INSERT INTO seen (slug, vh, ts) VALUES (?, ?, ?)',
        slug,
        vh,
        nowSec
      );
      this.ctx.storage.sql.exec(
        `INSERT INTO counts (slug, n) VALUES (?, 1)
         ON CONFLICT(slug) DO UPDATE SET n = n + 1`,
        slug
      );
    }

    return this.get(slug);
  }
}

async function visitorHash(ip, ua) {
  const data = new TextEncoder().encode(`tw:v1:${ip}:${ua.slice(0, 120)}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf).slice(0, 8)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/v\/([^/]+)\/?$/);
    if (!match) {
      return env.ASSETS.fetch(request);
    }

    const slug = decodeURIComponent(match[1]).toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return json({ error: 'invalid' }, 400);
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'method' }, 405);
    }

    const stub = env.VIEWS.get(env.VIEWS.idFromName('global'));

    if (request.method === 'GET') {
      const n = await stub.get(slug);
      return json({ n });
    }

    const ua = request.headers.get('user-agent') || '';
    const origin = request.headers.get('origin') || '';
    const secSite = request.headers.get('sec-fetch-site') || '';
    const crossOrigin =
      (origin && origin !== url.origin) ||
      (secSite && secSite !== 'same-origin');

    if (!ua || BOT_RE.test(ua) || crossOrigin) {
      const n = await stub.get(slug);
      return json({ n });
    }

    const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    const vh = await visitorHash(ip, ua);
    const nowSec = Math.floor(Date.now() / 1000);
    const n = await stub.hit(slug, vh, nowSec);
    return json({ n });
  },
};
