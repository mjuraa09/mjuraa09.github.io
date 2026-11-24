// Smooth wheel scrolling with Lenis (js/vendor/lenis.min.js, MIT), on since 2026-11-24.
// Loaded by js/site.js, which also decides when not to (reduced motion, touch-first devices,
// visual tests, a tab opened with ?smooth=0).
//
// - Mouse wheel and trackpad only. Touch keeps the browser's own scrolling (syncTouch off).
// - Light: lerp .12 (Lenis' default is .1), so the page settles ~0.2-0.3 s after the wheel stops.
//   Lower = floatier, higher = closer to native. Measured 2026-11-24 on every page (75 Hz screen,
//   60 wheel notches): no frame over 14.3 ms, none over 20 ms.
// - Keyboard (arrows, space, Page Down), Ctrl+F and scrollbar drags stay native.
// - A box that scrolls on its own keeps the wheel in its direction (allowNestedScroll): today only
//   the case-study steps bar <=991, sideways; a vertical wheel over it still moves the page.
// - The open mobile menu stops it, so the page under the menu doesn't move.
// - smoothScrollTo() in js/site.js (steps, back to top) runs the page's own glide; it first
//   halts Lenis' momentum through window.__lenis, so the two never pull against each other.
(function () {
  if (typeof Lenis !== 'function') return;
  const lenis = new Lenis({
    lerp: 0.12,
    smoothWheel: true,
    syncTouch: false,
    allowNestedScroll: true,
    autoRaf: true,
  });
  window.__lenis = lenis;

  // Webflow's navbar marks its menu button .w--open while the menu is open.
  const buttons = document.querySelectorAll('.w-nav-button');
  const sync = () => {
    const open = [...buttons].some((b) => b.classList.contains('w--open'));
    if (open) lenis.stop(); else lenis.start();
  };
  const watch = new MutationObserver(sync);
  buttons.forEach((b) => watch.observe(b, { attributes: true, attributeFilter: ['class'] }));
})();
