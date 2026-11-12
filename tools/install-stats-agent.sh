#!/bin/bash
# Installs (or reinstalls) the daily stats LaunchAgent for this checkout.
# Uninstall: launchctl bootout gui/$(id -u)/site.portfolio.activity-stats && rm ~/Library/LaunchAgents/site.portfolio.activity-stats.plist
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LABEL=site.portfolio.activity-stats
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
sed -e "s#__REPO__#$REPO#g" -e "s#__HOME__#$HOME#g" "$REPO/tools/launchd/site-stats.plist.template" > "$DEST"
plutil -lint "$DEST" >/dev/null
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "Installed $DEST (daily at 23:30). Log: ~/Library/Logs/site-activity-stats.log"
