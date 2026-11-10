// Converts OTF/TTF fonts to WOFF2 (lossless). Usage: node tools/to-woff2.mjs file...
import { compress } from 'wawoff2';
import { readFileSync, writeFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f);
  const out = Buffer.from(await compress(src));
  const dest = f.replace(/\.(otf|ttf)$/i, '.woff2');
  writeFileSync(dest, out);
  console.log(`${f}: ${(src.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
}
