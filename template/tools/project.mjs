/**
 * 项目清单（project.json）统一入口。
 *
 * 约定：每个生成项目的根目录都有 project.json（由 scaffold 生成），tools/ 被整体复制进项目，
 * 因此这里用 `tools/` 的上一级解析项目根目录，不依赖 cwd —— 在任意目录执行
 * `node <项目>/tools/check-final.mjs` 都能找到正确的 project.json。
 *
 * 用法：
 *   import { ROOT, PROJECT, SCENES, sceneMid } from './project.mjs';
 *
 * project.json 结构（节选）：
 *   { "schema": "versefield/project@1", "song": "...", "artist": "...",
 *     "header": "...", "style": "...", "duration": 53.7,
 *     "scenes": [{ "id": "s01", "index": 1, "start": 0.0, "end": 3.81, "dur": 3.81,
 *                  "lyric": "...", "sub": "...", "tag": "...", "motif": "m01", "custom": false }],
 *     "audio": { "file": "assets/song_clip.mp3", "duration": 53.7 } }
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 项目根目录 = tools/ 的上一级 */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 项目清单的绝对路径 */
export const PROJECT_PATH = resolve(ROOT, 'project.json');

function loadProject(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new Error(
      `[project] 读不到项目清单：${path}\n` +
      `[project] QA 工具必须位于 <项目根>/tools/ 下，且项目根有 project.json（先跑 scaffold）。`
    );
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`[project] ${path} 不是合法 JSON：${e.message}`);
  }
  if (!data || !Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error(`[project] ${path} 里没有非空的 scenes 数组，无法生成检查时间轴。`);
  }
  return data;
}

/** 解析后的 project.json 对象 */
export const PROJECT = loadProject(PROJECT_PATH);

/** 场景列表（顺序即时间轴顺序）；所有 QA 工具的唯一场景来源 */
export const SCENES = PROJECT.scenes;

/** 场景时长：优先用 dur，缺失时用 end - start 兜底 */
function sceneDur(scene) {
  const start = Number(scene.start);
  const dur = scene.dur != null ? Number(scene.dur) : Number(scene.end) - start;
  if (!Number.isFinite(start) || !Number.isFinite(dur)) {
    throw new Error(`[project] 场景 ${scene && scene.id} 的 start/dur/end 不是有效数字`);
  }
  return { start, dur };
}

/**
 * 镜头内取样时间：默认取镜头 55% 处（画面最完整的位置）。
 * 返回两位小数，与各 QA 脚本 EXPECT/截图时间点的精度保持一致。
 * @param {{start:number, dur?:number, end?:number}} scene project.json 场景对象
 * @param {number} [ratio=0.55] 取样比例（0~1）
 * @returns {number} 绝对时间（秒，两位小数）
 */
export function sceneMid(scene, ratio = 0.55) {
  const { start, dur } = sceneDur(scene);
  return Math.round((start + dur * ratio) * 100) / 100;
}

/** 场景起点时间（两位小数），供完整播放实测比对切换时刻 */
export function sceneStart(scene) {
  return Math.round(sceneDur(scene).start * 100) / 100;
}

/** 项目总时长（秒）；project.duration 缺失时退回最后一个场景的 end */
export function projectDuration(project = PROJECT) {
  const d = Number(project.duration);
  if (Number.isFinite(d) && d > 0) return d;
  const scenes = project.scenes || [];
  const last = scenes[scenes.length - 1];
  if (last && Number.isFinite(Number(last.end))) return Number(last.end);
  throw new Error('[project] project.json 缺少 duration，且场景也没有 end，无法推导时长');
}
