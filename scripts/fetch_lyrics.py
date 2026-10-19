#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""搜歌词 + 生成逐句时间轴（QQ 音乐主源，网易云备源）。

用法（任务书约定）：
    python fetch_lyrics.py --song "把回忆拼好给你" --artist "cici_" \
        [--first-line "我们都是渺小真实存在"] [--last-line "爱炙热的你却忘了爱自己"] \
        --out meta/lyrics.json [--platform auto|qq|netease]

输出的 meta/lyrics.json 关键字段：
    all_lines: 过滤掉制作信息后的全部歌词行 [{time, text}]
    range:     {first_index, last_index, lines}，lines 即首句到末句（含）的全部行
    songmid/platform/source_url/match: 命中的是哪个平台的哪首歌（同名不同版本时很重要）

选版本策略（同名歌有原版 / DJ 版 / 加速版等多个候选）：
    1. 按歌名、歌手算基础相关度，按 QQ/网易云的搜索相关度顺序逐个取 LRC；
    2. 若给了 --first-line/--last-line，优先选**原文精确包含**这两句的候选
       （原文精确 > 去标点/空格后包含），避免原版与 DJ 版因个别空格/标点差异选错；
    3. 若给了 --duration（目标完整音频时长），时长匹配的候选优先；
    4. 同档时按搜索相关度顺序取第一个。
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import urllib.parse
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (  # noqa: E402
    LyricMatchError, abs_path, die, ensure_dir_for, http_get_json, jprint,
    locate_lyric_range, log, normalize_lyric_text, save_json,
)

# ---------------------------------------------------------------------------
# 接口地址
# ---------------------------------------------------------------------------
QQ_SEARCH_URL = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp"
QQ_LYRIC_URL = "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg"
QQ_HEADERS = {
    "Referer": "https://y.qq.com/",
    "Origin": "https://y.qq.com",
}
NE_SEARCH_URL = "https://music.163.com/api/search/get/web"
NE_LYRIC_URL = "https://music.163.com/api/song/lyric"
NE_HEADERS = {
    "Referer": "https://music.163.com/",
    "Origin": "https://music.163.com",
}

# LRC 时间标签：[mm:ss]、[mm:ss.xx]、[mm:ss.xxx]，一行可以挂多个标签
TAG_RE = re.compile(r"\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]")

# 制作信息行（“词：xxx”“编曲：xxx”“OP：xxx”……）
CREDIT_PREFIX_RE = re.compile(
    r"^(词|曲|编曲|中文词|统筹|监制|推广|制作|和声|混音|母带|吉他|出品|原唱|演唱|"
    r"作词|作曲|OP|SP|Lyrics|Composer|Arrangement|Producer|Remix|Mixing|Mastering|"
    r"发行|版权|ISRC|录音|配唱|弦乐|策划|企划|出品人|特别感谢)\s*[:：]",
    re.IGNORECASE,
)
# 版权声明行（「本作品经过原版权公司正式授权」/【…授权…】）
COPYRIGHT_RE = re.compile(r"^[「【\[（(].*(授权|版权|OP|SP|作品|未经许可).*[」】\]）)]$")


class LyricsError(Exception):
    """某个平台取歌词失败（带候选清单，方便上层提示用户换歌手/版本）。"""

    def __init__(self, message, platform=None, candidates=None, **extra):
        super().__init__(message)
        self.platform = platform
        self.candidates = candidates or []
        self.extra = extra


# ---------------------------------------------------------------------------
# LRC 解析 / 过滤
# ---------------------------------------------------------------------------
def _frac_seconds(frac):
    """把时间标签里的小数部分转成秒：'' / '5' / '50' / '500'。"""
    if not frac:
        return 0.0
    if len(frac) == 1:
        return int(frac) / 10.0
    if len(frac) == 2:
        return int(frac) / 100.0
    return int(frac) / 1000.0


