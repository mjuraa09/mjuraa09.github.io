// Colour theme switch: System / Light / Dark (Figma 1491:7579 closed, 1491:9250 open).
// The choice lives in localStorage "theme" ("light" | "dark"; nothing = follow the system) and
// becomes <html data-theme>, plus the class .is-dark whenever the page is dark. Each page's <head>
// applies both before the first paint, so a dark page never flashes light. Styles: "Dark mode"
// and "Theme switch" in css/custom.css.
//
// The button opens a vertical menu over itself (.is-open). Picking a mode updates the button's
// icon, closes the menu, and — when the page actually turns light/dark — the new theme spreads
// from the switch as a circle (View Transitions; an instant swap where unsupported or with
// reduced motion).
(function () {
  var root = document.documentElement;
  var order = ['system', 'light', 'dark'];
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function stored() {
    try { var t = localStorage.getItem('theme'); return t === 'light' || t === 'dark' ? t : 'system'; }
    catch (e) { return 'system'; }
  }
  function isDark(choice) { return choice === 'dark' || (choice === 'system' && !!mq && mq.matches); }
  function setRoot(choice) {
    if (choice === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', choice);
    root.classList.toggle('is-dark', isDark(choice));
  }
  function save(choice) {
    try { if (choice === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', choice); } catch (e) {}
  }
  function sync(choice) {
    document.querySelectorAll('.theme-switch').forEach(function (sw) {
      sw.setAttribute('data-current', choice);
      var trigger = sw.querySelector('.theme-switch-trigger');
      if (trigger) trigger.setAttribute('aria-label', 'Colour theme: ' + choice.charAt(0).toUpperCase() + choice.slice(1));
      sw.querySelectorAll('[data-theme-value]').forEach(function (b) {
        var on = b.getAttribute('data-theme-value') === choice;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
    });
  }

  // Theme change: a circle of the new theme grows from the switch.
  function apply(choice, from) {
    var change = isDark(choice) !== root.classList.contains('is-dark');
    var run = function () { setRoot(choice); };
    save(choice);
    sync(choice);
    if (!change || reduced.matches || !document.startViewTransition || !from) { run(); return; }
    var r = from.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var t = document.startViewTransition(run);
    t.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
  }

  function open(sw, focusChoice) {
    sw.classList.add('is-open');
    sw.querySelector('.theme-switch-trigger').setAttribute('aria-expanded', 'true');
    if (focusChoice) {
      var b = sw.querySelector('[data-theme-value="' + stored() + '"]');
      if (b) setTimeout(function () { b.focus(); }, 60);
    }
  }
  function close(sw, refocus) {
    if (!sw.classList.contains('is-open')) return;
    sw.classList.remove('is-open');
    var trigger = sw.querySelector('.theme-switch-trigger');
    trigger.setAttribute('aria-expanded', 'false');
    if (refocus) trigger.focus();
  }

  document.addEventListener('DOMContentLoaded', function () {
    sync(stored());
    document.querySelectorAll('.theme-switch').forEach(function (sw) {
      var trigger = sw.querySelector('.theme-switch-trigger');
      trigger.addEventListener('click', function () {
        if (sw.classList.contains('is-open')) close(sw, false);
        else open(sw, false);
      });
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(sw, true); }
      });
      sw.querySelector('.theme-switch-menu').addEventListener('click', function (e) {
        var b = e.target.closest('[data-theme-value]');
        if (!b) return;
        apply(b.getAttribute('data-theme-value'), trigger);
        // let the pick register in the menu before it rolls back up
        setTimeout(function () { close(sw, e.detail === 0); }, 160);
      });
      // Radio-group keys inside the menu: arrows move the choice, Escape closes.
      sw.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(sw, true); return; }
        if (!sw.classList.contains('is-open') || e.target === trigger) return;
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = order[(order.indexOf(stored()) + d + order.length) % order.length];
        apply(next, trigger);
        var b = sw.querySelector('[data-theme-value="' + next + '"]');
        if (b) b.focus();
      });
      // Close when the pointer or focus goes elsewhere.
      document.addEventListener('pointerdown', function (e) { if (!sw.contains(e.target)) close(sw, false); });
      sw.addEventListener('focusout', function (e) { if (e.relatedTarget && !sw.contains(e.relatedTarget)) close(sw, false); });
    });
  });

  // Another tab changed it.
  window.addEventListener('storage', function (e) {
    if (e.key !== 'theme') return;
    var c = stored();
    setRoot(c);
    sync(c);
  });
  // The system switched (e.g. at sunset) while "System" is chosen.
  if (mq) {
    var onChange = function () { if (stored() === 'system') setRoot('system'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();
