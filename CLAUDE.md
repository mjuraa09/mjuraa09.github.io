# matj-my-site

Static portfolio site exported from Webflow (last Webflow publish 2026-11-05), now maintained by hand.

## Ground rules
- Keep the HTML structure intact (DOM nesting, class names, `data-w-id` attributes). `js/webflow.js` drives
  interactions (IX2), Lottie, the mobile navbar and forms through these attributes.
- Every change must keep the site looking and behaving the same unless a visual change is intended.

## Commands
- `npm run dev` – local server at http://localhost:8080 (also the `site` entry in `.claude/launch.json`).
- `npm run test:visual` – full-page screenshots of every page at desktop 1440 / tablet 768 / mobile 390,
  compared with `tests/baseline/`. Run it after every change.
- `npm run baseline:update` – re-capture the baseline. Only after an intended visual change, and commit it.
- `node tools/diff-regions.mjs <diff.png>` – lists the vertical bands where a failed comparison differs.

Videos, GIFs, Lottie, the footer marquee and the image gradient effect are masked in screenshots
(they loop), so check those by eye in the browser.