def parse_lrc_text(text):
    """解析 LRC 文本 -> 按时间排序的 [{time,text}]（保留全部行，含制作信息）。"""
    entries = []
    for raw in (text or "").splitlines():
        line = raw.strip().lstrip("\ufeff")
        if not line:
            continue
        tags = TAG_RE.findall(line)
        if not tags:
            continue
        lyric_text = TAG_RE.sub("", line).strip()
        if not lyric_text:
            continue
        for minute, second, frac in tags:
            t = int(minute) * 60 + int(second) + _frac_seconds(frac)
            entries.append({"time": round(t, 3), "text": lyric_text})
    entries.sort(key=lambda item: item["time"])
    return entries


def is_credit_line(text, song="", artist=""):
    """判断一行是不是“制作人员/标题/版权声明”，是则不应进入歌词行。"""
    t = (text or "").strip()
    if not t:
        return True
    if CREDIT_PREFIX_RE.match(t):
        return True
    if COPYRIGHT_RE.match(t):
        return True
    # 标题行：如 “把回忆拼好给你-cici_”
    if "-" in t and song:
        if normalize_lyric_text(t) == normalize_lyric_text(song + artist):
            return True
    return False


def filter_lyric_lines(entries, song="", artist=""):
    """过滤制作信息/空行，得到“歌曲线”。"""
    return [item for item in entries if not is_credit_line(item["text"], song, artist)]


# ---------------------------------------------------------------------------
# 候选打分（歌名/歌手相关度）
# ---------------------------------------------------------------------------
_PAREN_RE = re.compile(r"[\(（\[【].*?[\)）\]】]")


def _base_title(title):
    """去掉 “(DJ版)”“（新版）” 这类版本后缀，便于比较主歌名。"""
    return _PAREN_RE.sub("", title or "").strip()


def candidate_base_score(candidate, song, artist):
    """歌名相似度(0..1) * 0.72 + 歌手匹配度(0..1) * 0.28。"""
    ns = normalize_lyric_text(song)
    nt = normalize_lyric_text(_base_title(candidate.get("title") or ""))
    if not ns:
        sim = 0.5
    elif ns == nt:
        sim = 1.0
    else:
        sim = SequenceMatcher(None, ns, nt).ratio()

    artist_score = 0.0
    if artist:
        na = normalize_lyric_text(artist)
        names = [normalize_lyric_text(x) for x in (candidate.get("singers") or [])]
        if na and any(na == x or na in x or x in na for x in names if x):
            artist_score = 1.0
        elif na and na in normalize_lyric_text(candidate.get("title") or ""):
            artist_score = 0.5
    else:
        artist_score = 0.5
    return 0.72 * sim + 0.28 * artist_score


# ---------------------------------------------------------------------------
# QQ 音乐
# ---------------------------------------------------------------------------
def qq_search(song, artist, limit=10):
    """QQ 音乐搜索，返回候选歌曲列表（按接口相关度排序）。"""
    keyword = ("%s %s" % (song, artist)).strip() if artist else song
    params = {
        "p": 1, "n": limit, "w": keyword, "format": "json", "cr": 1,
        "g_tk": 5381, "loginUin": 0, "hostUin": 0,
        "inCharset": "utf8", "outCharset": "utf-8", "notice": 0,
        "platform": "yqq", "needNewCode": 0,
    }
    url = QQ_SEARCH_URL + "?" + urllib.parse.urlencode(params)
    data = http_get_json(url, headers=QQ_HEADERS)
    songs = (((data.get("data") or {}).get("song") or {}).get("list")) or []
    candidates = []
    for rank, item in enumerate(songs):
        mid = item.get("songmid") or ""
        if not mid:
            continue
        candidates.append({
            "platform": "qq",
            "id": mid,
            "title": item.get("songname") or "",
            "singers": [s.get("name") for s in (item.get("singer") or []) if s.get("name")],
            "interval": float(item.get("interval") or 0),
            "album": item.get("albumname") or "",
            "rank": rank,
            "source_url": "https://y.qq.com/n/ryqq/songDetail/%s" % mid,
        })
    return candidates


