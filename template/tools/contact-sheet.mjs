/**
 * 全片关键帧 + 接触表：node tools/contact-sheet.mjs
 * 场景数量由项目根目录 project.json 决定，每个场景取镜头内 55% 处；
 * 输出 shots/qa_<id>.png 与 shots/contact_sheet.png（由 tools/montage.py 合成）。
 *
 * 速度：一次加载 index.html?export=1，用 __player.renderAt(t) 逐场景定格截图，
 * 不为每个场景重新导航（老版本每个场景约 0.85s 等待，现在整片约 3~4s）。
 */
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT, SCENES, sceneMid } from './project.mjs';
import { PYTHON } from './py.mjs';

const PY = PYTHON;
const url = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/') + '?export=1&t=0';
mkdirSync(resolve(ROOT, 'shots'), { recursive: true });

// 每个场景取镜头内 55% 左右的时间点（画面最完整的位置）
const TIMES = SCENES.map(s => [s.id, sceneMid(s)]);

const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__player && window.__player.renderAt, { timeout: 15000 });

const rows = [];
for (const [id, t] of TIMES) {
  const info = await page.evaluate((tt) => {
    window.__player.renderAt(tt);
    return {
      active: window.__player && window.__player.state.activeId,
      lyric: (document.getElementById('lyricLine') || {}).textContent,
      header: (document.getElementById('modelTitle') || {}).textContent || '',
      errs: window.__errors || []
    };
  }, t);
  await page.screenshot({ path: resolve(ROOT, 'shots', `qa_${id}.png`), optimizeForSpeed: true });
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
