// Builds data/activity.json for the "activity" section on the home page.
// Usage: npm run stats
//
// Two sources, both reduced to per-day numbers only (no project names, no text):
// - Claude Code: the session transcripts in ~/.claude/projects (token counts per reply,
//   your prompts, sessions). Only on this machine, so this script runs locally.
// - GitHub: the contribution calendar of the account `gh` is logged in as.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'activity.json');
const PROJECTS = join(homedir(), '.claude', 'projects');

// Local calendar day (the site shows days as you lived them, not in UTC).
const day = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function* jsonlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* jsonlFiles(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}

// A prompt typed by you: a user record with real text, not a tool result,
// not a slash-command echo or other system-injected content.
function isPrompt(o) {
  if (o.type !== 'user' || o.isMeta || o.isSidechain) return false;
  const c = o.message?.content;
  const text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x) => x?.type === 'text').map((x) => x.text).join('') : '';
  if (!text.trim()) return false;
  if (Array.isArray(c) && c.some((x) => x?.type === 'tool_result')) return false;
  return !/^\s*<(command-|local-command|system-reminder|task-notification|bash-)/.test(text);
}

const modelFamily = (m = '') => (m.match(/claude-(opus|sonnet|haiku|fable)/) || [])[1] || null;

async function claudeCode() {
  const days = new Map(); // date -> { prompts, sessions:Set, input, output, cacheWrite, cacheRead }
  const models = {};
  const seen = new Set(); // one reply is logged once per content block; count its usage once
  const get = (d) => {
    if (!days.has(d)) days.set(d, { prompts: 0, sessions: new Set(), input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
    return days.get(d);
  };
  for await (const file of jsonlFiles(PROJECTS)) {
    const text = await readFile(file, 'utf8').catch(() => '');
    for (const line of text.split('\n')) {
      if (!line) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (!o.timestamp) continue;
      const d = day(o.timestamp);
      if (isPrompt(o)) { const e = get(d); e.prompts++; e.sessions.add(o.sessionId); }
      if (o.type === 'assistant' && o.message?.usage) {
        const key = `${o.message.id}:${o.requestId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const u = o.message.usage, e = get(d);
        e.input += u.input_tokens || 0;
        e.output += u.output_tokens || 0;
        e.cacheWrite += u.cache_creation_input_tokens || 0;
        e.cacheRead += u.cache_read_input_tokens || 0;
        if (!o.isSidechain) e.sessions.add(o.sessionId);
        const fam = modelFamily(o.message.model);
        if (fam) models[fam] = (models[fam] || 0) + 1;
      }
    }
  }
  const out = [...days.entries()]
    .map(([d, e]) => ({ d, prompts: e.prompts, sessions: e.sessions.size, input: e.input, output: e.output, cacheWrite: e.cacheWrite, cacheRead: e.cacheRead }))
    .filter((e) => e.prompts || e.output)
    .sort((a, b) => a.d.localeCompare(b.d));
  return { days: out, models };
}

function github() {
  try {
    const q = 'query{viewer{login contributionsCollection{totalCommitContributions contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
    const res = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', `query=${q}`], { encoding: 'utf8' }));
    const v = res.data.viewer, cal = v.contributionsCollection.contributionCalendar;
    const days = cal.weeks.flatMap((w) => w.contributionDays).filter((x) => x.contributionCount > 0).map((x) => ({ d: x.date, c: x.contributionCount }));
    return { login: v.login, total: cal.totalContributions, commits: v.contributionsCollection.totalCommitContributions, days };
  } catch (e) {
    console.warn('GitHub skipped:', e.message.split('\n')[0]);
    return null;
  }
}

const previous = JSON.parse(await readFile(OUT, 'utf8').catch(() => 'null'));
const data = { generatedAt: new Date().toISOString(), claudeCode: await claudeCode(), github: github() };
// If GitHub can't be reached (offline, gh logged out), keep the last known calendar
// instead of dropping the GitHub tab from the site.
if (!data.github && previous?.github) data.github = previous.github;
// Nothing new: keep the old timestamp so the file (and git) stay untouched.
if (previous && JSON.stringify({ ...previous, generatedAt: 0 }) === JSON.stringify({ ...data, generatedAt: 0 })) data.generatedAt = previous.generatedAt;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(data) + '\n');

const cc = data.claudeCode.days;
const sum = (k) => cc.reduce((s, e) => s + e[k], 0);
console.log(`Claude Code: ${cc.length} active days (${cc[0]?.d} → ${cc.at(-1)?.d}), ${sum('prompts')} prompts, ` +
  `${(sum('input') + sum('output')) / 1e6 | 0}M tokens without cache, ${(sum('cacheRead') + sum('cacheWrite')) / 1e9 | 0}B cache`);
if (data.github) console.log(`GitHub (${data.github.login}): ${data.github.total} contributions on ${data.github.days.length} days`);
console.log(`Wrote ${OUT}`);
