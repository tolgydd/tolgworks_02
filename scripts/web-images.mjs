// Makes web-sized copies of photos before uploading them in Pages CMS, which refuses files over about 3 MB.
// Usage: npm run web-images -- "C:\path\to\folder" (or a single file)
// Each JPG, PNG, WebP or TIFF is scaled down to at most 2400px on its longest side and saved as WebP
// in a "web" folder next to the originals. The originals are never changed.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MAX = 2400, QUALITY = 80;
const target = process.argv[2];
if (!target || !fs.existsSync(target)) {
  console.error('Give a folder or an image file, e.g. npm run web-images -- "C:\\Users\\me\\Downloads\\photos"');
  process.exit(1);
}
const isDir = fs.statSync(target).isDirectory();
const dir = isDir ? target : path.dirname(target);
const files = (isDir ? fs.readdirSync(dir) : [path.basename(target)]).filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f));
const out = path.join(dir, 'web');
fs.mkdirSync(out, { recursive: true });

for (const f of files) {
  const src = path.join(dir, f), dest = path.join(out, f.replace(/\.[^.]+$/, '.webp'));
  const info = await sharp(src).rotate().resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(dest);
  const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
  console.log(`${f}: ${mb(fs.statSync(src).size)} -> ${mb(info.size)}, ${info.width}x${info.height}`);
}
console.log(`\nDone. Upload the files in ${out}`);
