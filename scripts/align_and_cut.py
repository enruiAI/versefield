#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""起音校准 + 截取片段 + 截段复测 + 卡点表（versefield 最关键的质量门禁）。

流程：
    1. 读 lyrics.json，按 --first-line/--last-line（或 lyrics.json 里的 range）确定要做的区间；
    2. ffmpeg 解码完整音源为 44.1k 单声道 wav；
    3. 人声起音检测（500–4000Hz 谱通量 + 自适应峰值）逐句找最近起音点，
       delta = onset - lrc_time；命中率（|delta| ≤ tolerance）≥90% 才继续，
       否则报错并打印每句 delta（同名单曲≠同一录音，绝不能跳过这道门禁）；
    4. 截取：cut_start = 首句时间 - lead_in，
       cut_end = 末句时间 + tail（tail auto = 留 4.5~8s 余韵，且收在下一句前 2s）；
       0.10s 淡入 + 1.2s 淡出 + volume=-1.8dB + 128kbps MP3；
    5. 把截段解码回 wav，按相对时间复测同样的 15 个 delta；
    6. 生成 50fps 卡点 pulse hex 表（build_pulse_table）；
    7. 写 cut.json（绝对路径 + 每句 abs/rel/delta + 两轮 alignment），stdout 打印同内容摘要。
