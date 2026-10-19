/**
 * 完整播放实测：node tools/check-real-full.mjs
 * 真音频从头播到尾（时长由 project.json 的 duration 决定），记录每一次场景切换的实际时间，
 * 和时间轴起唱点（project.json scenes[].start）比对；结束遮罩、重播也一起验证。
 */
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import { CHROME } from './browser.mjs';
import { ROOT, PROJECT, SCENES, sceneStart, projectDuration } from './project.mjs';

const url = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/');
const DURATION = projectDuration(PROJECT);
// 期望切换时刻 = 每个场景的起点（两位小数）
const EXPECT = SCENES.map(s => [s.id, sceneStart(s)]);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1600, height: 900 }
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));
const boot = await page.evaluate(() => ({
  ready: AudioEngine.ready, dur: +AudioEngine.duration.toFixed(3),
  overlay: !document.getElementById('startOverlay').classList.contains('hide'),
  errs: window.__errors || []
}));
if (boot.overlay) await page.click('#startBtn');

const switches = [];
const samples = [];
let lastScene = null;
const t0 = Date.now();
const deadline = (DURATION + 5) * 1000; // 项目时长 + 5s 余量，避免长/短项目被写死
let last = null;
while (Date.now() - t0 < deadline) {
  const s = await page.evaluate(() => ({
    t: +window.__player.state.t.toFixed(2),
    active: window.__player.state.activeId,
    playing: window.__player.state.playing,
    ended: window.__player.state.ended,
    lyric: (document.getElementById('lyricLine') || {}).textContent,
    audioNow: AudioEngine.now() == null ? null : +AudioEngine.now().toFixed(2),
    lv: AudioEngine.levels(),
    endOverlay: document.getElementById('endOverlay').classList.contains('show'),
    pulse: +document.getElementById('frame').style.getPropertyValue('--pulse')
  }));
  last = s;
  if (s.active !== lastScene) {
    switches.push({ id: s.active, t: s.t, audioNow: s.audioNow, lyric: s.lyric, syncDiff: s.audioNow == null ? null : +(s.audioNow - s.t).toFixed(3) });
    lastScene = s.active;
  }
  if (Date.now() - t0 > 2000 && Date.now() - t0 < 20000) samples.push({ t: s.t, e: +s.lv.energy.toFixed(2), b: +s.lv.bass.toFixed(2), pulse: s.pulse });
  if (s.ended && s.endOverlay) break;
  await new Promise(r => setTimeout(r, 260));
}

const compare = EXPECT.map(([id, exp]) => {
  const hit = switches.filter(x => x.id === id)[0];
  const actual = hit ? hit.t : null;
  let ok;
  if (id === 's01') {
    // 第一个镜头在点击开始的瞬间就生效，采样循环从约 1s 后才开始，无法观测到 0s 的切换；
    // 只要第一次采样时已经在 s01 且时间 < 1.5s，就视为正常。
    ok = hit ? actual < 1.5 : false;
  } else {
    ok = hit ? Math.abs(actual - exp) < 0.45 : false;
  }
  return { id, expected: exp, actual, diff: hit ? +(hit.t - exp).toFixed(2) : null, ok };
});

let replay = null;
if (last && last.ended) {
  await page.click('#replayBtn2');
  await new Promise(r => setTimeout(r, 1500));
  replay = await page.evaluate(() => ({
    t: +window.__player.state.t.toFixed(2), playing: window.__player.state.playing,
    active: window.__player.state.activeId, ended: window.__player.state.ended,
    audioNow: +AudioEngine.now().toFixed(2),
    endOverlay: document.getElementById('endOverlay').classList.contains('show'),
    startOverlayHidden: document.getElementById('startOverlay').classList.contains('hide'),
    errs: window.__errors || []
  }));
}

const pulseMax = Math.max.apply(null, samples.map(s => s.pulse || 0));
const energyAvg = samples.reduce((a, s) => a + s.e, 0) / Math.max(1, samples.length);
const bassAvg = samples.reduce((a, s) => a + s.b, 0) / Math.max(1, samples.length);
console.log(JSON.stringify({
  boot,
  switches,
  compare,
  allOk: compare.every(c => c.ok),
  last: last && { t: last.t, ended: last.ended, endOverlay: last.endOverlay },
  replay,
  audioAnalysis: { samples: samples.length, pulseMax: +pulseMax.toFixed(2), energyAvg: +energyAvg.toFixed(2), bassAvg: +bassAvg.toFixed(2) },
  errors
}, null, 1));
await browser.close();
