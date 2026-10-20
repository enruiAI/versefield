/**
 * 自动播放兜底检查：node tools/check-autoplay-fallback.mjs
 * 浏览器拦截自动播放时，应显示「点击开始」海报；点击后能正常起播。
 * 速度：一次加载 + 2.5s 播放，约 4s。
 */
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './project.mjs';

mkdirSync(resolve(ROOT, 'shots'), { recursive: true });
const url = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/');
const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1200));
const auto = await page.evaluate(() => {
  const p = window.__player.state;
  return { overlayVisible: !document.getElementById('startOverlay').classList.contains('hide'), started: p.started, audioOn: p.audioOn, ctxState: (() => { try { return AudioEngine.init().state; } catch (e) { return 'err'; } })() };
});
await page.screenshot({ path: resolve(ROOT, 'shots', 'v2_start_overlay.png'), optimizeForSpeed: true });
await page.click('#startBtn');
await new Promise(r => setTimeout(r, 2500));
const after = await page.evaluate(() => {
  const p = window.__player.state;
  return { t: +p.t.toFixed(2), started: p.started, playing: p.playing, audioOn: p.audioOn,
    audioNow: AudioEngine.now(), ctxState: AudioEngine.init().state,
    overlayHidden: document.getElementById('startOverlay').classList.contains('hide'),
    active: p.activeId };
});
console.log(JSON.stringify({ auto, after, errors }, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
