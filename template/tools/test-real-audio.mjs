import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'file:///' + resolve(process.cwd(), 'tests/audio-real-check.html').replace(/\\/g, '/');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox','--hide-scrollbars','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'load' });
try { await page.waitForFunction(() => document.getElementById('out').textContent.includes('RESULT_JSON:'), { timeout: 30000 }); } catch (e) { console.log('TIMEOUT'); }
const txt = await page.evaluate(() => document.getElementById('out').textContent);
const i = txt.indexOf('RESULT_JSON:');
console.log(txt.slice(0, i));
console.log(txt.slice(i));
if (errors.length) console.log('CONSOLE:', errors);
await browser.close();
