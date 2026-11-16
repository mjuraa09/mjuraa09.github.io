import { chromium, webkit } from '@playwright/test';
const pages = ['rdir-fintech-copy', 'mflota-ecommerce', 'youmap-socialmedia'];
async function run(label, type, simulateOldIphone) {
  const b = await type.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (simulateOldIphone) {
    // An older iPhone answers canPlayType("video/webm; codecs=vp9") with "" and skips that source.
    await ctx.route('**/projects/*.html', async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replaceAll(`type='video/webm; codecs="vp9"'`, 'type="video/x-not-supported"');
      await route.fulfill({ response: res, body });
    });
  }
  let webm = 0, mp4 = 0, playing = 0, total = 0;
  for (const f of pages) {
    const p = await ctx.newPage();
    p.on('request', (r) => { if (r.url().endsWith('.webm')) webm++; if (r.url().endsWith('.mp4')) mp4++; });
    await p.goto('http://localhost:8080/projects/' + f + '.html');
    await p.waitForTimeout(1200);
    const r = await p.evaluate(async () => {
      let ok = 0, n = 0, srcs = new Set();
      for (const v of document.querySelectorAll('video')) {
        n++; v.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 350));
        if (v.paused) { try { await v.play(); } catch (e) {} }
        const t0 = v.currentTime; await new Promise((r) => setTimeout(r, 800));
        if (!v.paused && v.currentTime > t0) ok++;
        srcs.add(v.currentSrc.split('.').pop());
      }
      return { ok, n, srcs: [...srcs] };
    });
    playing += r.ok; total += r.n;
    await p.close();
  }
  console.log(label.padEnd(36), `playing ${playing}/${total} | .webm requests ${webm} | .mp4 requests ${mp4}`);
  await b.close();
}
await run('Chromium (Chrome, Android)', chromium, false);
await run('WebKit (current Safari / iPhone)', webkit, false);
await run('WebKit without WebM (older iPhone)', webkit, true);
