# tolgworks.co

Portfolio site of Tolga Aydoğdu. Built with [Astro](https://astro.build), hosted on Cloudflare Pages.

## Adding an update

Use the editor at [app.pagescms.org](https://app.pagescms.org): sign in with GitHub, open this repository, choose **Updates**, then **Add an entry**. Save, and the site rebuilds in about a minute.

- The first image of an update is its cover: the hover preview on the lists and the card on Home.
- Switch on **Featured on Home** to show it in Selected works; **Featured order** sets the order.
- **Draft** keeps an entry saved but off the site.

Each update is a Markdown file in `src/content/updates/`, so it can also be edited directly on GitHub.

## Other edits

| What | Where |
| --- | --- |
| Default highlight colour, email, social links | `src/site.ts` |
| Bio and research areas on Home | `src/pages/index.astro` |
| CV | `src/pages/cv.astro`, then `npm run build && npm run cv-pdf` to refresh the PDF |
| Contact text | `src/pages/contact.astro` |
| Colours, type, layout | `src/styles/global.css` |

## Running locally

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## Cloudflare settings

Workers & Pages → Create → Import a repository → `tolgworks_02`. Build command: `npm run build`. Deploy command: `npx wrangler deploy` (reads `wrangler.jsonc`). Then add `tolgworks.co` under the project's Domains.
