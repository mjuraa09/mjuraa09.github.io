import { test, expect } from '@playwright/test';

// Interactive states the full-page screenshots don't cover: hovers, the open mobile
// menu, the resume accordion, and the case-study scrollspy.
// Each test drives the page into a state and screenshots the viewport.

const MASK = ['video', 'img[src$=".gif"]', '[data-animation-type="lottie"]', '.loop-text-wrapper', '.efx-wrap'];

async function open(page, path) {
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(2500); // reveal sequence
}

async function shot(page, name) {
  await page.mouse.move(0, 0, { steps: 1 }).catch(() => {});
  await expect(page).toHaveScreenshot(name, { mask: MASK.map((s) => page.locator(s)) });
}

test.describe('desktop states', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'desktop only'));

  test('nav CTA hover', async ({ page }) => {
    await open(page, 'index.html');
    await page.locator('.nav-button-wrap .main-button').hover();
    await page.waitForTimeout(1200);
    await expect(page).toHaveScreenshot('nav-cta-hover.png', { clip: { x: 0, y: 0, width: 1440, height: 140 } });
  });

  test('nav link hover', async ({ page }) => {
    await open(page, 'index.html');
    await page.locator('.nav-link').nth(1).hover();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('nav-link-hover.png', { clip: { x: 0, y: 0, width: 1440, height: 140 } });
  });

  test('project card hover with cursor', async ({ page }) => {
    await open(page, 'index.html');
    const card = page.locator('.work-link').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 5 });
    await page.waitForTimeout(1200);
    await expect(page).toHaveScreenshot('project-card-hover.png', { mask: MASK.map((s) => page.locator(s)) });
  });

  test('footer social + back-to-top hover', async ({ page }) => {
    await open(page, 'index.html');
    await page.locator('.social-link').first().scrollIntoViewIfNeeded();
    await page.locator('.social-link').first().hover();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('footer-social-hover.png', { mask: MASK.map((s) => page.locator(s)) });
  });

  test('resume accordion collapsed', async ({ page }) => {
    await open(page, 'resume.html');
    await page.locator('.rsm-sec-head').first().click();
    await page.waitForTimeout(1000);
    await shot(page, 'resume-accordion.png');
  });

  test('case study scrollspy', async ({ page }) => {
    await open(page, 'projects/rdir-fintech-copy.html');
    const section = page.locator('[data-section]').nth(2);
    await section.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(1500);
    await shot(page, 'case-study-scrollspy.png');
  });

});

test.describe('mobile states', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'mobile', 'mobile only'));

  test('mobile menu open', async ({ page }) => {
    await open(page, 'index.html');
    await page.locator('.menu-button').click();
    await page.waitForTimeout(1500);
    await shot(page, 'mobile-menu-open.png');
  });

  test('mobile menu open on case study', async ({ page }) => {
    await open(page, 'projects/youmap-socialmedia.html');
    await page.locator('.menu-button').click();
    await page.waitForTimeout(1500);
    await shot(page, 'mobile-menu-open-case-study.png');
  });
});
