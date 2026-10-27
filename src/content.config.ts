import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The fixed list of types. These are the filter tags on the Updates page.
export const TYPES = ['Installation', 'Exhibition', 'Conference', 'Publication', 'Workshop', 'Seminar', 'Talk', 'Jury', 'Event'] as const;

// One Markdown file per update, in src/content/updates. The editor (Pages CMS, see .pages.yml) writes these files.
const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string(),
    // optional shorter name for the featured card on Home
    shortTitle: z.string().optional(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    showDate: z.enum(['day', 'month', 'year']).default('month'),
    endDate: z.preprocess(v => (v === '' || v === null ? undefined : v), z.coerce.date().optional()),
    types: z.array(z.enum(TYPES)).min(1),
    keywords: z.array(z.string()).default([]),
    venue: z.string(),
    city: z.string().optional(),
    organiser: z.string().optional(),
    role: z.string(),
    collaborators: z.array(z.object({ name: z.string(), role: z.string().optional(), link: z.string().optional() })).default([]),
    summary: z.string().optional(),
    // the first image is the cover: the hover preview on lists and the card on Home
    images: z.array(z.object({ src: z.string(), caption: z.string().optional(), credit: z.string().optional(), alt: z.string().optional() })).default([]),
    videos: z.array(z.object({ url: z.string(), caption: z.string().optional() })).default([]),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    featured: z.boolean().default(false),
    featuredOrder: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { updates };
