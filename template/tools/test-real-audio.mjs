/**
 * 音轨引擎自测：node tools/test-real-audio.mjs
 * 打开 tests/audio-real-check.html，等待页面输出 RESULT_JSON（真实音轨 + 24 项断言）。
 * 速度：一次加载即可，约 2~3s。
 */
import { launch } from './browser.mjs';
import { resolve } from 'node:path';
import { ROOT } from './project.mjs';

const url = 'file:///' + resolve(ROOT, 'tests/audio-real-check.html').replace(/\\/g, '/');
const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'load' });
let timedOut = false;
try {
  await page.waitForFunction(() => document.getElementById('out').textContent.includes('RESULT_JSON:'), { timeout: 30000 });
} catch (e) {
  timedOut = true;
  console.log('TIMEOUT');
}
const txt = await page.evaluate(() => document.getElementById('out').textContent);
const i = txt.indexOf('RESULT_JSON:');
console.log(txt.slice(0, i));
if (i >= 0) console.log(txt.slice(i));
if (errors.length) console.log('CONSOLE:', errors);
await browser.close();
process.exit(timedOut || i < 0 || errors.length ? 1 : 0);
