const puppeteer = require('/workspace/github__midrender_revideo/node_modules/puppeteer');
const exe = '/home/appuser/.cache/hyperframes/chrome/chrome-headless-shell/linux-158.0.8127.36/chrome-headless-shell-linux64/chrome-headless-shell';
const url = 'file:///workspace/github__kobikishansl-tech__videos/rickclone/stickman-short/index.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: exe, headless: 'shell',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--window-size=1080,1920', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  const t = parseFloat(process.argv[2] || '9');
  const frames = [page.mainFrame(), ...page.frames()];
  let frame = null;
  for (const f of frames) { if (await f.evaluate(() => !!(window.__short && window.__short.story)) .catch(() => false)) { frame = f; break; } }
  if (!frame) { console.log(JSON.stringify({ err: 'no frame with __short', n: frames.length })); await browser.close(); return; }
  const out = await frame.evaluate((t) => {
    const S = window.__short;
    if (!S || !S.story || !S.story.cast) return { err: 'no __short' };
    const stage = S.stage, cam = stage.camera;
    tlset: {
      const tl = window.__timelines && (window.__timelines['short'] || window.__timelines['main']);
      if (tl) { tl.time(t, false); }
    }
    stage.renderAt(t);
    const V = new (Object.getPrototypeOf(cam.position).constructor)();
    const proj = (p) => { V.set(p[0], p[1], p[2]); cam.updateMatrixWorld(); V.project(cam); return [Math.round((V.x * 0.5 + 0.5) * 1080), Math.round((1 - (V.y * 0.5 + 0.5)) * 1920), V.z]; };
    const res = { t, camPos: cam.position.toArray().map(v => +v.toFixed(2)), fov: cam.fov };
    res.pool = S.story.cast.pool.map((c, i) => {
      const g = c.group; g.updateMatrixWorld(true);
      const w = new (Object.getPrototypeOf(cam.position).constructor)().setFromMatrixPosition(g.matrixWorld).toArray().map(v => +v.toFixed(2));
      const s = proj(w);
      return { i, visible: g.visible, parent: g.parent && g.parent.name, world: w, screen: [s[0], s[1]], ndcZ: +s[2].toFixed(3) };
    });
    const mains = ['dancer', 'dancer2', 'dancer3', 'dancer4', 'crowd1', 'crowd2'];
    res.main = mains.map((n) => { const c = S.story.cast[n]; const g = c.group; g.updateMatrixWorld(true);
      const w = new (Object.getPrototypeOf(cam.position).constructor)().setFromMatrixPosition(g.matrixWorld).toArray().map(v => +v.toFixed(2));
      return { n, visible: g.visible, world: w, screen: proj(w).slice(0, 2) }; });
    return res;
  }, t);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