def qq_lyric(candidate):
    """取 QQ 音乐 LRC 文本（优先 nobase64=1，失败再回退 base64 版本）。"""
    mid = candidate["id"]
    base_params = {
        "songmid": mid, "format": "json", "nobase64": 1, "g_tk": 5381,
        "loginUin": 0, "hostUin": 0, "inCharset": "utf8", "outCharset": "utf-8",
        "notice": 0, "platform": "yqq", "needNewCode": 0,
    }
    url = QQ_LYRIC_URL + "?" + urllib.parse.urlencode(base_params)
    data = http_get_json(url, headers=QQ_HEADERS)
    text = data.get("lyric") or ""
    if not text:
        # 兜底：部分曲目 nobase64 参数不生效，返回的是 base64
        params2 = dict(base_params)
        params2.pop("nobase64", None)
        data = http_get_json(QQ_LYRIC_URL + "?" + urllib.parse.urlencode(params2),
                             headers=QQ_HEADERS)
        text = data.get("lyric") or ""
        if text:
            try:
                text = base64.b64decode(text).decode("utf-8", "replace")
            except Exception:
                text = ""
    return text


# ---------------------------------------------------------------------------
# 网易云音乐
# ---------------------------------------------------------------------------
def ne_search(song, artist, limit=10):
    """网易云搜索，返回候选歌曲列表（按接口相关度排序）。"""
    keyword = ("%s %s" % (song, artist)).strip() if artist else song
    params = {"s": keyword, "type": 1, "limit": limit, "offset": 0}
    url = NE_SEARCH_URL + "?" + urllib.parse.urlencode(params)
    data = http_get_json(url, headers=NE_HEADERS)
    if data.get("code") not in (200, None):
        raise LyricsError("网易云搜索接口返回错误: %s" % data.get("code"), platform="netease")
    songs = (((data.get("result") or {}).get("songs")) or [])
    candidates = []
    for rank, item in enumerate(songs):
        sid = item.get("id")
        if sid is None:
            continue
        candidates.append({
            "platform": "netease",
            "id": str(sid),
            "title": item.get("name") or "",
            "singers": [a.get("name") for a in (item.get("artists") or []) if a.get("name")],
            "interval": round(float(item.get("duration") or 0) / 1000.0, 3),
            "album": ((item.get("album") or {}).get("name")) or "",
            "rank": rank,
            "source_url": "https://music.163.com/#/song?id=%s" % sid,
        })
    return candidates


def ne_lyric(candidate):
    """取网易云 LRC 文本。"""
    params = {"id": candidate["id"], "lv": 1, "tv": -1}
    url = NE_LYRIC_URL + "?" + urllib.parse.urlencode(params)
    data = http_get_json(url, headers=NE_HEADERS)
    if data.get("nolyric") or data.get("uncollected"):
        return ""
    return ((data.get("lrc") or {}).get("lyric")) or ""


# ---------------------------------------------------------------------------
# 候选评估 / 选择
# ---------------------------------------------------------------------------
def _candidate_brief(candidate):
    return {
        "platform": candidate.get("platform"),
        "id": candidate.get("id"),
        "title": candidate.get("title"),
        "singers": candidate.get("singers"),
        "interval": candidate.get("interval"),
    }


