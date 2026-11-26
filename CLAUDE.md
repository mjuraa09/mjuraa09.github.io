# matj-my-site

Static portfolio site exported from Webflow (last Webflow publish 2026-11-05), now maintained by hand.

## Ground rules
- Keep the HTML structure intact (DOM nesting, class names, `data-w-id` attributes). `js/webflow.js` drives
  interactions (IX2), Lottie, the mobile navbar and forms through these attributes.
- Every change must keep the site looking and behaving the same unless a visual change is intended.

## Commands
- `npm run dev` – local server at http://localhost:8080 (also the `site` entry in `.claude/launch.json`).
  `tools/serve.mjs` serves byte ranges and video MIME types like GitHub Pages; Safari won't play a video without them.
- `npm run test:visual` – runs both suites against `tests/baseline/`. Run it after every change.
  - `tests/visual.spec.js`: full-page screenshots of every page at desktop 1440 / tablet 768 / mobile 390.
  - `tests/states.spec.js`: interactive states (nav/CTA/card/footer hovers, resume accordion,
    case-study scrollspy, open mobile menu, activity section).
- `npm run test:live` – same comparison against the deployed site (https://mjuraa09.github.io).
- `npm run baseline:update` – re-capture the baseline. Only after an intended visual change, and commit it.
  For single pages use `npx playwright test tests/visual.spec.js -g "projects/<name>" --update-snapshots`:
  `npm run baseline:update -- <file>` fails, because Playwright takes the file as the value of `--update-snapshots`.
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
  `<picture>` with both formats, `sizes="(max-width: 991px) 90vw, (max-width: 1439px) calc(100vw - 540px), 900px"`,
  `width/height` for the aspect ratio and `loading="lazy"`. Largest display size is 900px: the case-study
  content column is capped at 900px (≥992, left-aligned next to the steps sidebar), the width at which the
  1800px files are still 2× sharp. Wider assets would need new, larger exports first.
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
- Every `<video>` has two sources: the VP9 WebM first, typed `video/webm; codecs="vp9"`, then an H.264 MP4
  fallback (`<name>.mp4`) for browsers without VP9 WebM, i.e. older iPhones. A browser downloads only the first
  source it can play, so Chrome and current Safari never fetch the MP4 (verified: 0 requests). MP4s are sized for
  an iPhone screen: 1280 wide (the widest iPhone is 1290px), `libx264 -profile:v high -crf 22 -preset slow
  -pix_fmt yuv420p -movflags +faststart -an`, 19.3 MB for all 13. Median VMAF 93–97; the per-frame minimum
  hits 0 on the blank transition frames of the screen recordings, which VMAF can't score — not a quality problem.
- Never commit an unoptimized original: git keeps every version of a file forever.
- Nothing on the site loads from Cloudflare R2 any more (2026-11-16); the buckets can be retired.

## Where custom code lives
- Text rendering (2026-11-24): `html { -webkit-font-smoothing: antialiased }` at the top of `css/custom.css`. Macs drew
  every glyph heavier than designed (body copy read as bold, in dark mode most of all); only macOS is affected.
- `css/custom.css` – former Webflow custom code (reveal animation, Safari SVG fix, embed styles), and the
  `@font-face` rules for Geist Mono and Funnel Display. Every font is self-hosted in `fonts/`; nothing loads
  from Google Fonts (removed 2026-11-16: Geist Mono drawn from Google made `resume.html` screenshots flaky).
  Only the latin + latin-ext subsets are kept; add another subset from Google's CSS if new text needs it.
  Case-study body copy (`.case-alt`, the 300 text) is Cal Sans UI Light as in Figma, not Webflow's heavier
  Cal Sans Text Light: `fonts/CalSansUI-Light.woff2`, from the designer's local Cal Sans UI set (cal.com's
  repo only ships 400-700).
