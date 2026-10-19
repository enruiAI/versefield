/**
 * 全片关键帧 + 接触表：node tools/contact-sheet.mjs
 * 场景数量由项目根目录 project.json 决定，每个场景取镜头内 55% 处；
 * 输出 shots/qa_<id>.png 与 shots/contact_sheet.png（由 tools/montage.py 合成）。
 */
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT, SCENES, sceneMid } from './project.mjs';
import { PYTHON } from './py.mjs';

const PY = PYTHON;
const url = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/');
mkdirSync(resolve(ROOT, 'shots'), { recursive: true });

// 每个场景取镜头内 55% 左右的时间点（画面最完整的位置）
const TIMES = SCENES.map(s => [s.id, sceneMid(s)]);

const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const rows = [];
for (const [id, t] of TIMES) {
  await page.goto(url + '?t=' + t, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 850));
  const info = await page.evaluate(() => ({
    active: window.__player && window.__player.state.activeId,
    lyric: (document.getElementById('lyricLine') || {}).textContent,
    header: (document.getElementById('modelTitle') || {}).textContent || '',
    errs: window.__errors || []
  }));
  await page.screenshot({ path: resolve(ROOT, 'shots', `qa_${id}.png`) });
  rows.push({ id, t, active: info.active, lyric: info.lyric, errs: info.errs });
}
console.log(JSON.stringify({ rows, errors }, null, 1));
await browser.close();

try {
  const out = execFileSync(PY, [resolve(ROOT, 'tools', 'montage.py')], { encoding: 'utf8' });
  console.log('[montage]', out.trim());
} catch (e) {
  console.log('[montage] skipped:', e.message);
}
