/**
 * 导出 MP4：把单页歌词视频逐帧渲染成带音轨的视频。
 *
 * 用法（在生成项目的 _project/ 目录执行）：
 *   node tools/export-video.mjs
 *   node tools/export-video.mjs --fps 50 --scale 1.2 --out mv-1080p.mp4
 *   node tools/export-video.mjs --start 6 --end 18 --out chorus.mp4
 *   输出默认在交付目录根（_project 的上一级）：lyric-video.mp4
 *
 * 原理（离线逐帧，不是录屏）：
 *   1. 无头 Chrome 打开 index.html?export=1：关闭主循环推进、关闭 CSS 动画；
 *   2. 逐帧调用 window.__player.renderAt(t) 并截图 PNG 序列（画面含淡入淡出）；
 *   3. ffmpeg 把图片序列 + _project/assets/song_clip.mp3 合成为 H.264/AAC MP4。
 *   音轨不经过浏览器，画面按时间轴逐帧确定性渲染，不会掉帧/音画漂移。
 *
 * 速度：
 *   - 截图默认开启 optimizeForSpeed（比普通截图快 3~4 倍）；
 *   - 默认用多个 Chrome 进程并行渲染不同帧（--workers，默认 min(4, CPU-1)），
 *     在 16 线程机器上 1600×900 约 0.1s/帧（老版本约 0.6s/帧）；
 *   - 每个进程写自己的帧子目录，最后合并再用 ffmpeg 读取：多个进程同写一个目录时
 *     Windows 文件系统/杀毒扫描容易串行化，反而变慢。
 *
 * 依赖：puppeteer-core（npm install --prefix tools）+ ffmpeg
 *   ffmpeg 查找顺序：--ffmpeg 参数 → FFMPEG_PATH 环境变量 → PATH → imageio-ffmpeg（pip install imageio-ffmpeg）
 *
 * 可选参数：
 *   --fps 30          帧率（默认 30；50 可对齐 50fps 卡点表）
 *   --scale 1         输出缩放（1600×900 × scale；1.2 = 1920×1080）
 *   --out <path>      输出文件（相对 _project 的上一级交付目录，默认 lyric-video.mp4）
 *   --audio <path>    音轨（默认 _project/assets/song_clip.mp3）
 *   --start / --end   只导出一段（秒；默认整片）
 *   --crf 20          H.264 质量（越小越清晰、文件越大）
 *   --preset fast     x264 preset（fast / medium / slow）
 *   --workers 4       并行 Chrome 进程数（1 = 单进程；默认按 CPU 自动取 1~4）
 *   --format png      帧格式：png（无损，默认）/ jpeg（更快，体积更小）
 *   --quality 92      --format jpeg 时的质量（0~100）
 *   --show-ui         保留底部播放控件（默认隐藏，只留画面+歌词）
 *   --keep-frames     保留中间帧目录（调试用）
 *   --ffmpeg <path>   指定 ffmpeg 可执行文件
 */
import { launch } from './browser.mjs';
import { ROOT, PROJECT, projectDuration } from './project.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
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

async function openPage(browser, start, showUI, scale) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: scale });
  const url = 'file:///' + resolve(ROOT, 'index.html').replace(/\\/g, '/') + '?export=1&t=' + start;
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__player && window.TL && window.SCENES, { timeout: 15000 });
  if (!showUI) {
    await page.addStyleTag({ content: '#controls,#startOverlay,#endOverlay,#rotateHint{display:none!important}' });
  }
  // 等字体与首帧就绪，避免第一帧字体还没替换
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, errors };
}

