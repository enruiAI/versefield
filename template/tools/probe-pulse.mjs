/**
 * 鼓点检测探针：node tools/probe-pulse.mjs
 * 打开 index.html，点击开始，采样 8s 的 bass / pulse / active，看 pulse 是否在 kick 上冲顶。
 */
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'file:///' + resolve(process.cwd(), 'index.html').replace(/\\/g, '/');
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1600, height: 900 }
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));
const overlay = await page.evaluate(() => !document.getElementById('startOverlay').classList.contains('hide'));
if (overlay) await page.click('#startBtn');
const rows = [];
const t0 = Date.now();
while (Date.now() - t0 < 6000) {
  const s = await page.evaluate(() => ({
    t: +window.__player.state.t.toFixed(2),
    active: window.__player.state.activeId,
    pulse: +document.getElementById('frame').style.getPropertyValue('--pulse'),
    lv: AudioEngine.levels(), k: AudioEngine.levels().kickStrength
  }));
  rows.push({ t: s.t, a: s.active, p: s.pulse, k: +(s.k || 0).toFixed(3), e: +s.lv.energy.toFixed(2), b: +s.lv.bass.toFixed(2) });
  await new Promise(r => setTimeout(r, 30));
}
const ps = rows.map(r => r.p);
const peaks = rows.filter((r, i) => i > 1 && r.p > 0.6 && r.p > rows[i - 1].p).length;
console.log(JSON.stringify({
  samples: rows.length,
  pulseMax: Math.max(...ps), pulseMin: Math.min(...ps), peaksOver06: peaks,
  kb: { min: Math.min(...rows.map(r => r.k)), max: Math.max(...rows.map(r => r.k)), mean: +(rows.reduce((a, r) => a + r.k, 0) / rows.length).toFixed(3) },
  series: rows.slice(0, 80).map(r => r.t.toFixed(2) + ':' + r.k.toFixed(2) + '/' + r.p.toFixed(2)).join(' ')
}, null, 1));
await browser.close();
