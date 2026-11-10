import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const f = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage();
const data = 'data:image/png;base64,' + readFileSync(f).toString('base64');
const res = await p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const rows = new Map();
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) {
    const k = (y * c.width + i) * 4;
    if (d[k] > 200 && d[k+1] < 80 && d[k+2] < 80) { const band = Math.floor(y/100)*100; const r = rows.get(band) || {n:0,minx:1e9,maxx:0}; r.n++; r.minx=Math.min(r.minx,i); r.maxx=Math.max(r.maxx,i); rows.set(band,r); }
  }
  return [...rows.entries()].map(([y,r])=>`${y}: n=${r.n} x=${r.minx}-${r.maxx}`);
}, data);
console.log(res.join('\n')); await b.close();
