#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""versefield 音频流水线公共模块。

fetch_lyrics / fetch_audio / align_and_cut / build_pulse_table 都从这里 import：

    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from common import ...

约定（所有脚本一致）：
  * 成功：stdout 只打印**一行** JSON（便于上层 `json.loads(stdout)`）；
  * 失败：stdout 打印错误 JSON（含 "ok": false）并以非零码退出（默认 1，参数/匹配错误用 2）；
  * 所有人类可读日志走 stderr（log()），不污染 stdout；
  * 输出的文件路径一律转成绝对路径。

本模块只依赖标准库 + numpy（numpy 仅音频分析脚本需要，缺了会在调用处报错）。
"""

from __future__ import annotations

import atexit
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib

try:  # numpy 只在音频分析时必需
    import numpy as np
except Exception:  # pragma: no cover - 环境缺 numpy 时给出清楚报错
    np = None

# 浏览器 UA：QQ 音乐 / 网易云 / B 站接口都需要
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# 默认请求头
DEFAULT_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

_TMP_DIRS = []  # 进程结束时清理的临时目录


# ---------------------------------------------------------------------------
# 日志 / JSON / 退出
# ---------------------------------------------------------------------------
def log(*args):
    """打印一条人类可读日志到 stderr（不污染 stdout 的 JSON）。"""
    print("[versefield]", *args, file=sys.stderr, flush=True)


def jprint(obj):
    """把对象按一行 JSON 打印到 stdout（成功结果唯一输出）。"""
    print(json.dumps(obj, ensure_ascii=False, default=str), flush=True)


def die(message, code=1, **extra):
    """失败：打印错误 JSON 并以非零码退出。"""
    payload = {"ok": False, "error": str(message)}
    payload.update(extra)
    jprint(payload)
    sys.exit(code)


def human_time(seconds):
    """秒 -> "MM:SS.ss"，用于日志与报告。"""
    if seconds is None:
        return "??:??.??"
    seconds = float(seconds)
    sign = "-" if seconds < 0 else ""
    seconds = abs(seconds)
    return "%s%02d:%05.2f" % (sign, int(seconds // 60), seconds % 60)


# ---------------------------------------------------------------------------
# 路径 / JSON 文件
# ---------------------------------------------------------------------------
def abs_path(path):
    """转绝对路径（展开 ~）。"""
    return os.path.abspath(os.path.expanduser(str(path)))


def ensure_dir_for(path):
    """确保文件所在目录存在。"""
    d = os.path.dirname(abs_path(path))
    if d:
        os.makedirs(d, exist_ok=True)
    return d


def ensure_dir(path):
    os.makedirs(abs_path(path), exist_ok=True)
    return abs_path(path)


def load_json(path):
    with open(abs_path(path), "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, obj, indent=2):
    """写 JSON 文件（自动建目录），返回绝对路径。"""
    path = abs_path(path)
    ensure_dir_for(path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)
        f.write("\n")
    return path


def temp_dir(prefix="versefield-"):
    """创建本次运行专用的临时目录，进程退出时自动删除。"""
    d = tempfile.mkdtemp(prefix=prefix)
    _TMP_DIRS.append(d)
    return d


def temp_path(name, prefix="versefield-"):
    return os.path.join(temp_dir(prefix), name)


@atexit.register
def _cleanup_temp_dirs():  # pragma: no cover - 清理逻辑
    for d in _TMP_DIRS:
        shutil.rmtree(d, ignore_errors=True)


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def http_get(url, headers=None, timeout=20, retries=2):
    """GET 一个 URL 并返回 bytes（带浏览器 UA / gzip 解压 / 简单重试）。

    :param headers: 额外请求头（会覆盖默认值），如 Referer。
    :param retries: 网络类错误的重试次数；403/404/412 不重试直接失败。
    """
    h = dict(DEFAULT_HEADERS)
    if headers:
        h.update(headers)
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                enc = (resp.headers.get("Content-Encoding") or "").lower()
                if "gzip" in enc:
                    data = gzip.decompress(data)
                elif "deflate" in enc:
                    try:
                        data = zlib.decompress(data)
                    except zlib.error:
                        data = zlib.decompress(data, -zlib.MAX_WBITS)
                return data
        except urllib.error.HTTPError as exc:
            last_err = exc
            log("HTTP %s  %s" % (exc.code, url))
            if exc.code in (400, 403, 404, 412):
                break
        except Exception as exc:  # URLError / timeout / ssl ...
            last_err = exc
            log("请求失败(%d/%d): %s -> %s" % (attempt + 1, retries + 1, url, exc))
        if attempt < retries:
            time.sleep(0.6 * (attempt + 1))
    raise RuntimeError("http_get 失败: %s (%s)" % (url, last_err))


def http_get_json(url, headers=None, timeout=20, retries=2):
    """GET 并解析 JSON（容错 utf-8 解码）。"""
    raw = http_get(url, headers=headers, timeout=timeout, retries=retries)
    text = raw.decode("utf-8", "replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 有的接口返回 JSONP（callback(...)）或带 BOM，做一次兜底提取
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
        raise


def http_download(url, dst, headers=None, timeout=120, chunk_size=1 << 16):
    """下载 URL 到本地文件（流式），返回文件大小（bytes）。"""
    h = dict(DEFAULT_HEADERS)
    if headers:
        h.update(headers)
    dst = abs_path(dst)
    ensure_dir_for(dst)
    req = urllib.request.Request(url, headers=h)
    total = 0
    with urllib.request.urlopen(req, timeout=timeout) as resp, open(dst, "wb") as f:
        ctype = (resp.headers.get("Content-Type") or "").lower()
        if "text/html" in ctype:  # 明显不是音频（多为版权/跳转提示页）
            snippet = resp.read(300).decode("utf-8", "replace")
            raise RuntimeError("返回的是 HTML 而非音频: %s ..." % snippet[:120])
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            total += len(chunk)
    return total


def page_referer(url):
    """从播放页 URL 推断 Referer（B 站/网易云等接口防盗链需要）。"""
    try:
        parsed = urllib.parse.urlparse(url)
        if "bilibili.com" in parsed.netloc:
            return "https://www.bilibili.com/"
        if "music.163.com" in parsed.netloc or "126.net" in parsed.netloc:
            return "https://music.163.com/"
        if "qq.com" in parsed.netloc:
            return "https://y.qq.com/"
        return "%s://%s/" % (parsed.scheme or "https", parsed.netloc)
    except Exception:
        return "https://www.bilibili.com/"


# ---------------------------------------------------------------------------
# ffmpeg / ffprobe
# ---------------------------------------------------------------------------
def ffmpeg_exe():
    """定位 ffmpeg：环境变量 -> imageio_ffmpeg -> PATH -> 常见安装位置。"""
    for env_name in ("FFMPEG_PATH", "FFMPEG_BINARY", "FFMPEG"):
        val = os.environ.get(env_name)
        if val and os.path.isfile(val):
            return val
    try:
        import imageio_ffmpeg  # 任务环境里已安装
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.isfile(exe):
            return exe
    except Exception:
        pass
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    for cand in (
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ):
        if os.path.isfile(cand):
            return cand
    raise RuntimeError(
        "找不到 ffmpeg。请安装 imageio-ffmpeg（pip install imageio-ffmpeg）"
        "或用环境变量 FFMPEG_PATH 指定 ffmpeg 可执行文件。"
    )


def ffprobe_exe():
    """定位 ffprobe（可能没有；没有时用 ffmpeg -i 解析时长）。"""
    for env_name in ("FFPROBE_PATH", "FFPROBE"):
        val = os.environ.get(env_name)
        if val and os.path.isfile(val):
            return val
    exe = shutil.which("ffprobe")
    if exe:
        return exe
    ff = ffmpeg_exe()
    cand = os.path.join(os.path.dirname(ff), "ffprobe.exe" if os.name == "nt" else "ffprobe")
    return cand if os.path.isfile(cand) else None


def run_ffmpeg(args, timeout=600):
    """执行 ffmpeg（参数列表不含可执行文件本身），失败抛异常并带 stderr 尾巴。"""
    cmd = [ffmpeg_exe()] + [str(a) for a in args]
    try:
        proc = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, errors="replace", timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("ffmpeg 超时(%ss): %s" % (timeout, " ".join(cmd[-6:])))
    if proc.returncode != 0:
        tail = [ln for ln in (proc.stderr or "").strip().splitlines() if ln.strip()][-6:]
        raise RuntimeError("ffmpeg 失败(exit %d): %s" % (proc.returncode, " | ".join(tail)))
    return proc


def _header_args(headers):
    """把 headers dict 转成 ffmpeg 的 -headers 参数值。"""
    if not headers:
        return []
    lines = "".join("%s: %s\r\n" % (k, v) for k, v in headers.items())
    return ["-headers", lines]


def probe_media(src, headers=None, timeout=90):
    """探测媒体信息。

    优先用 ffprobe（若存在），否则解析 `ffmpeg -i` 的 stderr；两者都不依赖完整解码。
    返回 dict: {path, duration, audio, video, audio_codec, sample_rate, channels, stderr}
    """
    info = {
        "path": src, "duration": None, "audio": False, "video": False,
        "audio_codec": None, "sample_rate": None, "channels": None, "stderr": "",
    }
    probe = ffprobe_exe()
    if probe:
        try:
            cmd = [probe, "-v", "error", "-show_entries",
                   "format=duration:stream=codec_type,codec_name,sample_rate,channels,width,height",
                   "-of", "json"]
            if headers:
                cmd += _header_args(headers)
            cmd.append(src)
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                  text=True, errors="replace", timeout=timeout)
            if proc.returncode == 0 and (proc.stdout or "").strip():
                data = json.loads(proc.stdout)
                fmt = data.get("format") or {}
                streams = data.get("streams") or []
                if fmt.get("duration") is not None:
                    info["duration"] = float(fmt["duration"])
                for st in streams:
                    if st.get("codec_type") == "audio":
                        info["audio"] = True
                        info["audio_codec"] = st.get("codec_name")
                        info["sample_rate"] = st.get("sample_rate")
                        info["channels"] = st.get("channels")
                    elif st.get("codec_type") == "video":
                        info["video"] = True
                if info["duration"] is not None:
                    return info
        except Exception as exc:
            log("ffprobe 探测失败，改用 ffmpeg -i: %s" % exc)

    # 兜底：解析 ffmpeg -i 的 stderr
    args = [ffmpeg_exe(), "-hide_banner", "-nostdin"]
    args += _header_args(headers)
    args += ["-i", src]
    try:
        proc = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True, errors="replace", timeout=timeout)
        err = proc.stderr or ""
    except subprocess.TimeoutExpired:
        raise RuntimeError("探测媒体超时: %s" % src)
    info["stderr"] = err
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", err)
    if match:
        info["duration"] = (int(match.group(1)) * 3600
                            + int(match.group(2)) * 60
                            + float(match.group(3)))
    audio_match = re.search(r"Stream #[^\n]*:\s*Audio:\s*([^\n]+)", err)
    if audio_match:
        info["audio"] = True
        detail = audio_match.group(1)
        info["audio_codec"] = detail.split(",")[0].split()[0].strip()
        sr_match = re.search(r"(\d+)\s*Hz", detail)
        if sr_match:
            info["sample_rate"] = int(sr_match.group(1))
        ch_match = re.search(r"(stereo|mono|[\d.]+\s*\(\w+\)|[\d.]+ channels)", detail)
        if ch_match:
            info["channels"] = ch_match.group(1)
    if re.search(r"Stream #[^\n]*:\s*Video:", err):
        info["video"] = True
    return info


def ffprobe(path, headers=None):
    """`ffprobe()`：探测媒体信息（任务书要求的公共函数，返回 dict）。"""
    return probe_media(path, headers=headers)


def probe_duration(path, headers=None):
    """返回时长（秒，float）；探测不到返回 None。"""
    return probe_media(path, headers=headers).get("duration")


# ---------------------------------------------------------------------------
# 音频解码 / WAV 读取
# ---------------------------------------------------------------------------
def read_wav_mono(path):
    """读取 WAV 并转成 (numpy float32 单声道, sample_rate)。

    支持 8/16/32-bit PCM；其它位深（如 24-bit）先经 ffmpeg 转成 16-bit 再读。
    """
    if np is None:
        raise RuntimeError("read_wav_mono 需要 numpy，请先安装 numpy")
    import wave

    path = abs_path(path)
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        nframes = w.getnframes()
        raw = w.readframes(nframes)
    if sampwidth == 2:
        data = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    elif sampwidth == 1:
        data = (np.frombuffer(raw, dtype="<u1").astype(np.float32) - 128.0) / 128.0
    elif sampwidth == 4:
        data = np.frombuffer(raw, dtype="<i4").astype(np.float32) / 2147483648.0
    else:
        # 24-bit 等：交给 ffmpeg 统一转成 16-bit PCM 再读
        converted = decode_to_wav(path, sr=sr)
        return read_wav_mono(converted)
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    return data, sr


def decode_to_wav(src, dst=None, sr=44100, mono=True):
    """用 ffmpeg 把任意音频解码成 WAV（默认 44.1k 单声道 s16），返回绝对路径。"""
    if dst is None:
        dst = temp_path("decoded_%d.wav" % int(time.time() * 1000))
    dst = abs_path(dst)
    ensure_dir_for(dst)
    args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", src,
            "-vn", "-c:a", "pcm_s16le", "-ar", str(int(sr)), "-ac", "1" if mono else "2", dst]
    run_ffmpeg(args, timeout=600)
    return dst


def stft_magnitude(x, nfft, hop, chunk=4096):
    """分块计算 |STFT|（返回 frames x (nfft//2+1) 的 float32 矩阵）。

    分块是为了长音频（几分钟）不会一次性占几百 MB 内存。
    """
    if np is None:
        raise RuntimeError("stft_magnitude 需要 numpy")
    x = np.asarray(x, dtype=np.float32).reshape(-1)
    win = np.hanning(nfft).astype(np.float32)
    if len(x) < nfft:
        return np.zeros((0, nfft // 2 + 1), dtype=np.float32)
    frames = 1 + (len(x) - nfft) // hop
    out = np.empty((frames, nfft // 2 + 1), dtype=np.float32)
    base = np.arange(nfft)[None, :]
    for start in range(0, frames, chunk):
        stop = min(frames, start + chunk)
        indices = np.arange(start, stop)[:, None] * hop + base
        out[start:stop] = np.abs(np.fft.rfft(x[indices] * win, axis=1)).astype(np.float32)
    return out


def cut_fade_mp3(src, dst, start, duration, fade_in=0.10, fade_out=1.2,
                 volume="volume=-1.8dB", bitrate="128k", sr=44100):
    """按「0.10s 淡入 + 1.2s 淡出 + -1.8dB + 128kbps MP3」截取片段（任务书规定）。"""
    dst = abs_path(dst)
    ensure_dir_for(dst)
    fade_out_start = max(0.0, float(duration) - float(fade_out))
    filters = "afade=t=in:st=0:d=%.3f,afade=t=out:st=%.3f:d=%.3f,%s" % (
        float(fade_in), fade_out_start, float(fade_out), volume)
    args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-y",
            "-ss", "%.4f" % float(start), "-t", "%.4f" % float(duration),
            "-i", src, "-vn", "-af", filters,
            "-ar", str(int(sr)), "-ac", "2",
            "-c:a", "libmp3lame", "-b:a", bitrate, dst]
    run_ffmpeg(args, timeout=600)
    return dst


# ---------------------------------------------------------------------------
# 歌词文本匹配工具（fetch_lyrics 与 align_and_cut 共用）
# ---------------------------------------------------------------------------
_WS_RE = re.compile(r"\s+")
_PUNCT_RE = re.compile(r"[^\w]+", re.UNICODE)


def strip_spaces(text):
    """去掉所有空白字符（不做标点归一化）。"""
    return _WS_RE.sub("", text or "")


def normalize_lyric_text(text):
    """歌词比较用的归一化：去空格、去标点/符号，只留文字与数字（保留 CJK）。"""
    return _PUNCT_RE.sub("", (text or "").strip())


def lyric_match_tier(text, query):
    """判断一行歌词与查询句的匹配等级。

    * 2 = 原文精确匹配（只忽略首尾空白）；
    * 1 = 去标点/去空格后包含；
    * 0 = 不匹配。

    分两档是为了在同名不同版本（如原版 vs DJ 版，个别句子标点/空格不同）之间
    优先选择「文字与用户给的原句完全一致」的版本。
    """
    if not text or not query:
        return 0
    if (text or "").strip() == (query or "").strip():
        return 2
    nt = normalize_lyric_text(text)
    nq = normalize_lyric_text(query)
    if not nq:
        return 0
    return 1 if nq in nt else 0


class LyricMatchError(Exception):
    """歌词首/末句定位失败（带候选信息）。"""

    def __init__(self, message, missing=None):
        super().__init__(message)
        self.missing = missing or {}


def locate_lyric_range(all_lines, first_line=None, last_line=None):
    """在 all_lines（[{time,text},...]）中定位首句/末句下标。

    返回 (first_index, last_index, first_tier, last_tier)；
    定位不到抛 LyricMatchError（会记录缺哪句）。
    """
    texts = [str(item.get("text") or "") for item in all_lines]
    if not texts:
        raise LyricMatchError("歌词为空，无法定位", {"missing": "all"})

    # 首句：优先原文精确匹配，其次归一化包含；取最靠前的匹配
    if first_line:
        tiers = [lyric_match_tier(t, first_line) for t in texts]
        best = max(tiers)
        if best == 0:
            raise LyricMatchError("首句在歌词里找不到：%s" % first_line,
                                  {"missing": "first_line", "line": first_line})
        first_index = tiers.index(best)
        first_tier = best
    else:
        first_index, first_tier = 0, 2

    # 末句：只在首句之后找（同一句可能在前面也出现过，避免截出倒序区间）
    if last_line:
        tiers = [lyric_match_tier(t, last_line) if i >= first_index else 0
                 for i, t in enumerate(texts)]
        best = max(tiers)
        if best == 0:
            raise LyricMatchError(
                "末句在首句之后的歌词里找不到：%s（可能版本不符）" % last_line,
                {"missing": "last_line", "line": last_line})
        last_index = tiers.index(best)
        last_tier = best
    else:
        last_index, last_tier = len(texts) - 1, 2

    if last_index < first_index:
        raise LyricMatchError("末句位置在首句之前，区间非法",
                              {"missing": "range", "first_index": first_index,
                               "last_index": last_index})
    return first_index, last_index, first_tier, last_tier
