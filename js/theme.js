// Colour theme switch: System / Light / Dark.
// The choice lives in localStorage "theme" ("light" | "dark"; nothing = follow the system) and
// becomes <html data-theme>, plus the class .is-dark whenever the page is dark. Each page's <head>
// applies both before the first paint, so a dark page never flashes light. Styles: "Dark mode" in css/custom.css.
(function () {
  var root = document.documentElement;
  var order = ['system', 'light', 'dark'];
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // .is-dark on <html> is what the styles key on: the explicit choice, or the system's.
  function resolve(choice) {
    root.classList.toggle('is-dark', choice === 'dark' || (choice === 'system' && !!mq && mq.matches));
  }

  function stored() {
    try { var t = localStorage.getItem('theme'); return t === 'light' || t === 'dark' ? t : 'system'; }
    catch (e) { return 'system'; }
  }
  function apply(choice) {
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    resolve(choice);
    try {
      if (choice === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', choice);
    } catch (e) {}
    sync(choice);
  }
  function sync(choice) {
    document.querySelectorAll('.theme-switch').forEach(function (sw) {
      sw.style.setProperty('--ts-index', order.indexOf(choice));
      sw.querySelectorAll('button[data-theme-value]').forEach(function (b) {
        var on = b.getAttribute('data-theme-value') === choice;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    sync(stored());
    document.querySelectorAll('.theme-switch').forEach(function (sw) {
      sw.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-theme-value]');
        if (b) apply(b.getAttribute('data-theme-value'));
      });
      // Radio-group keys: arrows move the choice.
      sw.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = order[(order.indexOf(stored()) + d + order.length) % order.length];
        apply(next);
        var b = sw.querySelector('[data-theme-value="' + next + '"]');
        if (b) b.focus();
      });
      requestAnimationFrame(function () { sw.classList.add('is-ready'); });
    });
  });
  // Another tab changed it.
  window.addEventListener('storage', function (e) {
    if (e.key !== 'theme') return;
    var c = stored();
    if (c === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', c);
    resolve(c);
    sync(c);
  });
  // The system switched (e.g. at sunset) while "System" is chosen.
  if (mq) {
    var onChange = function () { if (stored() === 'system') resolve('system'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();
