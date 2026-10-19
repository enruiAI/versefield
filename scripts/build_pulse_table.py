#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""从真实音轨生成「卡点脉冲表」（50fps、hex 0..15、0.13s 衰减）。

页面 `timeline.js` 的 `pulseHex` 就来自这里：core.js 按播放时间查表得到 info.pulse，
15 个场景的鼓点/光晕/心跳都贴这段音乐。算法沿用原脚本（kick/snare/hat 多频段加权 +
自适应阈值峰值 + 指数衰减包络），只做了工程化：

* argparse CLI：`python build_pulse_table.py clip.wav --out meta/pulse_table.txt`
* ffmpeg 自动探测（imageio-ffmpeg / PATH / 环境变量），非 wav 输入自动解码；
* 可被 import：`from build_pulse_table import build_pulse_table; hexstr, rate = build_pulse_table("clip.wav")`
* stdout 只打印一行 JSON 摘要，日志走 stderr。
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (  # noqa: E402
    abs_path, decode_to_wav, ensure_dir_for, jprint, log, read_wav_mono, stft_magnitude,
)

try:
    import numpy as np
except Exception:  # pragma: no cover - 环境缺 numpy 时在调用处报错
    np = None

# 算法常量（与旧脚本保持一致，页面按这个约定查表）
RATE = 50.0          # 每秒样本数（20ms 一格）
BEAT_TAU = 0.13      # 脉冲衰减时间常数（秒）
MIN_GAP = 0.16       # 相邻峰值最小间隔（秒）
NFFT = 1024
HOP = 128


def _load_mono(path):
    """读入单声道 float32 音频；非 wav / 非常规位深时先用 ffmpeg 解码。"""
    if np is None:
        raise RuntimeError("build_pulse_table 需要 numpy，请先安装 numpy")
    path = abs_path(path)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".wav", ".wave"):
        try:
            return read_wav_mono(path)
        except Exception as exc:  # 24bit 等非常规 wav → 走 ffmpeg
            log("直接读取 WAV 失败，改用 ffmpeg 解码：%s" % exc)
    wav = decode_to_wav(path, sr=44100, mono=True)
    return read_wav_mono(wav)


def _band_onset(S, freqs, lo, hi, log_scale=True):
    """某个频段的谱通量包络（归一化到 0..1）。"""
    band = (freqs >= lo) & (freqs < hi)
    energy = S[:, band].sum(axis=1)
    if log_scale:
        energy = np.log1p(energy * 4.0)
    flux = np.concatenate([[0.0], np.maximum(0.0, np.diff(energy))])
    kernel = np.hanning(7)
    kernel /= kernel.sum()
    env = np.convolve(flux, kernel, mode="same")
    return env / (env.max() + 1e-9)


def _detect_peaks(strength, times, min_gap=MIN_GAP):
    """自适应阈值找峰（与旧脚本一致）。"""
    base = np.zeros_like(strength)
    for i in range(1, len(strength)):
        base[i] = base[i - 1] + (strength[i] - base[i - 1]) * 0.02
    threshold = base * 1.55 + 0.025
    peaks = []
    for i in range(2, len(strength) - 2):
        if strength[i] > threshold[i] and strength[i] >= strength[i - 1] \
                and strength[i] >= strength[i + 1]:
            if not peaks or times[i] - peaks[-1] > min_gap:
                peaks.append(float(times[i]))
    return peaks


