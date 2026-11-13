# matj-my-site

Static portfolio site exported from Webflow (last Webflow publish 2026-11-05), now maintained by hand.

## Ground rules
- Keep the HTML structure intact (DOM nesting, class names, `data-w-id` attributes). `js/webflow.js` drives
  interactions (IX2), Lottie, the mobile navbar and forms through these attributes.
- Every change must keep the site looking and behaving the same unless a visual change is intended.

## Commands
- `npm run dev` – local server at http://localhost:8080 (also the `site` entry in `.claude/launch.json`).
- `npm run test:visual` – runs both suites against `tests/baseline/`. Run it after every change.
  - `tests/visual.spec.js`: full-page screenshots of every page at desktop 1440 / tablet 768 / mobile 390.
  - `tests/states.spec.js`: interactive states (nav/CTA/card/footer hovers, resume accordion,
    case-study scrollspy, open mobile menu, activity section).
- `npm run test:live` – same comparison against the deployed site (https://mjuraa09.github.io).
- `npm run baseline:update` – re-capture the baseline. Only after an intended visual change, and commit it.
- `node tools/diff-regions.mjs <diff.png>` – lists the vertical bands where a failed comparison differs.
- `node tools/prune-css.mjs [--write] css/x.css` – removes selectors for classes used nowhere (HTML or JS).
- `npm run stats` – rebuilds `data/activity.json` (per-day Claude Code usage from `~/.claude/projects` and the
  GitHub contribution calendar via `gh`). Numbers only: never add project names, paths or prompt text to it.
- Daily refresh: a macOS LaunchAgent (`site.portfolio.activity-stats`, installed with `npm run stats:install`)
  runs `tools/update-stats.sh` at 23:30. It commits and pushes **only** `data/activity.json`, and only when
  local `main` equals `origin/main` (otherwise it logs "skip" and does nothing). Log:
  `~/Library/Logs/site-activity-stats.log`. Run it by hand with `npm run stats:publish`.
  These automatic stats pushes are the one exception to asking before a push.
- `node tools/to-webp.mjs <quality> img...` / `node tools/to-woff2.mjs font...` – asset conversion.

## Where custom code lives
- `css/custom.css` – former Webflow custom code (reveal animation, Safari SVG fix, embed styles).
- `js/site.js` – reveal on load, smooth back-to-top, case-study scrollspy.
- `js/activity.js` + the "Activity section" block in `css/custom.css` – home page heatmap (GitHub / Working with AI
  tabs) drawn from `data/activity.json`. Tests serve `tests/fixtures/activity.json` and pin the date
  (`tests/fixed-activity.js`), so refreshing the real data never breaks screenshots.
- `js/custom/*.js` – former Webflow-hosted scripts; `js/vendor/` – jQuery.
- Webflow-generated: `css/webflow.css`, `css/mateuszs-my-site.webflow.css`, `js/webflow.js` (IX2 interactions).

## Moving off webflow.js: gradually, when an element is changed anyway
There is no big rewrite planned (audit 2026-11-11: ~16–24 h, not worth it on its own). Instead:
- When redesigning an element that has an IX2 interaction, move that element off Webflow in the same change:
  remove its `data-w-id` and the inline `style` IX2 wrote as the initial state, then rebuild the effect in
  `css/custom.css` (or `js/site.js` if it needs JS). Without `data-w-id` IX2 ignores the element.
- Rebuild the timing faithfully: IX2 easings like `swingTo`/`outBack`/`outExpo` can be reproduced with CSS
  `linear()` or `cubic-bezier()`. Read durations, delays and easings from the `Webflow.require("ix2").init(...)`
  data at the end of `js/webflow.js`.
- New animations are always written in CSS/JS (they can't be added to IX2 without the Webflow editor).
- Elements nobody is changing stay on IX2. Live IX2 effects today: main-button hover, nav-link text slide,
  project card (image scale, "+" cursor, cursor follow), scroll-down loop, rotating circle text, large link-button
  (detail_work only). Most of the 209 IX2 events and all IX3 registrations target elements that no longer exist.
- `js/webflow.js` and jQuery can be removed only after the last IX2 effect, the mobile navbar (`w-nav`),
  Lottie (`documents/*.json`) and anchor smooth scroll in the case-study steps have their own code.

Videos, GIFs, Lottie, the footer marquee and the image gradient effect are masked in screenshots
(they loop), so check those by eye in the browser.

## Hosting
- GitHub Pages: repo `mjuraa09/mjuraa09.github.io`, deployed by `.github/workflows/pages.yml` on every push to
  `main`. Only `*.html`, `css/`, `js/`, `images/`, `fonts/`, `documents/`, `projects/`, `data/` (and `CNAME`) are published.
- Pages serves everything with `cache-control: max-age=600`, so the workflow stamps `?v=<commit>` onto every
  local `css/`-`js/` URL in the published HTML. The files in the repo keep clean paths (tests load those), and a
  visitor never runs new HTML against an old script. The HTML itself is still cached for 10 minutes: right after
  a deploy, reload with Cmd+Shift+R to see a change immediately.
- The custom domain is not connected yet; the old Webflow site still serves it.
