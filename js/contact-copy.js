// Contact card: a click on the e-mail or the phone number copies it instead of opening the mail
// or phone app, and a small "Copied" tip pops up above it (role="status", so screen readers hear
// it too). Copies with the Clipboard API, else the old execCommand('copy'); only if both fail
// does the link do what it used to (mailto: / tel:). Styles: "Contact page" in css/custom.css.
(function () {
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        if (!legacyCopy(text)) throw new Error('copy failed');
      });
    }
    return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }

  document.querySelectorAll('.contact-card-email, .contact-card-phone').forEach(function (a) {
    var value = a.textContent.trim();
    var tip = document.createElement('span');
    tip.className = 'copy-tip';
    tip.setAttribute('role', 'status');
    a.appendChild(tip);
    a.title = a.classList.contains('contact-card-email') ? 'Copy e-mail' : 'Copy phone number';
    var timer;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      copy(value).then(function () {
        tip.textContent = 'Copied';
        a.classList.add('is-copied');
        clearTimeout(timer);
        timer = setTimeout(function () { a.classList.remove('is-copied'); }, 1600);
      }, function () { window.location.href = a.href; });
    });
  });
})();
