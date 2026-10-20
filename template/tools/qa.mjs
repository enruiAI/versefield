/**
 * 一键 QA：node tools/qa.mjs [--fast]
 *
 * 按顺序跑完整检查，汇总 PASS/FAIL 与耗时：
 *   validate              场景全量加载/更新/path/性能（约 1s）
 *   check-final           单文件/外部请求/同步/逐场景截图（约 5s）
 *   test-real-audio       音轨引擎 24 项断言（约 2s）
 *   check-autoplay-fallback  自动播放被拦 -> 海报 + 点击起播（约 4s）
 *   check-real-full       真音频完整播放 + 切点误差（约 时长 + 3s）
 *   contact-sheet         关键帧 + 接触表（约 4s）
 *
 * --fast：跳过 check-real-full（迭代期间用；交付前必须跑一次完整版）。
 * 任一项失败时退出码为 1，并继续跑完后面的项，方便一次看到全部问题。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './project.mjs';

const fast = process.argv.includes('--fast');
const deps = resolve(ROOT, 'tools', 'node_modules', 'puppeteer-core');
if (!existsSync(deps)) {
  console.error('[qa] 缺少 puppeteer-core，先在 _project/ 下运行：npm install --prefix tools');
  process.exit(2);
}
const STEPS = [
  ['validate', 'validate.mjs'],
  ['check-final', 'check-final.mjs'],
  ['test-real-audio', 'test-real-audio.mjs'],
  ['check-autoplay-fallback', 'check-autoplay-fallback.mjs'],
  ['check-real-full', 'check-real-full.mjs', { skipFast: true }],
  ['contact-sheet', 'contact-sheet.mjs'],
];

const results = [];
const tAll = Date.now();
for (const [name, file, opts = {}] of STEPS) {
  if (fast && opts.skipFast) {
    results.push({ name, status: 'SKIP', sec: 0 });
    continue;
  }
  const script = resolve(ROOT, 'tools', file);
  if (!existsSync(script)) {
    results.push({ name, status: 'MISSING', sec: 0 });
    continue;
  }
  console.log(`\n===== ${name} =====`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: 'inherit' });
  const sec = +((Date.now() - t0) / 1000).toFixed(1);
  results.push({ name, status: r.status === 0 ? 'PASS' : 'FAIL', sec });
}

console.log('\n===== QA SUMMARY =====');
for (const r of results) console.log(`${r.status.padEnd(5)} ${String(r.sec).padStart(5)}s  ${r.name}`);
const failed = results.filter(r => r.status !== 'PASS' && r.status !== 'SKIP').length;
console.log(`${fast ? '[fast] ' : ''}total ${((Date.now() - tAll) / 1000).toFixed(1)}s, failed=${failed}${fast ? '（交付前再跑一次完整 QA）' : ''}`);
process.exit(failed ? 1 : 0);
