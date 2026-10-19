/**
 * 原始频谱探针：node tools/probe-raw-levels.mjs
 * 直接用 AnalyserNode 读原始频段均值，用于校准 audio.js 的 levels() 归一化。
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
await new Promise(r => setTimeout(r, 800));
const data = await page.evaluate(() => new Promise(resolve => {
  const an = AudioEngine.analyser;
  const ctx = AudioEngine.context;
  const bins = an.frequencyBinCount;
  const nyq = ctx.sampleRate / 2;
  const idx = {
    bassEnd: Math.round(250 / nyq * bins),
    midEnd: Math.round(2000 / nyq * bins),
    trebEnd: Math.round(8000 / nyq * bins)
  };
  const freq = new Uint8Array(bins);
  const time = new Float32Array(an.fftSize);
  const rows = [];
  const t0 = performance.now();
  const iv = setInterval(() => {
    an.getByteFrequencyData(freq);
    an.getFloatTimeDomainData(time);
    let bs = 0, bsN = 0, ms = 0, msN = 0, ts = 0, tsN = 0;
    for (let i = 1; i < idx.bassEnd; i++) { bs += freq[i]; bsN++; }
    for (let i = idx.bassEnd; i < idx.midEnd; i++) { ms += freq[i]; msN++; }
    for (let i = idx.midEnd; i < idx.trebEnd; i++) { ts += freq[i]; tsN++; }
    let rms = 0;
    for (let i = 0; i < time.length; i++) rms += time[i] * time[i];
    rms = Math.sqrt(rms / time.length);
    rows.push({
      b: +(bs / bsN / 255).toFixed(3), m: +(ms / msN / 255).toFixed(3),
      t: +(ts / tsN / 255).toFixed(3), rms: +rms.toFixed(3)
    });
    if (performance.now() - t0 > 6000) {
      clearInterval(iv);
      const agg = k => {
        const arr = rows.map(r => r[k]);
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return { mean: +mean.toFixed(3), max: +Math.max(...arr).toFixed(3), min: +Math.min(...arr).toFixed(3), n: arr.length };
      };
      resolve({ bass: agg('b'), mid: agg('m'), treble: agg('t'), rms: agg('rms') });
    }
  }, 50);
}));
console.log(JSON.stringify(data, null, 1));
await browser.close();
