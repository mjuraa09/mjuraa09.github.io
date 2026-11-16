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

## Images
- Case-study screenshots live in `images/cases/<name>-{600,1000,1800}.{avif,webp}`, built from the 4096×3072
  R2 originals (AVIF q80 + WebP q86 fallback, alpha flattened — it was unused). Each `<img>` sits in a
  `<picture>` with both formats, `sizes="(max-width: 991px) 90vw, (max-width: 1439px) 55vw, 917px"`,
  `width/height` for the aspect ratio and `loading="lazy"`. Largest display size is 917px at a 1920 viewport.
- Why: the originals were up to 7 MB each and ~26 MB per page, which stalled scrolling (frames of 117 and
  200 ms). Now a case study loads 0.4–1.4 MB of images and no frame goes over 20 ms.
- The case-study SVGs and GIFs sit next to them in `images/cases/`, as exact copies of the R2 files.

## Videos
- All case-study videos live in `media/cases/` (slug names, e.g. `rdir-header.webm`), each with a
  `<name>-poster.webp` first frame in the `<video poster>` so the box isn't empty while it loads.
- The three 4K header videos were re-encoded to 2880px wide (2× the 1440px they are shown at), VP9, no audio:
  `mflota-header` 40.7 → 14 MB (CRF 36), `rdir-header` 9.7 → 3.8 MB (CRF 36), `ym-header` 2.9 → 1.75 MB
  (CRF 30: at 36 the concrete grain went soft). Checked with VMAF (96–99) and 1:1 crops of the same frame.
  The other ten videos are byte-identical copies of the R2 files.
- No system ffmpeg here (no Homebrew). For a new encode: `npm i ffmpeg-static` in a temp folder and use
  `node -p "require('ffmpeg-static')"` as the binary. Recipe: `-vf scale=2880:-2:flags=lanczos -c:v libvpx-vp9
  -crf 32..36 -b:v 0 -deadline good -cpu-used 3 -row-mt 1 -tile-columns 2 -an`; lower the CRF when the frame
  has fine texture.
- Never commit an unoptimized original: git keeps every version of a file forever.
- Nothing on the site loads from Cloudflare R2 any more (2026-11-16); the buckets can be retired.

## Where custom code lives
- `css/custom.css` – former Webflow custom code (reveal animation, Safari SVG fix, embed styles).
- `js/site.js` – reveal on load, `smoothScrollTo` (back-to-top and the case-study steps), case-study
  scrollspy. The steps nav replaces Webflow's anchor scroll: it listens on the steps `.w-nav-menu` and
  stops the event before it reaches the document handler in `js/webflow.js`. Durations cap at 700 ms
  instead of growing with the distance, and the scrollspy is frozen until the scroll lands, so the
  highlight goes straight to the step you picked. Where a step lands is `scroll-margin-top` on
  `.descripted-section` in `css/custom.css`, sized to clear the sticky navbar (and the steps bar ≤991).
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
- `js/webflow.js` and jQuery can be removed only after the last IX2 effect, the mobile navbar (`w-nav`)
  and Lottie (`documents/*.json`) have their own code. Anchor smooth scroll is already ours (2026-11-13):
  the only same-page anchors are the case-study steps and `href="#"` back-to-top, both handled in
  `js/site.js`.

Videos, GIFs, Lottie, the footer marquee and the image gradient effect are masked in screenshots
(they loop), so check those by eye in the browser.

## Hosting
- GitHub Pages: repo `mjuraa09/mjuraa09.github.io`, deployed by `.github/workflows/pages.yml` on every push to
  `main`. Only `*.html`, `css/`, `js/`, `images/`, `media/`, `fonts/`, `documents/`, `projects/`, `data/` (and `CNAME`)
  are published. Pages serves byte ranges (206), so videos seek normally.
- Pages serves everything with `cache-control: max-age=600`, so the workflow stamps `?v=<commit>` onto every
  local `css/`-`js/` URL in the published HTML. The files in the repo keep clean paths (tests load those), and a
  visitor never runs new HTML against an old script. The HTML itself is still cached for 10 minutes: right after
  a deploy, reload with Cmd+Shift+R to see a change immediately.
- The custom domain is not connected yet; the old Webflow site still serves it.
