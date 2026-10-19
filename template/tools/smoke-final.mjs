import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'file:///' + resolve(process.cwd(), 'index.html').replace(/\\/g, '/');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox','--hide-scrollbars','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const requests = [];
page.on('request', r => requests.push(r.url()));
await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));
const boot = await page.evaluate(() => ({
  tlDuration: window.TL.duration,
  audioReady: window.AudioEngine.ready,
  audioDuration: window.AudioEngine.duration,
  modelText: (document.getElementById('modelTitle') || {}).textContent || '',
  totalLabel: document.getElementById('timeLabel').textContent,
  overlay: !document.getElementById('startOverlay').classList.contains('hide')
}));
if (boot.overlay) await page.click('#startBtn');
await new Promise(r => setTimeout(r, 6000));
const play = await page.evaluate(() => ({
  t: +window.__player.state.t.toFixed(2),
  active: window.__player.state.activeId,
  lyric: document.getElementById('lyricLine').textContent,
  audioNow: +window.AudioEngine.now().toFixed(2),
  isPlaying: window.AudioEngine.isPlaying(),
  levels: { e: +window.AudioEngine.levels().energy.toFixed(2), b: +window.AudioEngine.levels().bass.toFixed(2) },
  errs: window.__errors || []
}));
const external = requests.filter(u => !u.startsWith('file://'));
console.log(JSON.stringify({ boot, play, externalRequests: external, errors }, null, 2));
await browser.close();
