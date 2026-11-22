// Colour theme: one round button in the navbar (.theme-switch, Figma 1491:7579).
// By default the page follows the system (prefers-color-scheme, live). A click flips the mode
// on screen — light <-> dark — and remembers that pick in localStorage "theme" from then on,
// whatever the system says. <html data-theme> holds the pick and the class .is-dark what is
// shown; each page's <head> applies both before the first paint, so a dark page never flashes
// light. Styles: "Dark mode" and "Theme switch" in css/custom.css.
//
// The change cross-fades the whole page as in the design system's ThemeMenu (View Transitions:
// one composited layer instead of hundreds of colour tweens); the button's sun/moon blur-swaps
// on its own layer. Instant under reduced motion or where the API is missing.
(function () {
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function stored() {
    try { var t = localStorage.getItem('theme'); return t === 'light' || t === 'dark' ? t : null; }
    catch (e) { return null; }
  }
  function shownDark() { return root.classList.contains('is-dark'); }
  function label() {
    var next = shownDark() ? 'light' : 'dark';
    document.querySelectorAll('.theme-switch-trigger').forEach(function (b) {
      b.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    });
  }
  function show(dark) {
    var run = function () { root.classList.toggle('is-dark', dark); label(); };
    if (dark === shownDark()) return;
    if (reduced.matches || !document.startViewTransition) { run(); return; }
    document.startViewTransition(run);
  }

  function toggle() {
    var next = shownDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    show(next === 'dark');
  }

  document.addEventListener('DOMContentLoaded', function () {
    label();
    document.querySelectorAll('.theme-switch').forEach(function (sw) {
      sw.querySelector('.theme-switch-trigger').addEventListener('click', toggle);
      // the icon only animates on a change, not on load
      requestAnimationFrame(function () { requestAnimationFrame(function () { sw.classList.add('is-ready'); }); });
    });
  });

  // Another tab changed it.
  window.addEventListener('storage', function (e) {
    if (e.key !== 'theme') return;
    var t = stored();
    if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    show(t ? t === 'dark' : !!(mq && mq.matches));
  });
  // The system switched (e.g. at sunset) and the visitor has not picked a mode.
  if (mq) {
    var onChange = function () { if (!stored()) show(mq.matches); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();
