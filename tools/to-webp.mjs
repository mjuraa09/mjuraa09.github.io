// Converts images to WebP next to the originals. Usage: node tools/to-webp.mjs [quality] file...
import sharp from 'sharp';
import { statSync } from 'node:fs';
const [q, ...files] = process.argv.slice(2);
for (const f of files) {
  const out = f.replace(/\.(png|jpe?g)$/i, '.webp');
  await sharp(f).webp({ quality: Number(q), alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(out);
  const a = statSync(f).size, b = statSync(out).size;
  console.log(`${f}: ${(a / 1024).toFixed(0)} KB -> ${(b / 1024).toFixed(0)} KB (${Math.round((1 - b / a) * 100)}% smaller)`);
}
