// Case study, alternative layout (pages with <body class="case-alt">, see css/case-alt.css).
// Two things CSS can't do alone: the galleries' counter and arrows, and the reading-progress
// line on the steps rail. Everything works without this file: galleries still swipe, and
// the current step is still highlighted by js/site.js.
document.addEventListener('DOMContentLoaded', function () {
  if (!document.body.classList.contains('case-alt')) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');

  // ---- Galleries ----
  const arrow = (d) => '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="' + d + '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.querySelectorAll('.case-gallery').forEach((gallery) => {
    const track = gallery.querySelector('.case-gallery-track');
    const slides = track ? Array.from(track.children) : [];
    if (slides.length < 2) return;
    track.tabIndex = 0; // arrow keys scroll it once focused
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', 'Gallery, ' + slides.length + ' items');

    const nav = document.createElement('div');
    nav.className = 'case-gallery-nav';
    nav.innerHTML = '<div class="case-gallery-count" aria-live="polite"><b>01</b> / ' + pad(slides.length) + '</div>' +
      '<div class="case-gallery-buttons">' +
      '<button type="button" class="case-gallery-btn" aria-label="Previous">' + arrow('M10 3 5 8l5 5') + '</button>' +
      '<button type="button" class="case-gallery-btn" aria-label="Next">' + arrow('m6 3 5 5-5 5') + '</button></div>';
    gallery.appendChild(nav);
    const count = nav.querySelector('b');
    const [prev, next] = nav.querySelectorAll('button');

    let index = 0;
    function update() {
      const max = track.scrollWidth - track.clientWidth;
      const x = track.scrollLeft;
      // At the far end the last slide can't reach the left edge, so the end means "last".
      index = x >= max - 2 ? slides.length - 1 : slides.reduce((best, s, i) =>
        Math.abs(s.offsetLeft - track.offsetLeft - x) < Math.abs(slides[best].offsetLeft - track.offsetLeft - x) ? i : best, 0);
      count.textContent = pad(index + 1);
      prev.disabled = x <= 2;
      next.disabled = x >= max - 2;
    }
    function go(i) {
      const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
      track.scrollTo({ left: s.offsetLeft - track.offsetLeft, behavior: reduced.matches ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', () => go(index - 1));
    next.addEventListener('click', () => go(index + 1));
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    update();
  });

  // ---- Reading progress on the steps rail (desktop sidebar) ----
  // The line ends inside the current step's row, as far down it as the page is through that
  // section, measured at the same height js/site.js switches steps (30% of the viewport).
  const list = document.querySelector('.steps-process');
  const desktop = window.matchMedia('(min-width: 992px)');
  if (!list) return;
  const pairs = Array.from(list.querySelectorAll('.work-bottom-item')).map((tab) => ({
    tab: tab,
    section: document.querySelector('[data-section="' + tab.getAttribute('data-tab') + '"]'),
  })).filter((p) => p.section);
  if (!pairs.length) return;
  let queued = false;
  function progress() {
    queued = false;
    if (!desktop.matches) return;
    const line = window.innerHeight * 0.3;
    let y = 0;
    for (const p of pairs) {
      const r = p.section.getBoundingClientRect();
      if (r.top > line) break;
      const f = Math.max(0, Math.min(1, (line - r.top) / r.height));
      y = p.tab.offsetTop + p.tab.offsetHeight * f;
    }
    list.style.setProperty('--case-progress', y.toFixed(1) + 'px');
  }
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(progress);
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  queue();
});
