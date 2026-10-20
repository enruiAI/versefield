/**
 * 导出 MP4：把单页歌词视频逐帧渲染成带音轨的视频。
 *
 * 用法（在生成项目根目录执行）：
 *   node tools/export-video.mjs
 *   node tools/export-video.mjs --fps 50 --scale 1.2 --out shots/mv-1080p.mp4
 *   node tools/export-video.mjs --start 6 --end 18 --out shots/chorus.mp4
 *
 * 原理（离线逐帧，不是录屏）：
 *   1. 无头 Chrome 打开 index.html?export=1：关闭主循环推进、关闭 CSS 动画（.instant）；
 *   2. 逐帧调用 window.__player.renderAt(t) 并截图 PNG 序列；
 *   3. ffmpeg 把 PNG 序列 + assets/song_clip.mp3 合成为 H.264/AAC MP4。
 *   音轨不经过浏览器，画面按时间轴逐帧确定性渲染，不会掉帧/音画漂移。
 *
 * 依赖：puppeteer-core（npm install --prefix tools）+ ffmpeg
 *   ffmpeg 查找顺序：--ffmpeg 参数 → FFMPEG_PATH 环境变量 → PATH → imageio-ffmpeg（pip install imageio-ffmpeg）
 *
 * 可选参数：
 *   --fps 30          帧率（默认 30；50 可对齐 50fps 卡点表）
 *   --scale 1         输出缩放（1600×900 × scale；1.2 = 1920×1080）
 *   --out <path>      输出文件（默认 shots/lyric-video.mp4，相对项目根目录）
 *   --audio <path>    音轨（默认 assets/song_clip.mp3）
 *   --start / --end   只导出一段（秒；默认整片）
 *   --crf 20          H.264 质量（越小越清晰、文件越大）
 *   --preset medium   x264 preset（fast / medium / slow）
 *   --show-ui         保留底部播放控件（默认隐藏，只留画面+歌词）
 *   --keep-frames     保留中间 PNG 帧目录（调试用）
 *   --ffmpeg <path>   指定 ffmpeg 可执行文件
 */
import { launch } from './browser.mjs';
import { ROOT, PROJECT, projectDuration } from './project.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

function flag(name) { return process.argv.includes('--' + name); }
function opt(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
function num(name, def) {
  const v = opt(name, def);
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function findFfmpeg() {
  const explicit = opt('ffmpeg', null);
  if (typeof explicit === 'string' && existsSync(explicit)) return explicit;
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const where = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  if (where.status === 0) {
    const p = (where.stdout || '').split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (p && existsSync(p)) return p;
  }
  // imageio-ffmpeg（Python 环境）
  for (const py of ['python', 'python3', process.env.PYTHON].filter(Boolean)) {
    const r = spawnSync(py, ['-c', 'import imageio_ffmpeg,sys;sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
    if (r.status === 0) {
      const p = (r.stdout || '').trim();
      if (p && existsSync(p)) return p;
    }
  }
  // 常见安装位置：DSH venv / DSH runtime / imageio 缓存
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const dirs = [];
  const addDir = (d) => { if (d && existsSync(d)) dirs.push(d); };
  const addBinaries = (base) => {
    addDir(join(base, 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries'));
    addDir(join(base, 'lib', 'site-packages', 'imageio_ffmpeg', 'binaries'));
    addDir(join(base, 'lib', 'python3', 'site-packages', 'imageio_ffmpeg', 'binaries'));
  };
  const venvs = join(home, '.dsh', 'venvs');
  if (existsSync(venvs)) for (const v of readdirSync(venvs)) addBinaries(join(venvs, v));
  const runtimes = join(home, '.dsh', 'dsh-runtimes');
  if (existsSync(runtimes)) for (const v of readdirSync(runtimes)) addDir(join(runtimes, v, 'dependencies', 'python', 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries'));
  addDir(join(home, '.imageio', 'ffmpeg'));
  for (const d of dirs) {
    for (const f of readdirSync(d)) {
      if (!/^ffmpeg.*(\.exe)?$/i.test(f)) continue;
      const p = join(d, f);
      try { if (statSync(p).isFile()) return p; } catch (e) { /* ignore */ }
    }
  }
  return null;
}

function runFfmpeg(ffmpeg, args) {
  return new Promise((res, rej) => {
    const p = spawn(ffmpeg, args, { stdio: ['ignore', 'inherit', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', rej);
    p.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg 退出码 ' + code + '\n' + err.slice(-1500))));
  });
}

async function main() {
  const fps = Math.max(1, Math.round(num('fps', 30)));
  const scale = Math.max(0.2, num('scale', 1));
  const duration = projectDuration(PROJECT);
  const start = Math.max(0, num('start', 0));
  const end = Math.min(duration, num('end', duration));
  if (end <= start + 1 / fps) throw new Error(`导出区间太短：start=${start} end=${end}`);
  const out = resolve(ROOT, String(opt('out', 'shots/lyric-video.mp4')));
  const audio = resolve(ROOT, String(opt('audio', 'assets/song_clip.mp3')));
  const crf = String(Math.round(num('crf', 20)));
  const preset = String(opt('preset', 'medium'));
  const showUI = flag('show-ui');
  const keepFrames = flag('keep-frames');

  if (!existsSync(audio)) throw new Error('找不到音轨：' + audio);
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    throw new Error('找不到 ffmpeg。请让 ffmpeg 在 PATH 里、设置 FFMPEG_PATH，或跑：pip install imageio-ffmpeg');
  }

  const frameCount = Math.max(1, Math.round((end - start) * fps));
  const framesDir = mkdtempSync(join(tmpdir(), 'versefield-frames-'));
  mkdirSync(dirname(out), { recursive: true });

  const browser = await launch();
  const errors = [];
  let page = null;
  try {
    page = await browser.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: scale });
    const url = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/') + '?export=1&t=0';
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__player && window.TL && window.SCENES, { timeout: 15000 });
    if (!showUI) {
      await page.addStyleTag({ content: '#controls,#startOverlay,#endOverlay,#rotateHint{display:none!important}' });
    }
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    for (let i = 0; i < frameCount; i++) {
      const t = start + i / fps;
      await page.evaluate((tt) => window.__player.renderAt(tt), t);
      await page.screenshot({ path: join(framesDir, String(i).padStart(6, '0') + '.png') });
      if (i % Math.max(1, Math.round(fps)) === 0) process.stderr.write(`\r[export] ${i}/${frameCount} 帧`);
    }
    process.stderr.write(`\r[export] ${frameCount}/${frameCount} 帧\n`);
  } finally {
    await browser.close().catch(() => {});
  }

  await runFfmpeg(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(framesDir, '%06d.png'),
    '-ss', String(start), '-i', audio,
    '-t', String(end - start),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ]);

  if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });

  const result = {
    ok: true,
    out,
    song: PROJECT.song,
    duration: Math.round((end - start) * 1000) / 1000,
    fps,
    frames: frameCount,
    width: Math.round(1600 * scale),
    height: Math.round(900 * scale),
    scale,
    audio,
    ffmpeg,
    sizeBytes: existsSync(out) ? statSync(out).size : null,
    framesDir: keepFrames ? framesDir : null,
    errors,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => {
  console.error(JSON.stringify({ ok: false, error: String(e && e.message || e) }, null, 2));
  process.exit(1);
});