"""

from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (  # noqa: E402
    LyricMatchError, abs_path, cut_fade_mp3, decode_to_wav, die, ensure_dir_for,
    jprint, load_json, locate_lyric_range, log, probe_media, read_wav_mono,
    save_json, stft_magnitude,
)
from build_pulse_table import build_pulse_table  # noqa: E402

try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None

# 起音检测参数（沿用项目里验证过的 check_lrc_align.py，并做了轻微工程化）
NFFT = 2048
HOP = 256               # 44.1k 下约 5.8ms 一帧
ONSET_LO = 500.0        # 人声频段下限（Hz）
ONSET_HI = 4000.0       # 人声频段上限（Hz）
SMOOTH = 11             # 谱通量平滑窗
SEARCH_WINDOW = 1.2     # 每句在 LRC 时间 ±1.2s 内找最近起音
MIN_PEAK_GAP = 0.22     # 相邻起音最小间隔（秒）

# 截段参数
FADE_IN = 0.10
FADE_OUT = 1.2
VOLUME = "volume=-1.8dB"
BITRATE = "128k"


# ---------------------------------------------------------------------------
# 起音检测
# ---------------------------------------------------------------------------
def onset_envelope(x, sr):
    """500–4000Hz 谱通量包络（log 压缩 + 正差分 + 平滑）。"""
    S = stft_magnitude(x, NFFT, HOP)
    if len(S) == 0:
        raise RuntimeError("音频太短，无法做起音检测")
    freqs = np.fft.rfftfreq(NFFT, 1.0 / sr)
    band = (freqs >= ONSET_LO) & (freqs < ONSET_HI)
    energy = np.log1p(S[:, band].sum(axis=1) * 3.0)
    flux = np.concatenate([[0.0], np.maximum(0.0, np.diff(energy))])
    kernel = np.hanning(SMOOTH)
    kernel /= kernel.sum()
    env = np.convolve(flux, kernel, mode="same")
    times = np.arange(len(env)) * HOP / float(sr)
    return env, times


def detect_peaks(x, sr, min_gap=MIN_PEAK_GAP):
    """自适应阈值峰值检测，返回起音时间数组（秒）。"""
    env, times = onset_envelope(x, sr)
    base = np.zeros_like(env)
    for i in range(1, len(env)):
        base[i] = base[i - 1] + (env[i] - base[i - 1]) * 0.02
    threshold = base * 1.7 + 0.02
    peaks = []
    for i in range(2, len(env) - 2):
        if env[i] > threshold[i] and env[i] >= env[i - 1] and env[i] >= env[i + 1]:
            if not peaks or times[i] - peaks[-1] > min_gap:
                peaks.append(float(times[i]))
    return np.asarray(peaks, dtype=np.float64)


def match_targets(peaks, targets, tolerance, window=SEARCH_WINDOW):
    """对每个目标时间找最近起音点 -> [{target,onset,delta,hit}]，并汇总。"""
    rows = []
    for target in targets:
        onset = None
        delta = None
        if len(peaks):
            candidates = peaks[np.abs(peaks - target) <= window]
            if len(candidates):
                onset = float(candidates[np.argmin(np.abs(candidates - target))])
                delta = onset - target
        rows.append({
            "target": round(float(target), 3),
            "onset": None if onset is None else round(onset, 3),
            "delta": None if delta is None else round(delta, 3),
            "hit": bool(delta is not None and abs(delta) <= tolerance),
        })
    hits = sum(1 for row in rows if row["hit"])
    deltas = [abs(row["delta"]) for row in rows if row["delta"] is not None]
    max_abs = max(deltas) if deltas else None
    return rows, hits, max_abs


def alignment_summary(rows, tolerance):
    """两轮对齐共用的汇总字段（ok = 命中率≥90% 且 max|delta|≤tolerance）。"""
    total = len(rows)
    hits = sum(1 for row in rows if row["hit"])
    deltas = [abs(row["delta"]) for row in rows if row["delta"] is not None]
    max_abs = max(deltas) if deltas else None
    ratio = (hits / float(total)) if total else 0.0
    ok = bool(total > 0 and ratio >= 0.9 and max_abs is not None and max_abs <= tolerance)
    return {
        "hits": hits,
        "total": total,
        "hit_ratio": round(ratio, 3),
        "max_abs_delta": None if max_abs is None else round(max_abs, 3),
        "tolerance": round(float(tolerance), 3),
        "ok": ok,
    }


# ---------------------------------------------------------------------------
# 歌词区间
# ---------------------------------------------------------------------------
def load_lyric_lines(lyrics):
    """从 lyrics.json 里取全部歌词行（兼容只有 range.lines 的手写文件）。"""
    lines = lyrics.get("all_lines")
    if not isinstance(lines, list) or not lines:
        lines = ((lyrics.get("range") or {}).get("lines")) or []
    if not lines:
        raise ValueError("lyrics.json 既没有 all_lines 也没有 range.lines")
    return [{"time": float(item["time"]), "text": str(item.get("text") or "")}
            for item in lines]


def resolve_range(lines, first_line, last_line):
    """确定区间下标；给了首尾句就重新定位（能发现 lyrics.json 与用户文本不一致）。"""
    if (first_line and not last_line) or (last_line and not first_line):
        raise ValueError("--first-line 与 --last-line 必须同时给，或都不给（用 lyrics.json 的 range）")
    if first_line and last_line:
        first_index, last_index, first_tier, last_tier = locate_lyric_range(
            lines, first_line, last_line)
        return first_index, last_index, {"first_tier": first_tier, "last_tier": last_tier,
                                         "source": "cli"}
    return 0, len(lines) - 1, {"source": "lyrics.json", "first_tier": 2, "last_tier": 2}


def resolve_tail(tail_arg, lines, last_index, last_time, cut_start, source_duration):
    """计算 --tail：数字直接用；auto 时留 4.5~8s 余韵并收在下一句前 2s。"""
    if str(tail_arg).lower() != "auto":
        tail = float(tail_arg)
        if tail < 0:
            raise ValueError("--tail 不能是负数")
        return tail, "manual"
    next_time = None
    if last_index + 1 < len(lines):
        next_time = float(lines[last_index + 1]["time"])
    if next_time is not None and next_time > last_time:
        gap = next_time - last_time
        # 至少留 4.5s 收尾；下一句还远时最多留 8s，并且不把下一句唱词收进片段
        tail = min(max(gap - 2.0, 4.5), 8.0)
        return tail, "auto"
    return 4.5, "auto(tail-of-song)"


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def build_parser():
    ap = argparse.ArgumentParser(
        description="起音校准 + 截取歌词片段 + 截段复测 + 生成卡点脉冲表")
    ap.add_argument("--audio", required=True, help="完整音源（m4a/mp3/wav…）")
    ap.add_argument("--lyrics", required=True, help="fetch_lyrics.py 产出的 lyrics.json")
    ap.add_argument("--first-line", default="", help="首句歌词（可选，默认用 lyrics.json 的 range）")
    ap.add_argument("--last-line", default="", help="末句歌词（可选，默认用 lyrics.json 的 range）")
    ap.add_argument("--lead-in", type=float, default=0.4,
                    help="首句前留多少秒（默认 0.4）")
    ap.add_argument("--tail", default="auto",
                    help="末句后留多少秒；auto=4.5~8s 余韵且收在下一句前 2s（默认 auto）")
    ap.add_argument("--out-mp3", required=True, help="截取后的 MP3 输出路径")
    ap.add_argument("--out-meta", default="", help="cut.json 输出路径（默认与 MP3 同目录）")
    ap.add_argument("--pulse-file", default="", help="卡点 hex 输出路径（默认与 MP3 同目录）")
    ap.add_argument("--tolerance", type=float, default=0.5,
                    help="起音命中阈值（秒，默认 0.5；验收要求 max|delta|≤0.35）")
    return ap


def main(argv=None):
    args = build_parser().parse_args(argv)
    if np is None:
        die("缺少 numpy，无法做音频分析（pip install numpy）", code=2)
    if args.lead_in < 0:
        die("--lead-in 不能是负数", code=2)
    if args.tolerance <= 0:
        die("--tolerance 必须是正数", code=2)

    audio_path = abs_path(args.audio)
    if not os.path.isfile(audio_path):
        die("音源文件不存在: %s" % audio_path, code=2)
    lyrics_path = abs_path(args.lyrics)
    if not os.path.isfile(lyrics_path):
        die("歌词文件不存在: %s" % lyrics_path, code=2)
    out_mp3 = abs_path(args.out_mp3)
    ensure_dir_for(out_mp3)
    out_meta = abs_path(args.out_meta) if args.out_meta else os.path.join(
        os.path.dirname(out_mp3), "cut.json")
    pulse_file = abs_path(args.pulse_file) if args.pulse_file else os.path.join(
        os.path.dirname(out_mp3), "pulse_table.txt")

    t_start = time.time()
    # ---- 1. 歌词区间 -----------------------------------------------------
    try:
        lyrics = load_json(lyrics_path)
        all_lines = load_lyric_lines(lyrics)
        first_index, last_index, range_info = resolve_range(
            all_lines, args.first_line.strip(), args.last_line.strip())
    except (ValueError, LyricMatchError) as exc:
        die("歌词区间解析失败: %s" % exc, code=2,
            hint="检查 lyrics.json 的 all_lines/range，或确认 --first-line/--last-line 文本")
    range_lines = all_lines[first_index:last_index + 1]
    if len(range_lines) < 2:
        die("区间里只有 %d 句歌词，太短，无法做歌词视频（至少 2 句）" % len(range_lines), code=2)
    first_time = float(range_lines[0]["time"])
    last_time = float(range_lines[-1]["time"])
    log("区间：%d 句（all_lines[%d:%d]），首句 %.2fs「%s」，末句 %.2fs「%s」" % (
        len(range_lines), first_index, last_index + 1, first_time,
        range_lines[0]["text"], last_time, range_lines[-1]["text"]))

    # ---- 2. 解码完整音源 -------------------------------------------------
    try:
        src_wav = decode_to_wav(audio_path, sr=44100, mono=True)
        x, sr = read_wav_mono(src_wav)
    except Exception as exc:
        die("音源解码失败: %s" % exc, code=1)
    source_duration = len(x) / float(sr)
    if last_time >= source_duration:
        die("末句时间 %.2fs 超出音源时长 %.2fs，音源不完整或版本不符" % (
            last_time, source_duration), code=3)
    log("音源：%.2fs / %dHz（解码耗时 %.1fs）" % (
        source_duration, sr, time.time() - t_start))

    # ---- 3. 完整音源起音对齐（质量门禁） ---------------------------------
    t0 = time.time()
    peaks = detect_peaks(x, sr)
    targets = [float(line["time"]) for line in range_lines]
    rows, hits, max_abs = match_targets(peaks, targets, args.tolerance)
    source_alignment = alignment_summary(rows, args.tolerance)
    log("完整音源起音检测：%d 个峰；LRC 逐句对齐 %d/%d 命中，max|delta|=%s（阈值 %.2fs，耗时 %.1fs）" % (
        len(peaks), source_alignment["hits"], source_alignment["total"],
        source_alignment["max_abs_delta"], args.tolerance, time.time() - t0))
    for line, row in zip(range_lines, rows):
        log("  LRC %s  起音 %s  delta %s  %s「%s」" % (
            _fmt(row["target"]), _fmt(row["onset"]),
            ("%+.2f" % row["delta"]) if row["delta"] is not None else "  none",
            "✓" if row["hit"] else "✗", line["text"]))

    if not source_alignment["ok"]:
        diagnostic = {
            "ok": False,
            "stage": "source-align",
            "error": "完整音源起音与 LRC 命中率不足（可能是音源不是 LRC 对应的版本）",
            "audio_source": audio_path,
            "source_duration": round(source_duration, 3),
            "alignment": source_alignment,
            "lines": _line_rows(range_lines, rows),
            "hint": "换完整音源（同名翻唱/原版很多，务必用 LRC 对应版本），或让用户提供音频；不要强行交付",
        }
        save_json(out_meta, diagnostic)
        die(diagnostic["error"], code=3, alignment=source_alignment,
            lines=diagnostic["lines"], out_meta=out_meta,
            hint="检查 fetch_lyrics 命中的 songmid/版本与 fetch_audio 的音源是否同版；"
                 "可用 --tolerance 放宽复测，但不要跳过")

    # ---- 4. 计算截段并截取 ----------------------------------------------
    cut_start = max(0.0, first_time - max(0.0, args.lead_in))
    try:
        tail, tail_mode = resolve_tail(args.tail, all_lines, last_index, last_time,
                                       cut_start, source_duration)
    except ValueError as exc:
        die("--tail 参数错误: %s" % exc, code=2)
    cut_end = min(last_time + tail, source_duration - 0.02)
    duration = cut_end - cut_start
    if duration <= 1.0:
        die("截段时长只有 %.2fs，太小（检查 --lead-in/--tail）" % duration, code=2)
    log("截段：%.2fs → %.2fs（时长 %.2fs，lead_in=%.2fs，tail=%.2fs/%s）" % (
        cut_start, cut_end, duration, args.lead_in, tail, tail_mode))

    t0 = time.time()
    try:
        cut_fade_mp3(audio_path, out_mp3, cut_start, duration,
                     fade_in=FADE_IN, fade_out=FADE_OUT, volume=VOLUME,
                     bitrate=BITRATE, sr=44100)
    except Exception as exc:
        die("截取失败: %s" % exc, code=1)
    mp3_info = probe_media(out_mp3)
    log("已生成 %s（%.2fs / %.0f KB / %s，耗时 %.1fs）" % (
        out_mp3, mp3_info.get("duration") or -1,
        os.path.getsize(out_mp3) / 1024.0, mp3_info.get("audio_codec"),
        time.time() - t0))

    # ---- 5. 截段复测（相对时间再算 15 个 delta） --------------------------
    t0 = time.time()
    try:
        clip_wav = decode_to_wav(out_mp3, sr=44100, mono=True)
        clip_x, clip_sr = read_wav_mono(clip_wav)
        clip_peaks = detect_peaks(clip_x, clip_sr)
    except Exception as exc:
        die("截段解码/复测失败: %s" % exc, code=1)
    rel_targets = [float(line["time"]) - cut_start for line in range_lines]
    cut_rows, cut_hits, cut_max_abs = match_targets(clip_peaks, rel_targets, args.tolerance)
    for row, rel in zip(cut_rows, rel_targets):
        row["rel_target"] = round(rel, 3)
    cut_alignment = alignment_summary(cut_rows, args.tolerance)
    log("截段复测：%d 句 %d/%d 命中，max|delta|=%s（耗时 %.1fs）" % (
        len(cut_rows), cut_alignment["hits"], cut_alignment["total"],
        cut_alignment["max_abs_delta"], time.time() - t0))
    if not cut_alignment["ok"]:
        log("截段复测未通过，仍会写 cut.json 供排查（ok=false）")

    # ---- 6. 卡点脉冲表 ---------------------------------------------------
    t0 = time.time()
    try:
        pulse_hex, pulse_rate = build_pulse_table(clip_wav, verbose=False)
        ensure_dir_for(pulse_file)
        with open(pulse_file, "w", encoding="utf-8", newline="") as f:
            f.write(pulse_hex)
        log("卡点表：%d 字符 @ %.0ffps（%.2fs，耗时 %.1fs）-> %s" % (
            len(pulse_hex), pulse_rate, len(pulse_hex) / pulse_rate, time.time() - t0,
            pulse_file))
    except Exception as exc:
        die("卡点表生成失败: %s" % exc, code=1)

    # ---- 7. cut.json -----------------------------------------------------
    lines_out = _line_rows(range_lines, rows, cut_rows=cut_rows, cut_start=cut_start)
    outputs = {
        "mp3": out_mp3,
        "pulse_hex_file": pulse_file,
        "cut_meta": out_meta,
        "pulse_rate": pulse_rate,
        "pulse_samples": len(pulse_hex),
    }
    ok = bool(source_alignment["ok"] and cut_alignment["ok"])
    cut_json = {
        "ok": ok,
        "audio_source": audio_path,
        "lyrics_source": lyrics_path,
        "song": lyrics.get("song") or "",
        "artist": lyrics.get("artist") or "",
        "platform": lyrics.get("platform") or "",
        "songmid": lyrics.get("songmid") or "",
        "source_duration": round(source_duration, 3),
        "cut_start": round(cut_start, 3),
        "cut_end": round(cut_end, 3),
        "duration": round(duration, 3),
        "lead_in": round(float(args.lead_in), 3),
        "tail": round(float(tail), 3),
        "tail_mode": tail_mode,
        "range": {
            "first_index": first_index,
            "last_index": last_index,
            "count": len(range_lines),
            "first_line": range_lines[0]["text"],
            "last_line": range_lines[-1]["text"],
            "first_time": round(first_time, 3),
            "last_time": round(last_time, 3),
            "info": range_info,
        },
        "lines": lines_out,
        "alignment": source_alignment,
        "cut_alignment": cut_alignment,
        "outputs": outputs,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    save_json(out_meta, cut_json)
    log("已写入 %s（ok=%s）" % (out_meta, ok))

    if not ok:
        die("截段复测未通过：cut_alignment.ok=false，明细见 cut.json", code=3,
            cut_alignment=cut_alignment, source_alignment=source_alignment,
            out_meta=out_meta, outputs=outputs)
    jprint(cut_json)
    log("完成，总耗时 %.1fs" % (time.time() - t_start))
    return 0


# ---------------------------------------------------------------------------
# 小工具
# ---------------------------------------------------------------------------
def _fmt(seconds):
    return "----" if seconds is None else "%6.2f" % float(seconds)


def _line_rows(range_lines, rows, cut_rows=None, cut_start=None):
    """组装 cut.json 里的 lines 数组。"""
    out = []
    for i, (line, row) in enumerate(zip(range_lines, rows)):
        item = {
            "index": i,
            "abs": round(float(line["time"]), 3),
            "lyric": line["text"],
            "delta": row["delta"],
            "onset_abs": row["onset"],
        }
        if cut_start is not None:
            item["rel"] = round(float(line["time"]) - cut_start, 3)
        if cut_rows is not None and i < len(cut_rows):
            item["cut_onset_rel"] = cut_rows[i]["onset"]
            item["cut_delta"] = cut_rows[i]["delta"]
            item["cut_hit"] = cut_rows[i]["hit"]
        out.append(item)
    return out


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
