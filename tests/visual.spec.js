import { test, expect } from '@playwright/test';

// Every published page we keep an eye on (template-info/ is template leftovers).
const PAGES = [
  'index.html',
  'my-project.html',
  'resume.html',
  'contact.html',
  'detail_work.html',
  '404.html',
  'projects/rdir-fintech-copy.html',
  'projects/mflota-ecommerce.html',
  'projects/youmap-socialmedia.html',
];

// Elements that animate on a loop (videos, Lottie, IX2 marquee, image gradient effect).
// They never settle on the same frame, so they are masked out of the comparison
// (the mask box still catches changes to their position and size).
const MASK = [
  'video',
  'img[src$=".gif"]',
  '[data-animation-type="lottie"]',
  '.loop-text-wrapper',
  '.efx-wrap',
];

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  // Scroll through the page so scroll-triggered interactions and lazy images run.
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });

  await page.waitForLoadState('networkidle').catch(() => {});
  // Remote (R2) images can arrive late; wait until every image has decoded.
  await page
    .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15_000 })
    .catch(() => {});
  // Reveal-on-load sequence: 150ms per section + 900ms, plus nav logo transition.
  await page.waitForTimeout(3000);
}

for (const path of PAGES) {
  test(path, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    await settle(page);
    const name = path.replace(/\//g, '__').replace(/\.html$/, '');
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      mask: MASK.map((s) => page.locator(s)),
    });
  });
}