async function main() {
  const fps = Math.max(1, Math.round(num('fps', 30)));
  const scale = Math.max(0.2, num('scale', 1));
  const duration = projectDuration(PROJECT);
  const start = Math.max(0, num('start', 0));
  const end = Math.min(duration, num('end', duration));
  if (end <= start + 1 / fps) throw new Error(`导出区间太短：start=${start} end=${end}`);
  const DELIVERY = resolve(ROOT, '..');
  const out = resolve(DELIVERY, String(opt('out', 'lyric-video.mp4')));
  const audio = resolve(ROOT, String(opt('audio', 'assets/song_clip.mp3')));
  const crf = String(Math.round(num('crf', 20)));
  const preset = String(opt('preset', 'fast'));
  const showUI = flag('show-ui');
  const keepFrames = flag('keep-frames');
  const formatArg = String(opt('format', 'png')).toLowerCase();
  const format = (formatArg === 'jpeg' || formatArg === 'jpg') ? 'jpeg' : 'png';
  const quality = Math.max(1, Math.min(100, Math.round(num('quality', 92))));
  const maxWorkers = Math.max(1, Math.min(8, cpus().length - 1 || 1));
  const workers = Math.max(1, Math.min(maxWorkers, Math.round(num('workers', Math.min(4, maxWorkers)))));
  const fadeIn = Math.max(0, Number(PROJECT.fade_in != null ? PROJECT.fade_in : 0.6) || 0);
  const fadeOut = Math.max(0, Number(PROJECT.fade_out != null ? PROJECT.fade_out : 0.8) || 0);

  if (!existsSync(audio)) throw new Error('找不到音轨：' + audio);
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    throw new Error('找不到 ffmpeg。请让 ffmpeg 在 PATH 里、设置 FFMPEG_PATH，或跑：pip install imageio-ffmpeg');
  }

  const frameCount = Math.max(1, Math.round((end - start) * fps));
  const framesDir = mkdtempSync(join(tmpdir(), 'versefield-frames-'));
  mkdirSync(dirname(out), { recursive: true });
  // 每个进程写自己的子目录：多个 Chrome 同时往同一个目录写大量 PNG 时，
  // Windows 文件系统/杀毒扫描会串行化，4 进程反而比单进程慢好几倍。
  const workerDirs = Array.from({ length: workers }, (_, w) => {
    const d = join(framesDir, 'w' + w);
    mkdirSync(d, { recursive: true });
    return d;
  });
  const frameName = (i) => String(i).padStart(6, '0') + '.' + format;

  const errors = [];
  let done = 0;
  const timer = setInterval(() => {
    process.stderr.write(`\r[export] ${done}/${frameCount} 帧（${workers} 进程）`);
  }, 1000);
  const t0 = Date.now();

  try {
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const browser = await launch({ protocolTimeout: 180000 });
      try {
        const opened = await openPage(browser, start, showUI, scale);
        errors.push(...opened.errors);
        const page = opened.page;
        for (let i = w; i < frameCount; i += workers) {
          const t = start + i / fps;
          await page.evaluate((tt) => window.__player.renderAt(tt), t);
          await page.screenshot({
            path: join(workerDirs[w], frameName(i)),
            type: format,
            ...(format === 'jpeg' ? { quality } : {}),
            optimizeForSpeed: true,
          });
          done++;
        }
      } finally {
        await browser.close().catch(() => {});
      }
    }));
  } finally {
    clearInterval(timer);
  }
  // 把各进程的帧合并回同一目录，ffmpeg 需要连续序号
  for (const d of workerDirs) {
    for (const f of readdirSync(d)) renameSync(join(d, f), join(framesDir, f));
    rmSync(d, { recursive: true, force: true });
  }
  const captureSec = Math.round((Date.now() - t0) / 1000);
  process.stderr.write(`\r[export] ${frameCount}/${frameCount} 帧（${workers} 进程，渲染 ${captureSec}s）\n`);

  const audioFilters = [];
  if (start <= 0.001 && fadeIn > 0) audioFilters.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (end >= duration - 0.001 && fadeOut > 0) {
    audioFilters.push(`afade=t=out:st=${Math.max(0, duration - fadeOut).toFixed(3)}:d=${fadeOut}`);
  }

  await runFfmpeg(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(framesDir, '%06d.' + format),
    '-ss', String(start), '-i', audio,
    '-t', String(end - start),
    ...(audioFilters.length ? ['-af', audioFilters.join(',')] : []),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    out,
  ]);

  const encodeSec = Math.round((Date.now() - t0) / 1000) - captureSec;
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
    workers,
    format,
    audio,
    ffmpeg,
    captureSec,
    encodeSec,
    elapsedSec: Math.round((Date.now() - t0) / 1000),
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
