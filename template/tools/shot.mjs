/**
 * 截图：node tools/shot.mjs <相对路径/URL> <输出.png> [等待毫秒]
 * 例：node tools/shot.mjs "src/index.html?t=7" shots/s01.png 1500
 */
import { launch, fileUrl } from './browser.mjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const target = process.argv[2];
const out = process.argv[3] || 'shot.png';
const waitMs = Number(process.argv[4] || 1500);
const url = /^https?:\/\//.test(target) ? target : fileUrl(target);

mkdirSync(dirname(out), { recursive: true });
const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, waitMs));
await page.screenshot({ path: out });
const errlog = await page.evaluate(() => window.__errors || []);
console.log(JSON.stringify({ out, errors, errlog }, null, 2));
await browser.close();
