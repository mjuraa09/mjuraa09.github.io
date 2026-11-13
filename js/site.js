// Site-wide behaviour (moved from inline scripts).

// Reveal sections once the page is ready.
// Starts as soon as the HTML is parsed and the fonts are in (so text doesn't jump),
// instead of waiting for every image, video and animation file ("load").
// Safety nets: at most 1.5s of waiting for fonts, and "load" as a fallback.
(function () {
  let started = false;
  function reveal() {
    if (started) return;
    started = true;
    document.body.classList.add("loaded");
    const sections = document.querySelectorAll('.reveal-section');
    sections.forEach((section, index) => {
      setTimeout(() => {
        section.classList.add('is-visible');
        // Po zakończeniu animacji - usuń filter całkowicie (fix dla backdrop-filter)
        setTimeout(() => {
          section.classList.add('animation-done');
        }, 900);
      }, 150 * index);
    });
  }
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const maxWait = new Promise((resolve) => setTimeout(resolve, 1500));
  const domReady = document.readyState === "loading"
    ? new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
    : Promise.resolve();
  domReady.then(() => Promise.race([fontsReady, maxWait])).then(reveal);
  window.addEventListener("load", reveal);
})();

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// One scroll for the whole site: the back-to-top button and the case-study steps.
// The duration barely grows with the distance and tops out at 700ms, so jumping the length
// of a case study feels like a move rather than a tour. (Webflow's own anchor scroll runs
// 472*ln(d+125)-2000 ms — about 2.4s across a case study; the browser's native smooth scroll
// is ~1.8s there.) The curve is the design system's `smooth-out`, which for a scroll means
// it leaves quickly and sets down gently. A wheel or a finger cancels it, so the page never
// fights someone who decided to scroll themselves.
function smoothScrollTo(top, done) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  top = Math.max(0, Math.min(Math.round(top), max));
  const start = window.scrollY;
  const dist = top - start;
  const finish = () => { if (done) done(); };
  if (reducedMotion() || Math.abs(dist) < 2) { window.scrollTo(0, top); finish(); return; }
  const duration = Math.min(700, Math.max(300, Math.abs(dist) * 0.06));
  const ease = (t) => 1 - Math.pow(1 - t, 5); // cubic-bezier(.22,1,.36,1), the DS's smooth-out
  const events = ['wheel', 'touchstart'];
  let startTime = null;
  let stopped = false;
  function cleanup() { events.forEach((ev) => window.removeEventListener(ev, cancel)); }
  function cancel() { stopped = true; cleanup(); finish(); }
  events.forEach((ev) => window.addEventListener(ev, cancel, { passive: true }));
  function step(now) {
    if (stopped) return;
    if (startTime === null) startTime = now;
    const p = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, Math.round(start + dist * ease(p)));
    if (p < 1) { requestAnimationFrame(step); return; }
    cleanup();
    finish();
  }
  requestAnimationFrame(step);
}

// Back to top.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.scroll-top-btn').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      smoothScrollTo(0);
    });
  });
});

// Case studies: the steps navigation (no-op on other pages).
// Clicking a step scrolls with the browser's own smooth scroll instead of Webflow's, whose
// duration grows with the distance (472*ln(d+125)-2000 ms — ~2.7 s from the end of the page
// to the top), and freezes the scrollspy until the scroll settles, so the highlight lands on
// the step you picked rather than flicking through every one it passes.
document.addEventListener('DOMContentLoaded', function () {
  const tabsContainer = document.querySelector('.steps-process');
  const tabs = document.querySelectorAll('.work-bottom-item');
  const sections = document.querySelectorAll('[data-section]');
  if (!tabsContainer || tabs.length === 0 || sections.length === 0) return;

  let currentActive = null;
  let locked = false;
  let unlockTimer = null;

  function highlight(sectionId) {
    if (sectionId === currentActive) return;
    currentActive = sectionId;
    tabs.forEach((tab) => tab.classList.remove('w--current'));
    const activeTab = document.querySelector(`[data-tab="${sectionId}"]`);
    if (!activeTab) return;
    activeTab.classList.add('w--current');
    // Keep the active step in view in the strip (it scrolls sideways on narrow screens).
    const offset = activeTab.getBoundingClientRect().left - tabsContainer.getBoundingClientRect().left + tabsContainer.scrollLeft - 20;
    tabsContainer.scrollTo({ left: offset, behavior: 'smooth' });
  }

  const observer = new IntersectionObserver((entries) => {
    if (locked) return;
    entries.forEach((entry) => {
      if (entry.isIntersecting) highlight(entry.target.getAttribute('data-section'));
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
  sections.forEach((section) => observer.observe(section));

  // Webflow's anchor scroll is bound on `document`; the navbar's own "close the mobile menu"
  // handler is bound on this .w-nav-menu. Listening here and stopping the event lets the menu
  // still close while Webflow's scroll never runs.
  const menu = tabsContainer.closest('.w-nav-menu') || tabsContainer;
  menu.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('.work-bottom-item');
    if (!link || !menu.contains(link)) return;
    const hash = link.getAttribute('href') || '';
    const target = hash.startsWith('#') && document.getElementById(hash.slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();

    highlight(target.getAttribute('data-section'));
    locked = true;
    clearTimeout(unlockTimer);
    const unlock = () => { locked = false; };
    // scroll-margin-top on the section keeps it clear of the sticky bars.
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - margin, () => {
      // Let the observer catch up on the landing before it may overrule the highlight.
      unlockTimer = setTimeout(unlock, 60);
    });
    if (history.pushState) history.pushState(null, '', hash);
  });
});