- `js/site.js` – reveal on load, `smoothScrollTo` (back-to-top and the case-study steps), case-study
  scrollspy. The steps nav replaces Webflow's anchor scroll: it listens on the steps `.w-nav-menu` and
  stops the event before it reaches the document handler in `js/webflow.js`. The glide brakes
  like the wheel (exponential, `GLIDE_RATE` = Lenis' lerp × 60; keep them equal; ~1.1-1.2 s whatever the distance,
  2026-11-24), a new click replaces it, and wheel/touch/scroll keys/mouse button cancel it. The scrollspy is frozen until the scroll lands, so the
  highlight goes straight to the step you picked. Where a step lands is `scroll-margin-top` on
  `.descripted-section` in `css/custom.css`, sized to clear the sticky navbar (and the steps bar ≤991).
  Sections have no top padding (Webflow's 80/128px is gone, 2026-11-17): 48px above and below each
  divider. If spacing changes, re-fit scroll-margin-top so headings still land level with the card.
- Corner smoothing 60% as in Figma (2026-11-25, end of `css/custom.css`): a radius is written
  `calc(<Figma radius> * var(--corner-scale))` and the element is listed under `corner-shape: superellipse(1.78)`
  (the 1.6x radius and 1.78 belong together). Pills and circles stay out. Browsers without `corner-shape` but
  with `clip-path: shape()` (Safari < 27.3, Firefox incl. 160, Chrome 135-138) get the same superellipse as a clip-path, which
  repeats the radii as `--corner` (last block of the file) and cuts shadows, borders and focus rings: see its comment. Corner differences are often under the
  screenshot tolerance, so check them zoomed in.
- Case-study steps sidebar (≥992, 2026-11-16): Figma page "Case study nav – redesign (2026-11)", Option C.
  Pure CSS in `css/custom.css` over the unchanged Webflow markup (the dotted `.path-process` is hidden,
  numbers are a CSS counter). Below 992 the steps bar across the top is the Webflow one.
- Lazy case screenshots must keep their box before they load (`.project-image:has(.hero-image)` in
  `css/custom.css`): without it they are 0px tall, the page grows ~4,500px while scrolling and a step link
  lands screens short. After touching that markup, click a far step on a fresh load and check it lands.
- Fluid headings (2026-11-21, end of `css/custom.css`): display headings use `clamp(rem, rem + vw, rem)`
  from their phone size at 390px to their desktop size at 1600px, overriding Webflow's breakpoint sizes.
  Body text is never scaled (16/18px everywhere: readability depends on absolute size and line length).
  To resize a heading, change its two end sizes there, not the Webflow media queries.
- Dark mode (2026-11-21): one round button in the navbar menu, after "Get in touch" (`.theme-switch`,
  `js/theme.js`; Figma 1491:7579). The page starts in the system's mode; a click flips light <-> dark and the
  pick is remembered from then on (localStorage `theme`). The icon shows the mode on screen and blur-swaps;
  the page cross-fades as in the design system (View Transitions, 400ms ease-in-out). A dropdown with
  System / Light / Dark was tried on 2026-11-22 and dropped as too fiddly for the navbar.
  A one-line script in every page's `<head>` (before the CSS) reads localStorage `theme`, sets `<html data-theme>`
  for an explicit choice and the class `.is-dark` whenever the page is dark, so there is no light flash.
  The dark palette is the `:root.is-dark` block in `css/custom.css` (same variable names); style any dark-only
  fix with `.is-dark …` in the "Dark mode" section. Never write a colour as a literal: use the variables, or
  `rgb(var(--ink-rgb) / a)` for text tones. Literals Webflow left behind are overridden there; Lottie colours
  are recoloured through `[fill="rgb(…)"]` selectors. `tests/states.spec.js` has dark-mode screenshots.
  A new page needs the `<head>` snippet, the switch markup after `.nav-button-wrap` and `js/theme.js`.
- Contact page (2026-11-22, Figma 1502:1585): one rounded hero with Paper's "Warp" shader running live
  (`js/contact-shader.js`, a Warp-only esbuild bundle of `@paper-design/shaders` in `js/vendor/paper-warp.js`)
  over a still of its frame 0 (`images/contact/`), and a frosted card with e-mail, phone and social links.
  The still is what shows under reduced motion, without WebGL and in tests (`window.__stillShader`, set in `tests/fixed-activity.js`). No footer
  on this page, and the old Webflow form is gone (it only worked on Webflow hosting). Shader settings live
  in the script; if they change, re-render the still at 2496x1892 with ShaderMount `frame` 0.
- Case-study step icons (`.icon-block`): all three case studies use Nucleo UI outline-duo icons (RD:IR 2026-11-23,
  Figma 1519:20; mFlota and YouMap 2026-11-24), inline
  SVG with `class="nc-icon"`, an 18px grid drawn at 24px (stroke lands at 2px). Both layers are `currentColor` (the
  soft one at 30%), coloured by `--icon-ink` (#79776d light, #cec3a4 dark). The Nucleo MCP (`nucleo-icons`) finds
  them; icons.json is in `~/.nucleo/skills/ui/`.
- Smooth wheel scrolling (2026-11-24): Lenis 1.3.28 (`js/vendor/lenis.min.js`, MIT) set up in `js/smooth-scroll.js`,
  lerp .12 (light: 95% of a notch in ~0.4 s, at rest by ~0.8 s). `js/site.js` loads both files, with site.js's own `?v=`,
  so no page needs script tags. Wheel and trackpad only: not under reduced motion, not on touch-first devices
  (no fine pointer), not in tests (`window.__noSmoothScroll`), not in a tab opened with `?smooth=0` (for comparing).
  `smoothScrollTo` halts Lenis' momentum first (`window.__lenis`); the open mobile menu stops it. Measured on the
  home page and the three case studies (synthetic wheel): no frame over 14.3 ms. Lenis drives the scroll from the main thread, so re-measure after adding heavy media.
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