def _build_pulse(x, sr, rate=RATE, beat_tau=BEAT_TAU):
    """核心：音频 -> (hex 字符串, 峰值列表, 时长)。"""
    S = stft_magnitude(x, NFFT, HOP)
    if len(S) == 0:
        raise RuntimeError("音频太短，无法分析（< %.1fms）" % (NFFT / float(sr) * 1000))
    freqs = np.fft.rfftfreq(NFFT, 1.0 / sr)
    times = np.arange(len(S)) * HOP / sr

    low = _band_onset(S, freqs, 30, 170)          # 底鼓
    mid = _band_onset(S, freqs, 200, 2500)        # 军鼓 / 人声辅音
    high = _band_onset(S, freqs, 2500, 9000)      # 镲片
    strength = 1.0 * low + 0.55 * mid + 0.30 * high

    peaks = _detect_peaks(strength, times)
    duration = len(x) / float(sr)

    # 建 50fps 脉冲包络，再量化到 0..15 的 hex
    n = int(np.ceil(duration * rate)) + 1
    pulse = np.zeros(n, dtype=np.float64)
    for peak in peaks:
        idx = min(len(strength) - 1, int(round(peak * sr / HOP)))
        amp = 0.55 + 0.45 * float(min(1.0, strength[max(0, idx - 2):idx + 3].max()))
        i0 = int(round(peak * rate))
        if i0 >= n:
            continue
        tau = beat_tau * (0.8 + 0.4 * min(1.0, amp))
        i1 = min(n, i0 + int(tau * 4 * rate))
        offsets = (np.arange(i0, i1) - i0) / rate
        values = amp * np.exp(-offsets / tau)
        np.maximum(pulse[i0:i1], values, out=pulse[i0:i1])
    pulse = np.clip(pulse, 0.0, 1.0)
    quantised = np.round(pulse * 15).astype(np.int64)
    hexstr = "".join("%x" % int(v) for v in quantised)
    return hexstr, peaks, duration


def build_pulse_table(wav_path, rate=RATE, beat_tau=BEAT_TAU, verbose=False):
    """（可被 import）生成卡点脉冲表。

    :return: (hexstr, rate) —— rate 为每秒样本数（默认 50）
    """
    x, sr = _load_mono(wav_path)
    hexstr, peaks, duration = _build_pulse(x, sr, rate=rate, beat_tau=beat_tau)
    if verbose:
        gaps = np.diff(peaks) if len(peaks) > 2 else np.array([0.0])
        log("脉冲表：%.2fs / %d 个峰（%.2f 峰/秒，中位间隔 %.3fs）/ %d samples @ %.0ffps" % (
            duration, len(peaks), len(peaks) / max(duration, 1e-9),
            float(np.median(gaps)), len(hexstr), rate))
    return hexstr, float(rate)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def build_parser():
    ap = argparse.ArgumentParser(description="从音轨生成 50fps 卡点脉冲表（hex）")
    ap.add_argument("wav", help="音频文件（wav 直接读；mp3/m4a 等自动用 ffmpeg 解码）")
    ap.add_argument("--out", default="", help="hex 输出文件路径（不给则打印在 JSON 里）")
    ap.add_argument("--rate", type=float, default=RATE, help="每秒样本数（默认 50）")
    ap.add_argument("--ffmpeg", default="", help="指定 ffmpeg 可执行文件路径（默认自动探测）")
    return ap


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.ffmpeg:
        os.environ["FFMPEG_PATH"] = abs_path(args.ffmpeg)
    wav_path = abs_path(args.wav)
    if not os.path.isfile(wav_path):
        jprint({"ok": False, "error": "输入文件不存在: %s" % wav_path})
        return 2
    try:
        x, sr = _load_mono(wav_path)
        hexstr, peaks, duration = _build_pulse(x, sr, rate=args.rate)
    except Exception as exc:
        jprint({"ok": False, "error": str(exc)})
        return 1

    gaps = np.diff(peaks) if len(peaks) > 2 else np.array([0.0])
    log("脉冲表：%.2fs / %d 个峰（%.2f 峰/秒，中位间隔 %.3fs）" % (
        duration, len(peaks), len(peaks) / max(duration, 1e-9), float(np.median(gaps))))

    result = {
        "ok": True,
        "wav": wav_path,
        "duration": round(duration, 3),
        "rate": float(args.rate),
        "samples": len(hexstr),
        "hex_len": len(hexstr),
        "peaks": len(peaks),
        "hex_head": hexstr[:48],
        "hex_tail": hexstr[-48:],
    }
    if args.out:
        out_path = abs_path(args.out)
        ensure_dir_for(out_path)
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            f.write(hexstr)
        result["out"] = out_path
        log("已写入 %s（%d 字符）" % (out_path, len(hexstr)))
    else:
        result["hex"] = hexstr
    jprint(result)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