def evaluate_candidates(candidates, fetch_lyric, song, artist,
                        first_line="", last_line="", duration_hint=None,
                        max_candidates=8):
    """逐个候选取 LRC、解析、定位首尾句，返回 (best, trace)。

    best = (key, candidate, lines, first_index, last_index, first_tier, last_tier) 或 None
    trace = 每个候选的尝试结果（用于失败提示 / 报告）
    """
    trace = []
    best = None
    # 歌手明确时，先只评估歌手匹配的候选；一个都没有再放开
    if artist:
        matched = [c for c in candidates
                   if any(normalize_lyric_text(artist) in normalize_lyric_text(x)
                          or normalize_lyric_text(x) in normalize_lyric_text(artist)
                          for x in (c.get("singers") or []) if x)]
        if matched:
            candidates = matched
    # 按基础相关度 + 搜索顺序排序（相关度高、搜索更靠前的先试）
    scored = sorted(
        candidates,
        key=lambda c: (-candidate_base_score(c, song, artist), c.get("rank", 999)),
    )
    for candidate in scored[:max_candidates]:
        entry = _candidate_brief(candidate)
        try:
            raw_lrc = fetch_lyric(candidate)
        except Exception as exc:  # 单个候选失败不影响其它候选
            entry["error"] = "取 LRC 失败: %s" % exc
            trace.append(entry)
            continue
        entries = parse_lrc_text(raw_lrc)
        lines = filter_lyric_lines(entries, song, artist)
        if len(lines) < 2:
            entry["error"] = "LRC 为空或全是制作信息（原始行 %d，歌词行 %d）" % (len(entries), len(lines))
            trace.append(entry)
            continue
        try:
            first_index, last_index, first_tier, last_tier = locate_lyric_range(
                lines, first_line or None, last_line or None)
        except LyricMatchError as exc:
            entry["error"] = str(exc)
            entry["line_count"] = len(lines)
            trace.append(entry)
            continue

        tier = first_tier + last_tier  # 2..4
        duration_bonus = 0
        if duration_hint and candidate.get("interval"):
            diff = abs(float(candidate["interval"]) - float(duration_hint))
            duration_bonus = 2 if diff <= 2.0 else (1 if diff <= 5.0 else 0)
        base = candidate_base_score(candidate, song, artist)
        entry.update({
            "line_count": len(lines),
            "tier": tier,
            "first_index": first_index,
            "last_index": last_index,
            "range_count": last_index - first_index + 1,
            "base_score": round(base, 4),
            "duration_bonus": duration_bonus,
        })
        trace.append(entry)

        key = (duration_bonus, tier, round(base, 6), -int(candidate.get("rank", 999)))
        if best is None or key > best[0]:
            best = (key, candidate, lines, first_index, last_index, first_tier, last_tier)
        # 已经是最高文本匹配档、又没给时长提示时，后面的候选不可能更好（同档按搜索顺序取先）
        if tier == 4 and not duration_hint:
            break
    return best, trace


