// Renders the CV page to public/tolga-aydogdu-cv.pdf using its print styles.
// Run after editing src/pages/cv.astro:  npm run build && npm run cv-pdf
import { createRequire } from 'node:module';
// needs Playwright: `npx playwright install chromium` once, or any global install
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';

const server = spawn('npx', ['astro', 'preview', '--port', '4329'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4329/cv/', { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: 'public/tolga-aydogdu-cv.pdf', preferCSSPageSize: true });
  await browser.close();
  console.log('Wrote public/tolga-aydogdu-cv.pdf');
} finally {
  server.kill();
}
