import { getCollection, type CollectionEntry } from 'astro:content';

export type Update = CollectionEntry<'updates'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** All published updates, newest first, each with its running number (oldest is 01). */
export async function getUpdates() {
  const all = (await getCollection('updates', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title));
  return all.map((u, i) => ({ ...u, n: String(all.length - i).padStart(2, '0') }));
}
export type NumberedUpdate = Awaited<ReturnType<typeof getUpdates>>[number];

export function formatDate(d: Date, show: 'day' | 'month' | 'year' = 'month') {
  const y = d.getUTCFullYear(), m = MONTHS[d.getUTCMonth()];
  if (show === 'year') return String(y);
  if (show === 'month') return `${m} ${y}`;
  return `${d.getUTCDate()} ${m} ${y}`;
}

export function formatRange(u: Update) {
  const { date, endDate, showDate } = u.data;
  const start = formatDate(date, showDate);
  const end = endDate && formatDate(endDate, showDate);
  return !end || end === start ? start : `${start} – ${end}`;
}

export const cover = (u: Update) => u.data.images[0];
export const place = (u: Update) => u.data.venue + (u.data.city && !u.data.venue.includes(u.data.city) ? ', ' + u.data.city : '');

type Image = Update['data']['images'][number];
type Video = Update['data']['videos'][number];
const esc = (s = '') => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Caption line for an image: "fig. 03 / caption", numbered by its place in the Images list. */
export const figLabel = (im: Image, n: number) => `fig. ${pad2(n)}${im.caption ? ` / ${im.caption}` : ''}`;

const imageHtml = (im: Image, n: number, title: string) =>
  `<figure class="fig"><img src="${esc(im.src)}" alt="${esc(im.alt || `${title}, image ${n}`)}" loading="lazy">` +
  `<figcaption class="mono"><span>${esc(figLabel(im, n))}</span>${im.credit ? `<span>photo: ${esc(im.credit)}</span>` : ''}</figcaption></figure>`;

const videoHtml = (v: Video, title: string) =>
  `<figure class="fig"><div class="embed"><iframe src="${esc(embedUrl(v.url))}" title="${esc(v.caption || `${title}, video`)}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>` +
  (v.caption ? `<figcaption class="mono"><span>${esc(v.caption)}</span></figcaption>` : '') + `</figure>`;

/**
 * The body text with images and videos placed where the text asks for them: a line of its own reading
 * [[image 3]] or [[video 1]] (numbers follow the Images and Videos lists, image 1 is the cover).
 * Returns the numbers it used, so the page leaves those out of their default spots.
 */
export function placeMedia(u: Update) {
  const images = new Set<number>(), videos = new Set<number>();
  const html = (u.rendered?.html ?? '').replace(/<p>\s*\\?\[\\?\[\s*(image|img|video)\s*(\d+)\s*\\?\]\\?\]\s*<\/p>/gi, (m, kind: string, num: string) => {
    const n = Number(num);
    if (kind.toLowerCase() === 'video') {
      const v = u.data.videos[n - 1];
      if (!v) return m;
      videos.add(n); return videoHtml(v, u.data.title);
    }
    const im = u.data.images[n - 1];
    if (!im) return m;
    images.add(n); return imageHtml(im, n, u.data.title);
  });
  return { html, images, videos };
}

/** Turns a Vimeo or YouTube link into an embed address (no autoplay, so nothing makes sound on its own). */
export function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return url;
}
