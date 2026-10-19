/**
 * 最终产物检查：node tools/check-final.mjs
 * - 单文件 index.html：外部请求 / 控制台错误 / 顶部标题 / 场景层数量
 *   （标题、场景数、时长全部来自项目根目录 project.json，不写死某首歌）
 * - 点击开始：音频与画面时间同步、逐句歌词推进
 * - 逐场景冻结截图（shots/final_<id>.png）并校验 active/lyric 与时间轴一致
 */
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, PROJECT, SCENES, sceneMid, projectDuration } from './project.mjs';

const fileUrl = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/');
mkdirSync(resolve(ROOT, 'shots'), { recursive: true });

const DURATION = projectDuration(PROJECT);
// 每个场景取镜头内 55% 处作为期望时间点（此时 active 必然是当前场景）
const EXPECT = SCENES.map(s => [s.id, sceneMid(s)]);

const browser = await launch();
const page = await browser.newPage();
const requests = [];
const consoleErrors = [];
page.on('request', r => requests.push(r.url()));
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text()); });

await page.goto(fileUrl, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));

const before = await page.evaluate((header) => ({
  overlayVisible: !document.getElementById('startOverlay').classList.contains('hide'),
  errors: window.__errors || [],
  title: (document.getElementById('modelTitle') || {}).textContent || '',
  // 顶部标题在页面里恰好出现一次（用 split 计数，避免 header 里的正则特殊字符）
  titleCount: header ? (document.documentElement.innerHTML.split(header).length - 1) : 0,
  tlDuration: window.TL.duration,
  audioReady: window.AudioEngine.ready,
  audioDuration: window.AudioEngine.duration,
  sceneLayers: document.querySelectorAll('#sceneRoot .scene-layer').length,
  timeLabel: document.getElementById('timeLabel').textContent
}), PROJECT.header);

// 点击开始 -> 真播放 3.2s
if (before.overlayVisible) await page.click('#startBtn').catch(() => {});
await new Promise(r => setTimeout(r, 3200));
const mid = await page.evaluate(() => {
  const p = window.__player.state;
  const ae = window.AudioEngine;
  return {
    t: +p.t.toFixed(2), playing: p.playing, audioOn: p.audioOn, active: p.activeId,
    audioNow: ae && ae.now ? +ae.now().toFixed(2) : null,
    syncDiff: (ae && ae.now ? Math.abs(ae.now() - p.t) : null),
    lyric: document.getElementById('lyricLine').textContent,
    litChars: document.querySelectorAll('#lyricLine .ch.lit').length,
    chars: document.querySelectorAll('#lyricLine .ch').length,
    pulse: +document.getElementById('frame').style.getPropertyValue('--pulse'),
    errors: window.__errors || []
  };
});

// 逐场景冻结截图 + 场景/歌词校验
const shots = [];
for (const [id, t] of EXPECT) {
  await page.goto(fileUrl + '?t=' + t, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 850));
  const st = await page.evaluate(() => ({
    active: window.__player.state.activeId,
    lyric: document.getElementById('lyricLine').textContent,
    sub: document.getElementById('lyricSub').textContent,
    time: document.getElementById('timeLabel').textContent,
    hiddenLayers: Array.from(document.querySelectorAll('#sceneRoot .scene-layer')).filter(el => el.style.display === 'none').length,
    visibleSceneNodes: document.querySelectorAll('#sceneRoot .scene-layer:not([style*="display: none"]) *').length,
    errs: window.__errors || []
  }));
  await page.screenshot({ path: resolve(ROOT, 'shots', 'final_' + id + '.png') });
  shots.push({ id, t, active: st.active, okActive: st.active === id, lyric: st.lyric, time: st.time, hiddenLayers: st.hiddenLayers, visibleSceneNodes: st.visibleSceneNodes, errs: st.errs });
}

const external = requests.filter(u => !u.startsWith('file://'));
const badShots = shots.filter(s => !s.okActive || s.errs.length);
console.log(JSON.stringify({
  before,
  mid,
  shots,
  externalRequests: external,
  consoleErrors,
  summary: {
    headerOk: !PROJECT.header || before.title === PROJECT.header,
    titleCount: before.titleCount,
    durationOk: Math.abs(before.tlDuration - DURATION) < 0.01 && Math.abs(before.audioDuration - DURATION) < 0.05,
    sceneLayersOk: before.sceneLayers === SCENES.length,
    syncOk: mid.syncDiff != null && mid.syncDiff < 0.25,
    shotsOk: badShots.length === 0,
    externalOk: external.length === 0,
    consoleOk: consoleErrors.length === 0
  }
}, null, 1));
await browser.close();
process.exit(badShots.length || external.length || consoleErrors.length ? 1 : 0);
