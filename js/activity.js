// Home page "Activity" section: a GitHub-style heatmap with two sources
// (GitHub contributions / Claude Code prompts) from data/activity.json.
// The section stays hidden if the data can't be loaded.
(function () {
  const section = document.getElementById('activity');
  if (!section) return;

  const MAX_WEEKS = 26;
  const grid = section.querySelector('.activity-grid');
  const months = section.querySelector('.activity-months');
  const stats = section.querySelector('.activity-stats');
  const note = section.querySelector('.activity-note');
  const panel = section.querySelector('.activity-card');
  const tabs = [...section.querySelectorAll('.activity-tab')];
  let sources = null;
  let current = 'github';

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmt = (n) => (n >= 1e6 ? `${Math.round(n / 1e6)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n.toLocaleString('en-US'));
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
          [String(longestStreak(byDay.keys())), 'longest streak (days)'],
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
        note: `Claude Code · since ${monthYear(cc.days[0].d)}`,
        stats: [
          [fmt(cc.days.length), 'days working with Claude Code'],
          [fmt(sum('prompts')), 'prompts'],
          [fmt(sum('input') + sum('output')), 'tokens (without cache)'],
          [String(longestStreak(cc.days.map((e) => e.d))), 'longest streak (days)'],
        ],
      };
    }
    return out;
  }

  // How many week columns fit the heatmap's width (at most MAX_WEEKS).
  function weeksThatFit() {
    const css = getComputedStyle(section);
    const cell = parseFloat(css.getPropertyValue('--cell')) || 22;
    const gap = parseFloat(css.getPropertyValue('--cell-gap')) || 6;
    const days = parseFloat(css.getPropertyValue('--days-col')) || 44;
    const width = section.querySelector('.activity-heatmap').clientWidth - days;
    return Math.max(8, Math.min(MAX_WEEKS, Math.floor((width + gap) / (cell + gap))));
  }

  function render() {
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
        if (d > today) { cells.push('<i data-l="-1"></i>'); continue; }
        const v = src.byDay.get(iso(d)) || 0;
        total += v;
        const when = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        cells.push(`<i data-l="${level(v)}" title="${when}: ${v} ${src.unit}${v === 1 ? '' : 's'}"></i>`);
      }
    }
    grid.innerHTML = cells.join('');
    months.innerHTML = labels.join('');
    grid.setAttribute('aria-label', `${src.label}: ${total.toLocaleString('en-US')} in the last ${weeks} weeks`);
    note.textContent = src.note;
    stats.innerHTML = src.stats
      .map(([value, label]) => `<div class="project-stat"><div class="heading-style-serif-h5 change-2">${value}</div><div class="project-stat-desc">${label}</div></div>`)
      .join('');
  }

  // Both tabs get the card height of the taller one, so switching doesn't make the page jump.
  function lockHeight() {
    panel.style.minHeight = '';
    let max = 0;
    const keep = current;
    for (const s of Object.keys(sources)) { current = s; render(); max = Math.max(max, panel.offsetHeight); }
    current = keep;
    panel.style.minHeight = max + 'px';
  }

  function select(source, focus) {
    if (!sources[source]) return;
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
    render();
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.source));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.source, true);
    });
  });

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
      select(first.dataset.source);
    })
    .catch(() => {});
})();
