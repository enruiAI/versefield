/**
 * 场景校验：node tools/validate.mjs
 * 打开 src/test-runner.html，等待 RESULT_JSON，输出汇总与各场景问题。
 */
import { launch, fileUrl } from './browser.mjs';

const browser = await launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error') {
    const loc = m.location() || {};
    consoleErrors.push('console: ' + m.text() + '  @' + (loc.url || '').split('/').slice(-1)[0] + ':' + (loc.lineNumber || ''));
  }
});
await page.goto(fileUrl('src/test-runner.html'), { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('out').textContent.includes('RESULT_JSON:'), { timeout: 30000 });
const txt = await page.evaluate(() => document.getElementById('out').textContent);
const data = JSON.parse(txt.slice(txt.indexOf('RESULT_JSON:') + 'RESULT_JSON:'.length));
console.log('SUMMARY', JSON.stringify(data.summary));
if (data.summary.badPaths && data.summary.badPaths.length) {
  console.log('BAD_PATHS:');
  data.summary.badPaths.forEach(b => console.log('  [' + b.scene + '] ' + b.d));
}
for (const r of data.results) {
  const flag = r.ok ? 'OK  ' : 'FAIL';
  console.log(`${flag} ${r.id}  nodes=${r.nodes}  ms/frame=${r.msPerFrame}  extRefs=${r.externalRefs}  httpRefs=${r.httpRefs}` + (r.errors.length ? '  ' + r.errors.join(' | ') : ''));
}
if (consoleErrors.length) { console.log('CONSOLE_ERRORS:'); consoleErrors.forEach(e => console.log('  ' + e)); }
const failed = data.results.filter(r => !r.ok);
await browser.close();
process.exit(failed.length || consoleErrors.length ? 1 : 0);
