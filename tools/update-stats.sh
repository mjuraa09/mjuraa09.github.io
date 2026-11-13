#!/bin/bash
# Daily refresh of the home page activity stats (run by the LaunchAgent in tools/launchd/).
# Rebuilds data/activity.json and, if the numbers changed, commits and pushes ONLY that file.
#
# Safety rules (it runs unattended):
# - only on branch main, and only when local main is exactly in sync with GitHub,
#   so it never pushes anything else that happens to be committed locally;
# - commits nothing but data/activity.json, whatever else is staged or modified.
set -u
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$(dirname "$0")/.." || exit 1
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then log "skip: on branch $branch, not main"; exit 0; fi

if ! git fetch --quiet origin main; then log "skip: git fetch failed (offline?)"; exit 0; fi
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  log "skip: local main and origin/main differ (unpushed or unpulled commits), not touching git"
  exit 0
fi

if ! node tools/activity-stats.mjs; then log "error: stats script failed"; exit 1; fi

if git diff --quiet -- data/activity.json; then log "no change"; exit 0; fi

# Another git process (an editor, the desktop app polling `git status`) can hold .git/index.lock
# for a moment; wait and retry instead of giving up for the day.
committed=0
for attempt in 1 2 3 4 5 6; do
  if out=$(git commit --quiet -m "Update activity stats ($(date '+%Y-%m-%d'))" -- data/activity.json 2>&1); then committed=1; break; fi
  echo "$out"
  echo "$out" | grep -q 'index.lock' || break
  log "git is busy (index.lock), retrying in 5 s"
  sleep 5
done
[ "$committed" = 1 ] || { log "error: commit failed"; exit 1; }
if git push --quiet origin main; then
  log "pushed $(git rev-parse --short HEAD)"
else
  log "error: push failed; the commit stays local and goes out with the next push"
  exit 1
fi
