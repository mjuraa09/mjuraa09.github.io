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

// Smooth "back to top"
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('.scroll-top-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const start = window.scrollY;
      const duration = 1400;
      let startTime = null;
      function easeInOutCubic(t) {
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
      function scrollStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percent = Math.min(progress / duration, 1);
        const eased = easeInOutCubic(percent);
        window.scrollTo(0, start * (1 - eased));
        if (progress < duration) {
          requestAnimationFrame(scrollStep);
        }
      }
      requestAnimationFrame(scrollStep);
    });
  });
});

// Case studies: scrollspy for the steps navigation (no-op on other pages)
document.addEventListener('DOMContentLoaded', function() {
  const tabsContainer = document.querySelector('.steps-process');
  const tabs = document.querySelectorAll('.work-bottom-item');
  const sections = document.querySelectorAll('[data-section]');
  if (!tabsContainer || tabs.length === 0 || sections.length === 0) {
    return;
  }
  let currentActive = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.getAttribute('data-section');
        if (sectionId === currentActive) return;
        currentActive = sectionId;
        // Reset – usuń w--current ze wszystkich tabów
        tabs.forEach(tab => tab.classList.remove('w--current'));
        // Dodaj w--current do aktywnego taba
        const activeTab = document.querySelector(`[data-tab="${sectionId}"]`);
        if (activeTab) {
          activeTab.classList.add('w--current');
          // Przewiń kontener tabów – aktywny tab do lewej
          const containerRect = tabsContainer.getBoundingClientRect();
          const tabRect = activeTab.getBoundingClientRect();
          const scrollOffset = tabRect.left - containerRect.left + tabsContainer.scrollLeft - 20;
          tabsContainer.scrollTo({
            left: scrollOffset,
            behavior: 'smooth'
          });
        }
      }
    });
  }, {
    rootMargin: '-30% 0px -60% 0px',
    threshold: 0
  });
  sections.forEach(section => observer.observe(section));
});
