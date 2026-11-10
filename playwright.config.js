// Visual regression setup: baseline screenshots of every page at three widths.
// npm run baseline:update  -> (re)capture the baseline
// npm run test:visual      -> compare the current site against the baseline
import { defineConfig } from '@playwright/test';

const PORT = 8090;

export default defineConfig({
  testDir: 'tests',
  snapshotPathTemplate: 'tests/baseline/{projectName}/{arg}{ext}',
  timeout: 90_000,
  fullyParallel: true,
  retries: 1, // rare one-off rendering noise; a real regression fails both attempts
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      // Absolute (not %) tolerance: absorbs anti-aliasing and a small pulsing dot
      // in case-study heroes (measured: <=24px), but still fails on real changes.
      maxDiffPixels: 50,
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: `node tools/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
