// The home page activity section draws data/activity.json relative to today's date,
// so screenshots would change every day and after every `npm run stats`.
// Tests serve a frozen copy of the data and pin the section's "today"
// (only the section's date: freezing the whole page clock would stall Webflow's animations).
export async function freezeActivity(page) {
  await page.route('**/data/activity.json', (route) => route.fulfill({ path: 'tests/fixtures/activity.json' }));
  await page.addInitScript(() => { window.__activityToday = '2026-11-12'; });
}
