// Navbar logo: "Mateusz J." folds to "Mat J." once the page scrolls past 16px, and unfolds at
// the top. The letters and the space they free move together: each letter's own width
// (--w, measured here) animates to 0 while it fades and blurs, so "J." slides in as the
// letters go, instead of a letter vanishing first and the gap closing afterwards.
// Styles: "Navbar logo fold" in css/custom.css.
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  var letters = Array.prototype.slice.call(nav.querySelectorAll('.logo-letters .letter.opacity-30'));
  var n = letters.length;

  // Exact widths (scrollWidth still reports the full width while folded to 0).
  function measure() {
    letters.forEach(function (el, i) {
      el.style.setProperty('--w', Math.ceil(el.scrollWidth) + 'px');
      el.style.setProperty('--i', i);         // 0 = "e" ... 3 = "z"
      el.style.setProperty('--ri', n - 1 - i); // reversed order
    });
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('resize', measure);
  // The first measurement is in place before the transitions are switched on, so the logo
  // never animates from the fallback width on load.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { nav.classList.add('logo-fold-ready'); });
  });

  var threshold = 16;
  function update() {
    nav.classList.toggle('nav-logo-collapsed', window.scrollY > threshold);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('load', update);
  update();
})();
