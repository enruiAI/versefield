/**
 * 单场景检查：node tools/check-scene.mjs s03
 * 在 preview.html 里重新 build 指定场景，按 0.05s 采样整段时长，
 * 检查：是否加载 / build+update 是否抛错 / 节点数 / 每帧耗时 / 非法 path / 外部引用。
 */
import { launch, fileUrl } from './browser.mjs';

const id = process.argv[2];
if (!id) {
  console.error('usage: node tools/check-scene.mjs s03');
  process.exit(2);
}

const browser = await launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('ERR_FILE_NOT_FOUND')) consoleErrors.push('console: ' + m.text());
});
await page.goto(fileUrl('src/preview.html?scene=' + id + '&t=0&anim=0'), { waitUntil: 'load' });
await page.waitForFunction(() => window.H && window.A && window.TL, { timeout: 10000 });

const result = await page.evaluate((sceneId) => {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TL = window.TL, H = window.H, A = window.A;
  const scene = TL.scenes.filter(s => s.id === sceneId)[0];
  const out = { id: sceneId, found: !!scene, loaded: !!(window.SCENES || {})[sceneId], errors: [], badPaths: [], nodes: 0, msPerFrame: 0, httpRefs: 0, imageRefs: 0 };
  if (!scene) return out;
  const def = window.SCENES[sceneId];
  if (!def) { out.errors.push('scene not loaded (file missing?)'); return out; }
  const ARGC = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  function validPath(d) {
    if (typeof d !== 'string') return true;
    const re = /([A-Za-z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
    let cmd = null, got = 0, m;
    while ((m = re.exec(d))) {
      if (m[1]) {
        const c = m[1].toUpperCase();
        if (!(c in ARGC)) return false;
        if (cmd !== null && ARGC[cmd] > 0 && got % ARGC[cmd] !== 0) return false;
        cmd = c; got = 0;
        if (c === 'Z') cmd = null;
      } else {
        if (cmd === null) return false;
        got++;
      }
    }
    if (cmd !== null && ARGC[cmd] > 0 && got % ARGC[cmd] !== 0) return false;
    return true;
  }
  const host = document.createElementNS(SVGNS, 'svg');
  host.setAttribute('width', '1600'); host.setAttribute('height', '900');
  const defs = document.createElementNS(SVGNS, 'defs');
  const g = document.createElementNS(SVGNS, 'g');
  host.appendChild(defs); host.appendChild(g);
  document.body.appendChild(host);
  let api = null;
  try {
    A.frame(g, defs, scene.palette);
    api = def.build(g, defs, H, 1600, 900, scene);
  } catch (e) {
    out.errors.push('build: ' + (e && e.stack || e));
  }
  const dur = scene.dur;
  if (api && typeof api.update === 'function') {
    const frames = Math.round(dur / 0.05);
    const t0 = performance.now();
    for (let f = 0; f <= frames; f++) {
      const t = f * 0.05;
      const pulse = (typeof TL.pulseAt === 'function' && TL.pulseHex) ? TL.pulseAt(t) : Math.pow(1 - ((t / TL.beat) % 1), 2.3);
      try {
        api.update(t, {
          t, local: t, duration: dur, progress: t / dur,
          pulse: pulse, energy: 0.6, bass: 0.5, mid: 0.5, treble: 0.4,
          beat: t / TL.beat, bar: t / TL.bar, playing: true
        });
      } catch (e) {
        out.errors.push('update@' + t.toFixed(2) + ': ' + (e && e.stack || e));
        break;
      }
    }
    out.msPerFrame = +((performance.now() - t0) / (frames + 1)).toFixed(3);
  } else if (api) {
    out.errors.push('no update() returned');
  }
  // 统计
  const nodes = host.querySelectorAll('*');
  out.nodes = nodes.length;
  nodes.forEach(n => {
    const d = n.getAttribute && n.getAttribute('d');
    if (d && !validPath(d)) out.badPaths.push(d.slice(0, 200));
  });
  out.httpRefs = (host.outerHTML.match(/https?:\/\//g) || []).length;
  out.imageRefs = host.querySelectorAll('image,foreignObject').length;
  host.remove();
  return out;
}, id);

console.log(JSON.stringify({ result, consoleErrors }, null, 1));
await browser.close();
const bad = !result.loaded || result.errors.length || result.badPaths.length || consoleErrors.length;
process.exit(bad ? 1 : 0);
