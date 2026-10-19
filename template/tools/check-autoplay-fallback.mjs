import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'file:///' + resolve(process.cwd(), 'index.html').replace(/\\/g, '/');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox','--hide-scrollbars','--allow-file-access-from-files'],
  defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
const errors = [];
const fs = await import('node:fs');
page.on('pageerror', e => errors.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1200));
const auto = await page.evaluate(() => {
  const p = window.__player.state;
  return { overlayVisible: !document.getElementById('startOverlay').classList.contains('hide'), started: p.started, audioOn: p.audioOn, ctxState: (() => { try { return AudioEngine.init().state; } catch(e){ return 'err'; } })() };
});
await page.screenshot({ path: resolve(process.cwd(), 'shots', 'v2_start_overlay.png') });
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
