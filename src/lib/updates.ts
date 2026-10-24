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

/** Turns a Vimeo or YouTube link into an embed address (no autoplay, so nothing makes sound on its own). */
export function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return url;
}
