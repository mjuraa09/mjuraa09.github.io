// Home page "Activity" section: a GitHub-style heatmap with two sources
// (GitHub contributions / Claude Code prompts) from data/activity.json.
// The section stays hidden if the data can't be loaded.
//
// Switching tabs is animated (timings from the design system's motion scale, see the
// "Activity section" block in css/custom.css): the tab thumb slides, the heatmap cells stay
// in place and recolour, stat numbers roll digit by digit, labels cross-fade in place.
(function () {
  const section = document.getElementById('activity');
  if (!section) return;

  const MAX_WEEKS = 26;
  const ROLL_MS = 900; // --motion-duration-slowest: the digit roll
  const FADE_MS = 150; // --motion-duration-quick: text swap
  const grid = section.querySelector('.activity-grid');
  const months = section.querySelector('.activity-months');
  const stats = section.querySelector('.activity-stats');
  const note = section.querySelector('.activity-note');
  const panel = section.querySelector('.activity-card');
  const tabList = section.querySelector('.activity-tabs');
  const tabs = [...section.querySelectorAll('.activity-tab')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sources = null;
  let current = 'ai';

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmt = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${Math.round(n / 1e6)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n.toLocaleString('en-US'));
  const monthYear = (d) => new Date(d + 'T12:00:00').toLocaleString('en-US', { month: 'short', year: 'numeric' });

  function longestStreak(dates) {
    let best = 0, run = 0, prev = null;
    for (const d of [...dates].sort()) {
      const t = new Date(d + 'T12:00:00');
      run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = t;
    }
    return best;
  }

  // Per-day values -> levels 1..4 by quartiles of the days with any activity.
  function levels(values) {
    const v = [...values].filter((x) => x > 0).sort((a, b) => a - b);
    const q = (p) => v[Math.floor(p * (v.length - 1))] || 1;
    const t = [q(0.25), q(0.5), q(0.75)];
    return (x) => (x <= 0 ? 0 : x <= t[0] ? 1 : x <= t[1] ? 2 : x <= t[2] ? 3 : 4);
  }

  function prepare(data) {
    const out = {};
    const gh = data.github;
    if (gh) {
      const byDay = new Map(gh.days.map((e) => [e.d, e.c]));
      out.github = {
        byDay,
        unit: 'contribution',
        label: 'GitHub contributions',
        note: `github.com/${gh.login} · since ${monthYear(gh.days[0]?.d || data.generatedAt.slice(0, 10))}`,
        stats: [
          [fmt(gh.total), 'contributions on GitHub'],
          [fmt(gh.days.length), 'active days'],
          [fmt(gh.commits ?? 0), 'commits'],
          [`${longestStreak(byDay.keys())} days`, 'longest streak'],
        ],
      };
    }
    const cc = data.claudeCode;
    if (cc && cc.days.length) {
      const byDay = new Map(cc.days.map((e) => [e.d, e.prompts]));
      const sum = (k) => cc.days.reduce((s, e) => s + e[k], 0);
      out.ai = {
        byDay,
        unit: 'prompt',
        label: 'Claude Code prompts',
        note: `AI Agent${cc.favoriteModel ? ` · ${cc.favoriteModel}` : ''} · since ${monthYear(cc.days[0].d)}`,
        stats: [
          [fmt(sum('input') + sum('output')), 'tokens'],
          [fmt(sum('sessions')), 'sessions'],
          [fmt(sum('prompts')), 'messages'],
          [fmt(sum('cacheRead')), 'cache read'],
        ],
      };
    }
    return out;
  }

  // ---------- Text swap: cross-fade in place (no movement, no blur) ----------
  function swapText(el, text) {
    if ((el._to ?? el.textContent) === text) return;
    if (reduceMotion.matches) { clearTimeout(el._swap); el._to = null; el.textContent = text; return; }
    el._to = text;
    el.classList.add('is-swapping');
    clearTimeout(el._swap);
    el._swap = setTimeout(() => {
      el.textContent = el._to;
      el._to = null;
      el.classList.remove('is-swapping');
    }, FADE_MS);
  }

  // ---------- Number ticker: digits roll, keyed by place from the right ----------
  // At rest a value is plain text; while it changes it becomes a row of columns
  // ("1,625" -> 1 , 6 2 5), each digit a vertical 0-9 strip moved by translateY.
  // A column that exists in both values rolls. The unit after the number ("M", "B",
  // " days") is one column that rolls the same way, so it never slides in from the side.
  // A digit column with no counterpart gets its space first and then rises in from below;
  // one that only exists in the old value fades out upward and then gives up its space.
  const widths = new Map(); // character(s) -> advance width in em of the value font
  function charWidth(el, s) {
    if (widths.has(s)) return widths.get(s);
    const m = document.createElement('span');
    m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    m.textContent = s;
    el.appendChild(m);
    const w = m.getBoundingClientRect().width / parseFloat(getComputedStyle(el).fontSize);
    m.remove();
    widths.set(s, w);
    return w;
  }
  const isDigit = (c) => c >= '0' && c <= '9';
  // "7.4B" -> digits "7.4" + unit "B"; "9 days" -> "9" + " days"; "1,642" -> "1,642" + "".
  function tokens(text) {
    const [, num, suffix] = text.match(/^([\d.,]*)([\s\S]*)$/);
    return { cols: [...num].map((ch, i) => ({ pos: num.length - 1 - i, ch })), suffix };
  }
  const cell = (text) => { const c = document.createElement('span'); c.textContent = text; return c; };
  function makeCol(ch, pos) {
    const col = document.createElement('span');
    col.className = 'tk-col';
    const strip = document.createElement('span');
    strip.className = 'tk-strip';
    if (pos >= 0 && isDigit(ch)) {
      for (const d of '0123456789') strip.appendChild(cell(d));
    } else {
      strip.appendChild(cell(ch)); // separator (',' '.') or the unit; rolled by rollUnit
    }
    col.appendChild(strip);
    col._ch = ch;
    col._pos = pos; // -1 = the unit (" days", "M", "B"), always last
    return col;
  }
  // The unit keeps one column and rolls old -> new inside it. Its width jumps straight to
  // whichever label is wider: it is the last column, so nothing to its left moves.
  function rollUnit(el, col, text) {
    if (col._ch === text) return;
    const strip = col.firstElementChild;
    col.style.transition = 'none';
    strip.style.transition = 'none';
    strip.replaceChildren(cell(col._ch), cell(text));
    strip.style.transform = 'translateY(0)';
    col.style.width = Math.max(charWidth(el, col._ch), charWidth(el, text)) + 'em';
    void strip.offsetWidth;
    col.style.transition = '';
    strip.style.transition = '';
    strip.style.transform = 'translateY(calc(-1 * (var(--lh) + var(--tk-gap))))';
    col._ch = text;
  }
  // state: 'rest' (visible), 'in' (start of an entrance: no width, below, transparent)
  // or 'out' (end of an exit: no width, above, transparent).
  const SHIFT = { rest: '0em', in: '.3em', out: '-.3em' };
  function place(el, col, state = 'rest') {
    col.style.width = (state === 'rest' ? charWidth(el, col._ch) : 0) + 'em';
    col.style.opacity = state === 'rest' ? '' : '0';
    const strip = col.firstElementChild;
    const step = col._pos >= 0 && isDigit(col._ch) ? -col._ch : 0;
    strip.style.transform = `translateY(calc(${step} * (var(--lh) + var(--tk-gap)) + ${SHIFT[state]}))`;
  }
  function insertCol(box, col) {
    const after = [...box.children].find((c) => c._pos < col._pos);
    box.insertBefore(col, after || null);
  }
  function exitCol(el, col) {
    col.classList.remove('is-in');
    col.classList.add('is-out');
    place(el, col, 'out');
    setTimeout(() => col.remove(), ROLL_MS);
  }
  function enterCol(el, col) {
    col.classList.add('is-in');
    place(el, col, 'in');
  }
  function settle(el, text) {
    if (el._tk) clearTimeout(el._tk.timer);
    el._tk = null;
    el.textContent = text;
  }
  function roll(el, text) {
    if (reduceMotion.matches) { settle(el, text); return; }
    let tk = el._tk;
    if (!tk) {
      const from = el.textContent;
      if (from === text) return;
      const box = document.createElement('span');
      box.className = 'tk';
      box.setAttribute('aria-hidden', 'true');
      const sr = document.createElement('span');
      sr.className = 'activity-sr';
      tk = el._tk = { box, sr, cols: new Map(), suffix: null };
      const t0 = tokens(from);
      for (const c of t0.cols) { const col = makeCol(c.ch, c.pos); place(el, col); box.appendChild(col); tk.cols.set(c.pos, col); }
      tk.suffix = makeCol(t0.suffix, -1); // always present, even when empty
      place(el, tk.suffix);
      box.appendChild(tk.suffix);
      el.textContent = '';
      el.append(sr, box);
      void box.offsetWidth; // commit the start state before anything moves
    }
    tk.sr.textContent = text;
    const t1 = tokens(text);
    const want = new Map(t1.cols.map((c) => [c.pos, c.ch]));
    for (const [pos, col] of tk.cols) {
      const ch = want.get(pos);
      if (ch !== undefined && (isDigit(ch) ? isDigit(col._ch) : ch === col._ch)) continue;
      exitCol(el, col);
      tk.cols.delete(pos);
    }
    const entering = [];
    for (const c of t1.cols) {
      let col = tk.cols.get(c.pos);
      if (col) { col._ch = c.ch; col.classList.remove('is-in'); place(el, col); continue; }
      col = makeCol(c.ch, c.pos);
      enterCol(el, col);
      insertCol(tk.box, col);
      tk.cols.set(c.pos, col);
      entering.push(col);
    }
    rollUnit(el, tk.suffix, t1.suffix);
    if (entering.length) {
      void tk.box.offsetWidth;
      for (const col of entering) place(el, col);
    }
    clearTimeout(tk.timer);
    tk.timer = setTimeout(() => settle(el, text), ROLL_MS + 50);
  }

  // ---------- Tab thumb: one pill that slides under the selected tab ----------
  // Three layers on the tab list, under the labels: the hover highlight, then the black
  // thumb, then a copy of the labels in white clipped to the thumb. The copy travels with
  // the thumb, so letters turn white exactly as the pill passes over them instead of the
  // whole label changing colour on its own clock.
  let mask = null;
  function buildMask() {
    mask = document.createElement('span');
    mask.className = 'activity-tabs-mask';
    mask.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'activity-tabs-mask-inner';
    for (const t of tabs) {
      const ghost = document.createElement('span');
      ghost.className = 'activity-tab activity-tab-ghost';
      ghost.textContent = t.textContent;
      inner.appendChild(ghost);
      t._ghost = ghost;
    }
    mask.appendChild(inner);
    tabList.appendChild(mask);
  }
  function placeMask() {
    if (!mask) buildMask();
    for (const t of tabs) {
      t._ghost.hidden = t.hidden;
      if (t.hidden) continue;
      const [x, y, w, h] = box(t);
      t._ghost.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    }
  }
  function box(el) {
    const r = el.getBoundingClientRect();
    const b = tabList.getBoundingClientRect();
    return [r.left - b.left, r.top - b.top, r.width, r.height];
  }
  function setVars(prefix, el) {
    const [x, y, w, h] = box(el);
    tabList.style.setProperty(`--${prefix}-x`, x + 'px');
    tabList.style.setProperty(`--${prefix}-y`, y + 'px');
    tabList.style.setProperty(`--${prefix}-w`, w + 'px');
    tabList.style.setProperty(`--${prefix}-h`, h + 'px');
  }
  function placeHover(tab) {
    if (!tab || tab.getAttribute('aria-selected') === 'true') { tabList.classList.remove('is-hovering'); return; }
    setVars('hover', tab);
    tabList.classList.add('is-hovering');
  }
  function placeThumb() {
    const on = tabs.find((t) => t.getAttribute('aria-selected') === 'true' && !t.hidden);
    if (!on) return;
    placeMask();
    // Fractional values (offsetLeft/Width round), so the pill sits exactly where the tab is.
    setVars('thumb', on);
    if (!tabList.classList.contains('has-thumb')) {
      tabList.classList.add('has-thumb');
      requestAnimationFrame(() => requestAnimationFrame(() => tabList.classList.add('thumb-ready')));
    }
  }

  // How many week columns fit the heatmap's width (at most MAX_WEEKS).
  function weeksThatFit() {
    const css = getComputedStyle(section);
    const cell = parseFloat(css.getPropertyValue('--cell')) || 22;
    const gap = parseFloat(css.getPropertyValue('--cell-gap')) || 6;
    const width = section.querySelector('.activity-heatmap').clientWidth;
    return Math.max(8, Math.min(MAX_WEEKS, Math.floor((width + gap) / (cell + gap))));
  }

  // animate: a tab switch. Cells keep their place and only change level; stats roll and fade.
  // Otherwise (first paint, resize, measuring) everything is rebuilt without motion.
  function render(animate = false) {
    const src = sources[current];
    const weeks = weeksThatFit();
    const level = levels(src.byDay.values());
    const today = window.__activityToday ? new Date(window.__activityToday + 'T12:00:00') : new Date(); // pinned in tests
    today.setHours(12, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7); // Monday, `weeks` weeks ago

    const cells = [];
    const labels = [];
    let total = 0;
    for (let w = 0; w < weeks; w++) {
      for (let r = 0; r < 7; r++) {
        const d = new Date(start);
        d.setDate(start.getDate() + w * 7 + r);
        if (r === 0 && d.getDate() <= 7) labels.push(`<span style="grid-column:${w + 1}">${d.toLocaleString('en-US', { month: 'short' })}</span>`);
        if (d > today) { cells.push({ w, l: -1, title: '' }); continue; }
        const v = src.byDay.get(iso(d)) || 0;
        total += v;
        const when = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        cells.push({ w, l: level(v), title: `${when}: ${v} ${src.unit}${v === 1 ? '' : 's'}` });
      }
    }
    if (animate && grid.children.length === cells.length) {
      [...grid.children].forEach((el, i) => {
        el.dataset.l = cells[i].l;
        if (cells[i].title) el.title = cells[i].title;
      });
    } else {
      grid.innerHTML = cells
        .map((c) => `<i data-l="${c.l}" style="--w:${c.w}"${c.title ? ` title="${c.title}"` : ''}></i>`)
        .join('');
      months.innerHTML = labels.join('');
    }
    grid.setAttribute('aria-label', `${src.label}: ${total.toLocaleString('en-US')} in the last ${weeks} weeks`);

    if (animate && stats.children.length === src.stats.length) {
      [...stats.children].forEach((tile, i) => {
        roll(tile.firstElementChild, src.stats[i][0]);
        swapText(tile.lastElementChild, src.stats[i][1]);
      });
      swapText(note, src.note);
    } else {
      clearTimeout(note._swap);
      note._to = null;
      note.classList.remove('is-swapping');
      note.textContent = src.note;
      stats.innerHTML = src.stats
        .map(([value, label]) => `<div class="activity-stat"><div class="activity-stat-value">${value}</div><div class="activity-stat-label">${label}</div></div>`)
        .join('');
    }
  }

  // Both tabs get the card height of the taller one and, row by row, the stat tile heights
  // of the taller one, so switching tabs never moves the page or the numbers.
  function lockHeight() {
    panel.style.minHeight = '';
    stats.style.gridTemplateRows = '';
    let max = 0;
    const rows = [];
    const keep = current;
    for (const s of Object.keys(sources)) {
      current = s;
      render();
      max = Math.max(max, panel.offsetHeight);
      const tops = [...new Set([...stats.children].map((t) => t.offsetTop))].sort((a, b) => a - b);
      for (const t of stats.children) {
        const r = tops.indexOf(t.offsetTop);
        rows[r] = Math.max(rows[r] || 0, t.getBoundingClientRect().height);
      }
    }
    current = keep;
    stats.style.gridTemplateRows = rows.map((h) => `minmax(${h}px, auto)`).join(' ');
    panel.style.minHeight = max + 'px';
  }

  function select(source, focus, animate = true) {
    if (!sources[source]) return;
    const changed = source !== current;
    current = source;
    for (const t of tabs) {
      const on = t.dataset.source === source;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        panel.setAttribute('aria-labelledby', t.id);
        if (focus) t.focus();
      }
    }
    placeThumb();
    placeHover(tabs.find((t) => t.matches(':hover')));
    render(animate && changed);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('pointerenter', () => placeHover(t));
    t.addEventListener('click', () => select(t.dataset.source));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.source, true);
    });
  });
  tabList.addEventListener('pointerleave', () => tabList.classList.remove('is-hovering'));

  // Re-fit on width changes only (mobile browsers fire resize while scrolling).
  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!sources || window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      lockHeight();
      render();
      placeThumb();
    }, 150);
  });

  fetch('data/activity.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      sources = prepare(data);
      tabs.forEach((t) => { if (!sources[t.dataset.source]) t.hidden = true; });
      const first = tabs.find((t) => !t.hidden);
      if (!first) return;
      section.hidden = false;
      current = first.dataset.source;
      lockHeight();
      select(first.dataset.source, false, false);
      // The stat numbers use a web font that only starts loading once they are on the page;
      // measure again with it, or the heights (and the ticker's digit widths) use the fallback font.
      if (document.fonts && document.fonts.load) {
        document.fonts.load("600 40px 'Copernicus Semibold'").then(() => document.fonts.ready).then(() => {
          widths.clear();
          lockHeight();
          render();
          placeThumb();
        });
      }
    })
    .catch(() => {});
})();
