#!/usr/bin/env node
/**
 * build.mjs — 把 src/ 下的页面打包成根目录的单文件 index.html
 * 规则：
 *   <link rel="stylesheet" href="style.css">  -> 内联 <style>
 *   <script src="xxx.js"></script>            -> 内联 <script>
 * 缺失的脚本（例如场景文件还没交付）会给出警告并跳过；全部资源必须内联，
 * 最终 index.html 双击即可离线运行，无任何外部请求。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'index.html');

let html = readFileSync(resolve(SRC, 'index.html'), 'utf8');
const missing = [];

// 内联 CSS
html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g, (m, href) => {
  const p = resolve(SRC, href);
  if (!existsSync(p)) { missing.push(href); return `<!-- missing css: ${href} -->`; }
  return `<style>\n/* ===== ${href} ===== */\n${readFileSync(p, 'utf8')}\n</style>`;
});

// 内联 JS
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src2) => {
  const p = resolve(SRC, src2);
  if (!existsSync(p)) {
    missing.push(src2);
    return `<!-- missing script: ${src2} -->`;
  }
  const code = readFileSync(p, 'utf8');
  if (code.includes('</script>')) {
    console.warn(`[warn] ${src2} 含有 </script> 字面量，可能会破坏内联`);
  }
  return `<script>\n/* ===== ${src2} ===== */\n${code}\n</script>`;
});

const banner = `<!--
  把回忆拼好给你 · deepseek-v4.1flash1017模型能力测试
  单文件离线版 · v2 霓虹回忆 DJ Remix（由 build.mjs 从 src/ 打包生成，请勿直接手改本文件）
  生成时间：${new Date().toISOString()}
  结构：helpers.js + timeline.js + art.js + 15 个 SVG 场景 + audio.js(真实音轨) + core.js
-->`;
html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + banner);

writeFileSync(OUT, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`[build] ${OUT}  ${kb} KB`);
if (missing.length) {
  console.warn('[build] 缺失文件（已跳过）：\n  - ' + missing.join('\n  - '));
  // 缺失关键文件时给出明确提示
  if (missing.some(f => f.endsWith('audio.js'))) console.warn('[build] ⚠ audio.js 缺失：页面将只能静音播放动画');
}
