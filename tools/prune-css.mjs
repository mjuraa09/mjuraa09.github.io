// Removes CSS selectors that reference a class used nowhere on the site.
// A class counts as "used" if it is in any HTML class attribute or appears as a word
// anywhere in the site's JavaScript (webflow.js interactions, custom scripts, inline scripts).
// That is deliberately conservative: when in doubt, the rule stays.
//
// Usage: node tools/prune-css.mjs [--write] css/file.css [...]
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const args = process.argv.slice(2);
const write = args.includes('--write');
const files = args.filter((a) => !a.startsWith('--'));

const html = globSync(['*.html', 'projects/*.html']).map((f) => readFileSync(f, 'utf8'));
const js = globSync(['js/**/*.js']).map((f) => readFileSync(f, 'utf8'));

const used = new Set();
for (const page of html) {
  for (const m of page.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
  for (const m of page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) js.push(m[1]);
}
const jsWords = new Set(js.join('\n').match(/[A-Za-z_][\w-]*/g));

// Webflow runtime classes are often built at runtime ("w-mod-" + "touch", "w--" + state),
// so for `w-` classes keep the whole component family (w-nav-*, w-form-*, ...) when any
// member of it appears in the HTML; only families the site never uses get pruned.
const family = (cls) => cls.split('-').slice(0, 2).join('-');
const usedFamilies = new Set([...used].filter((c) => c.startsWith('w-')).map(family));

const isUsed = (cls) =>
  used.has(cls) ||
  jsWords.has(cls) ||
  /^w-mod-|^w--|^w-ix/.test(cls) ||
  (cls.startsWith('w-') && usedFamilies.has(family(cls)));

function classesRequired(sel) {
  // Classes a selector needs on the page; classes inside :not() are not required.
  const out = [];
  sel.walkClasses((c) => {
    let p = c.parent;
    while (p) {
      if (p.type === 'pseudo' && p.value === ':not') return;
      p = p.parent;
    }
    out.push(c.value);
  });
  return out;
}

for (const file of files) {
  const css = readFileSync(file, 'utf8');
  const root = postcss.parse(css);
  let removedSelectors = 0;
  let removedRules = 0;
  const removedClasses = new Set();

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const kept = [];
    selectorParser((sels) => {
      sels.each((sel) => {
        const missing = classesRequired(sel).filter((c) => !isUsed(c));
        if (missing.length) {
          removedSelectors++;
          missing.forEach((c) => removedClasses.add(c));
        } else kept.push(sel.toString().trim());
      });
    }).processSync(rule.selector);
    if (kept.length === 0) {
      rule.remove();
      removedRules++;
    } else if (kept.length !== rule.selectors.length) {
      rule.selector = kept.join(', ');
    }
  });
  // Drop @media blocks left empty.
  root.walkAtRules('media', (at) => {
    if (!at.nodes?.length) at.remove();
  });

  const out = root.toString();
  console.log(
    `${file}: ${removedRules} rules, ${removedSelectors} selectors removed; ` +
      `${css.length} -> ${out.length} bytes (${removedClasses.size} unused classes)`
  );
  if (process.env.VERBOSE) console.log([...removedClasses].sort().join(' '));
  if (write) writeFileSync(file, out);
}