# ---------------------------------------------------------------------------
# 平台入口
# ---------------------------------------------------------------------------
def fetch_from_platform(platform, song, artist, first_line, last_line,
                        duration_hint=None, max_candidates=8):
    """在指定平台完成「搜索 -> 取 LRC -> 定位首尾句」，返回结果 dict。"""
    if platform == "qq":
        candidates = qq_search(song, artist)
        fetch_lyric = qq_lyric
    elif platform == "netease":
        candidates = ne_search(song, artist)
        fetch_lyric = ne_lyric
    else:  # pragma: no cover - argparse 已限制
        raise LyricsError("未知平台: %s" % platform, platform=platform)

    if not candidates:
        raise LyricsError("搜索没有结果", platform=platform)
    log("平台 %s 搜到 %d 个候选" % (platform, len(candidates)))

    best, trace = evaluate_candidates(
        candidates, fetch_lyric, song, artist,
        first_line=first_line, last_line=last_line,
        duration_hint=duration_hint, max_candidates=max_candidates)
    for entry in trace:
        log("  - [%s] %s / %s  interval=%ss  %s" % (
            entry.get("id"), entry.get("title"), "/".join(entry.get("singers") or []),
            entry.get("interval"), entry.get("error") or "OK tier=%s lines=%s" % (
                entry.get("tier"), entry.get("line_count"))))
    if best is None:
        missing = []
        if first_line:
            missing.append("首句 %r" % first_line)
        if last_line:
            missing.append("末句 %r" % last_line)
        raise LyricsError(
            "候选里没有同时包含%s的歌词（可能是版本不符）" % ("、".join(missing) or "歌词"),
            platform=platform, candidates=trace)

    _, candidate, lines, first_index, last_index, first_tier, last_tier = best
    return {
        "ok": True,
        "song": song,
        "artist": artist,
        "platform": candidate["platform"],
        "songmid": candidate["id"],
        "source_url": candidate["source_url"],
        "album": candidate.get("album") or "",
        "duration_hint": candidate.get("interval") or None,
        "all_lines": lines,
        "range": {
            "first_index": first_index,
            "last_index": last_index,
            "count": last_index - first_index + 1,
            "lines": lines[first_index:last_index + 1],
        },
        "match": {
            "candidate_title": candidate["title"],
            "candidate_singers": candidate.get("singers") or [],
            "first_tier": first_tier,
            "last_tier": last_tier,
            "query_first": first_line,
            "query_last": last_line,
            "candidate_count": len(trace),
        },
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def build_parser():
    ap = argparse.ArgumentParser(
        description="搜歌词并定位起止句，输出逐句时间轴 JSON（QQ 主源 / 网易云备源）")
    ap.add_argument("--song", required=True, help="歌名")
    ap.add_argument("--artist", default="", help="歌手（同名歌多时建议给）")
    ap.add_argument("--first-line", default="", help="首句歌词（原句文本，包含匹配）")
    ap.add_argument("--last-line", default="", help="末句歌词（原句文本，包含匹配）")
    ap.add_argument("--out", required=True, help="输出 lyrics.json 路径")
    ap.add_argument("--platform", choices=["auto", "qq", "netease"], default="auto",
                    help="歌词平台（默认 auto：先 QQ 后网易云）")
    ap.add_argument("--duration", type=float, default=None,
                    help="目标完整音频时长（秒）。可选，用于在同名不同版本间优先选时长匹配的 LRC")
    ap.add_argument("--max-candidates", type=int, default=8,
                    help="每个平台最多取几个候选的 LRC（默认 8）")
    return ap


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.first_line and not args.first_line.strip():
        args.first_line = ""
    if args.last_line and not args.last_line.strip():
        args.last_line = ""
    if args.duration is not None and args.duration <= 0:
        die("--duration 必须是正数", code=2)

    platforms = ["qq", "netease"] if args.platform == "auto" else [args.platform]
    attempts = []
    result = None
    for platform in platforms:
        try:
            result = fetch_from_platform(
                platform, args.song, args.artist, args.first_line, args.last_line,
                duration_hint=args.duration, max_candidates=args.max_candidates)
            log("平台 %s 命中：%s / %s (%s)" % (
                platform, result["match"]["candidate_title"],
                "/".join(result["match"]["candidate_singers"]), result["songmid"]))
            break
        except LyricsError as exc:
            log("平台 %s 失败：%s" % (platform, exc))
            attempts.append({
                "platform": platform,
                "error": str(exc),
                "candidates": exc.candidates,
            })
        except Exception as exc:  # 网络/接口异常
            log("平台 %s 请求异常：%s: %s" % (platform, type(exc).__name__, exc))
            attempts.append({"platform": platform, "error": "请求异常: %s" % exc,
                             "candidates": []})

    if result is None:
        die("所有歌词源都失败：请确认歌名/歌手是否准确，或让用户提供歌词文本/时间点。",
            code=2, attempts=attempts,
            hint="可用 --platform qq / netease 单测；或手动写 lyrics.json（字段见技能文档 Step 1）")

    out_path = abs_path(args.out)
    ensure_dir_for(out_path)
    save_json(out_path, result)
    log("已写入 %s（平台=%s，songmid=%s，歌词行=%d，区间 %d 句：%s → %s）" % (
        out_path, result["platform"], result["songmid"], len(result["all_lines"]),
        result["range"]["count"],
        human_lyric(result["range"]["lines"][0]) if result["range"]["lines"] else "-",
        human_lyric(result["range"]["lines"][-1]) if result["range"]["lines"] else "-"))

    summary = dict(result)
    summary["out"] = out_path
    jprint(summary)
    return 0


def human_lyric(item):
    """调试日志用：'[mm:ss.xx] 歌词'。"""
    t = float(item.get("time") or 0)
    return "[%02d:%05.2f] %s" % (int(t // 60), t % 60, item.get("text") or "")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
