#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""找完整音源（回归验收用 B 站公开视频，也支持本地文件 / 网易云直链 / 自动搜索）。

用法：
    python fetch_audio.py --song "把回忆拼好给你" --artist "cici_" --out assets/full.m4a
    python fetch_audio.py --url https://www.bilibili.com/video/av598640625 --out assets/full.m4a
    python fetch_audio.py --file D:\\music\\foo.mp3 --out assets/full.m4a
    python fetch_audio.py --netease-id 2022362651 --out assets/full.m4a

尝试顺序（返回第一个通过时长校验的音源）：
    1. --file       本地文件（复制/转码，最稳）
    2. --url        用 ffmpeg 先探测是不是直链音频；不是就走 yt-dlp（B 站等公开页面）
    3. --netease-id 网易云外链直链（music.163.com/song/media/outer/url）
    4. auto         网易云搜索同名歌曲逐个试直链；B 站 wbi 搜索同名视频（时长匹配）→ yt-dlp
                   （--no-auto 可关闭；auto 只是兜底，失败不致命）

成功时 stdout 打印一行 JSON：
    {"ok": true, "file": "<绝对路径>", "duration": 171.496, "platform": "bilibili",
     "source_url": "...", "title": "...", "size": ..., "attempts": [...]}
"""

from __future__ import annotations

import argparse
import hashlib
import http.cookiejar
import json
import os
import re
import shutil
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (  # noqa: E402
    BROWSER_UA, abs_path, die, ensure_dir_for, http_download, http_get_json,
    jprint, log, normalize_lyric_text, page_referer, probe_media, run_ffmpeg, temp_dir,
)

# 网易云请求头
NE_HEADERS = {"Referer": "https://music.163.com/", "Origin": "https://music.163.com"}
BILI_HEADERS = {"Referer": "https://www.bilibili.com/", "Origin": "https://www.bilibili.com"}

# 目标文件扩展名 -> ffmpeg 转码参数
TRANSCODE_ARGS = {
    ".mp3": ["-c:a", "libmp3lame", "-b:a", "192k"],
    ".m4a": ["-c:a", "aac", "-b:a", "192k"],
    ".aac": ["-c:a", "aac", "-b:a", "192k"],
    ".wav": ["-c:a", "pcm_s16le"],
    ".flac": ["-c:a", "flac"],
}


# ---------------------------------------------------------------------------
# 通用：校验 / 落地
# ---------------------------------------------------------------------------
def validate_audio(path, min_duration, max_duration, expect_duration=None,
                   expect_tolerance=3.0):
    """校验一个音频文件可解码、有时长、在 [min,max] 内，返回探测信息 dict。"""
    info = probe_media(path)
    if not info.get("audio"):
        raise RuntimeError("不是可解码的音频文件: %s" % path)
    duration = info.get("duration")
    if duration is None or duration <= 0:
        raise RuntimeError("探测不到音频时长: %s" % path)
    if duration < float(min_duration) or duration > float(max_duration):
        raise RuntimeError("时长 %.2fs 不在允许区间 [%ss, %ss]" % (
            duration, min_duration, max_duration))
    if expect_duration:
        diff = abs(duration - float(expect_duration))
        if diff > expect_tolerance:
            raise RuntimeError("时长 %.2fs 与期望 %.2fs 相差 %.2fs（>%.1fs），可能不是同一版本" % (
                duration, float(expect_duration), diff, expect_tolerance))
    return info


def finalize_audio(src, out):
    """把候选音频落地到 --out：同扩展名直接复制，否则 ffmpeg 转码。返回 out 绝对路径。"""
    src = abs_path(src)
    out = abs_path(out)
    ensure_dir_for(out)
    if src == out:
        return out
    src_ext = os.path.splitext(src)[1].lower()
    out_ext = os.path.splitext(out)[1].lower()
    if src_ext == out_ext:
        shutil.copyfile(src, out)
    else:
        args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                "-i", src, "-vn"] + TRANSCODE_ARGS.get(out_ext, ["-c:a", "copy"]) + [out]
        run_ffmpeg(args)
    return out


# ---------------------------------------------------------------------------
# 各来源尝试（返回 (本地文件, meta)；失败抛异常）
# ---------------------------------------------------------------------------
def attempt_local_file(path, args):
    """--file：本地音源（最稳，直接用）。"""
    path = abs_path(path)
    if not os.path.isfile(path):
        raise RuntimeError("本地文件不存在: %s" % path)
    return path, {
        "platform": "local",
        "source_url": path,
        "title": os.path.basename(path),
    }


def attempt_url(url, args):
    """--url：先当直链音频探测；不是音频就用 yt-dlp 提取（B 站等公开页面）。"""
    if not re.match(r"^https?://", url, re.I):
        raise RuntimeError("--url 需要 http(s) 链接: %s" % url)

    headers = {"Referer": page_referer(url)}
    # 1) 用 ffmpeg 探测这个 URL 本身是不是音频（直链 mp3/m4a/…）
    direct = None
    try:
        direct = probe_media(url, headers=headers, timeout=45)
    except Exception as exc:
        log("  --url 直链探测失败（转 yt-dlp）：%s" % exc)
    if direct and direct.get("audio") and (direct.get("duration") or 0) > 0:
        log("  --url 是直链音频（%.1fs），用 ffmpeg 下载" % direct["duration"])
        tmp = os.path.join(args._tmpdir, "_url_direct.m4a")
        header_arg = "".join("%s: %s\r\n" % (k, v) for k, v in headers.items())
        run_ffmpeg(["-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                    "-headers", header_arg, "-i", url,
                    "-vn", "-c:a", "aac", "-b:a", "192k", tmp], timeout=900)
        return tmp, {
            "platform": "direct-url",
            "source_url": url,
            "title": os.path.basename(urllib.parse.urlparse(url).path) or url,
        }

    # 2) 页面 URL → yt-dlp 提取音频（B 站等）
    return attempt_ytdlp(url, args)


def attempt_ytdlp(url, args):
    """用 yt-dlp 从公开视频页提取音频（B 站等）。"""
    try:
        import yt_dlp  # 延迟 import，报错信息更友好
    except Exception as exc:
        raise RuntimeError("需要 yt-dlp 才能下载视频页音频（pip install yt-dlp）：%s" % exc)

    outtmpl = os.path.join(args._tmpdir, "_ytdlp_%(id)s.%(ext)s")
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "noprogress": True,
        "socket_timeout": 40,
        "retries": 2,
        "format": "bestaudio[ext=m4a]/bestaudio/best",
        "outtmpl": outtmpl,
        "http_headers": {
            "User-Agent": BROWSER_UA,
            "Referer": page_referer(url),
        },
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)

    downloaded = None
    for req in (info.get("requested_downloads") or []):
        candidate = req.get("filepath")
        if candidate and os.path.isfile(candidate):
            downloaded = candidate
            break
    if downloaded is None:  # 兜底：在临时目录里找
        for name in sorted(os.listdir(args._tmpdir)):
            if name.startswith("_ytdlp_"):
                downloaded = os.path.join(args._tmpdir, name)
                break
    if downloaded is None:
        raise RuntimeError("yt-dlp 下载完成但找不到音频文件（url=%s）" % url)

    extractor = (info.get("extractor_key") or info.get("extractor") or "").lower()
    platform = "bilibili" if "bili" in extractor else (extractor or "yt-dlp")
    return downloaded, {
        "platform": platform,
        "source_url": info.get("webpage_url") or url,
        "title": info.get("title") or "",
        "expected_duration": info.get("duration"),
    }


def netease_outer_url(song_id):
    """网易云外链直链（无版权/VIP 会返回 404 或极小文件）。"""
    return "https://music.163.com/song/media/outer/url?id=%s.mp3" % str(song_id).strip()


def attempt_netease_id(song_id, args, title=""):
    """--netease-id：直接下载网易云外链。"""
    url = netease_outer_url(song_id)
    tmp = os.path.join(args._tmpdir, "_netease_%s.mp3" % re.sub(r"\W+", "", str(song_id)))
    size = http_download(url, tmp, headers=NE_HEADERS, timeout=300)
    if size < 20000:
        raise RuntimeError("网易云外链返回文件过小(%d bytes)，多为版权/VIP 限制" % size)
    return tmp, {
        "platform": "netease",
        "source_url": "https://music.163.com/#/song?id=%s" % str(song_id),
        "title": title or ("netease-%s" % song_id),
    }


# ---------------------------------------------------------------------------
# auto：网易云搜索 + B 站搜索
# ---------------------------------------------------------------------------
def netease_search_candidates(song, artist, limit=8):
    """网易云搜索候选（不用登录）。"""
    keyword = ("%s %s" % (song, artist)).strip() if artist else song
    params = {"s": keyword, "type": 1, "limit": limit, "offset": 0}
    url = "https://music.163.com/api/search/get/web?" + urllib.parse.urlencode(params)
    data = http_get_json(url, headers=NE_HEADERS)
    songs = (((data.get("result") or {}).get("songs")) or [])
    out = []
    for rank, item in enumerate(songs):
        if item.get("id") is None:
            continue
        out.append({
            "platform": "netease",
            "id": item.get("id"),
            "title": item.get("name") or "",
            "singers": [a.get("name") for a in (item.get("artists") or []) if a.get("name")],
            "duration": round(float(item.get("duration") or 0) / 1000.0, 3),
            "rank": rank,
        })
    return out


# --- B 站 wbi 签名搜索（B 站搜索接口需要签名，否则 412）---------------------
_WBI_MIXIN_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42,
    19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60,
    51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]
_BILI_OPENER = None
_BILI_MIXIN = None


def _bili_opener():
    """带 buvid cookie 的 urllib opener（B 站接口对裸请求常返回 412）。"""
    global _BILI_OPENER
    if _BILI_OPENER is not None:
        return _BILI_OPENER
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    opener.addheaders = [
        ("User-Agent", BROWSER_UA),
        ("Referer", "https://www.bilibili.com/"),
        ("Origin", "https://www.bilibili.com"),
        ("Accept-Language", "zh-CN,zh;q=0.9"),
    ]
    try:
        spi = _bili_get_json(opener, "https://api.bilibili.com/x/frontend/finger/spi")
        data = spi.get("data") or {}
        if data.get("b_3"):
            opener.addheaders.append(
                ("Cookie", "buvid3=%s; buvid4=%s" % (data.get("b_3"), data.get("b_4", ""))))
    except Exception as exc:
        log("  B 站 cookie 初始化失败（继续尝试）：%s" % exc)
    _BILI_OPENER = opener
    return opener


def _bili_get_json(opener, url, timeout=20):
    with opener.open(url, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", "replace"))


def _bili_mixin_key():
    """取 wbi 签名用的 mixin key（从 nav 接口的 wbi_img 文件名重排）。"""
    global _BILI_MIXIN
    if _BILI_MIXIN:
        return _BILI_MIXIN
    opener = _bili_opener()
    nav = _bili_get_json(opener, "https://api.bilibili.com/x/web-interface/nav")
    data = nav.get("data") or {}
    img_url = (data.get("wbi_img") or {}).get("img_url", "")
    sub_url = (data.get("wbi_img") or {}).get("sub_url", "")
    if not img_url or not sub_url:
        raise RuntimeError("B 站 nav 接口没有返回 wbi_img（搜索接口不可用）")
    img_key = img_url.rsplit("/", 1)[-1].split(".")[0]
    sub_key = sub_url.rsplit("/", 1)[-1].split(".")[0]
    raw = img_key + sub_key
    _BILI_MIXIN = "".join(raw[i] for i in _WBI_MIXIN_TAB)[:32]
    return _BILI_MIXIN


def bilibili_search_videos(keyword, page=1):
    """B 站 wbi 签名搜索视频，返回原始 result 列表（失败抛异常）。"""
    if not keyword or not keyword.strip():
        return []
    opener = _bili_opener()
    mixin = _bili_mixin_key()
    params = {
        "search_type": "video",
        "keyword": keyword.strip(),
        "page": page,
        "page_size": 20,
        "wts": int(time.time()),
    }
    params = dict(sorted(params.items()))
    # 注意：B 站搜索接口要求空格编码成 %20（用 quote_plus 的 '+' 会返回 0 条结果）
    query = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    sign_query = urllib.parse.urlencode(params, safe="!()*", quote_via=urllib.parse.quote)
    w_rid = hashlib.md5((sign_query + mixin).encode("utf-8")).hexdigest()
    url = ("https://api.bilibili.com/x/web-interface/wbi/search/type?"
           + query + "&w_rid=" + w_rid)
    data = _bili_get_json(opener, url)
    if data.get("code") != 0:
        raise RuntimeError("B 站搜索接口返回 %s: %s" % (data.get("code"), data.get("message")))
    return ((data.get("data") or {}).get("result")) or []


_TAG_RE = re.compile(r"<[^>]+>")


def _strip_tags(text):
    return _TAG_RE.sub("", text or "").strip()


def _parse_duration_text(text):
    """'4:18' / '1:02:03' -> 秒；解析失败返回 None。"""
    if not text:
        return None
    parts = str(text).strip().split(":")
    try:
        parts = [int(p) for p in parts]
    except ValueError:
        return None
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return None


def bilibili_search_candidates(song, artist="", extra_keywords=("", "DJ版")):
    """B 站搜索同名视频（用于 auto 兜底）。

    多个关键词各搜一遍并按 bvid 去重：B 站搜索排序对目标视频很不稳定，
    多试几个关键词能提高命中率；真正是否可用还要靠时长区间/--expect-duration 校验。
    """
    keywords = []
    base = "%s %s" % (song, artist) if artist else song
    for extra in (extra_keywords or ("",)):
        keyword = ("%s %s" % (base, extra)).strip() if extra else base.strip()
        if keyword and keyword not in keywords:
            keywords.append(keyword)
    nsong = normalize_lyric_text(song)
    nartist = normalize_lyric_text(artist) if artist else ""
    out = []
    seen = set()
    for keyword in keywords:
        try:
            raw = bilibili_search_videos(keyword)
        except Exception as exc:
            log("  auto/B 站 关键词 %r 搜索失败：%s" % (keyword, exc))
            continue
        for rank, item in enumerate(raw):
            title = _strip_tags(item.get("title") or "")
            duration = _parse_duration_text(item.get("duration"))
            bvid = item.get("bvid")
            if not bvid or bvid in seen or duration is None:
                continue
            seen.add(bvid)
            out.append({
                "platform": "bilibili",
                "id": bvid,
                "title": title,
                "author": item.get("author") or "",
                "duration": duration,
                "rank": len(out),
                "source_url": "https://www.bilibili.com/video/%s" % bvid,
                "title_match": bool(nsong and nsong in normalize_lyric_text(title)),
                "artist_match": bool(nartist and nartist in normalize_lyric_text(title)),
            })
        if len(out) >= 40:
            break
    return out


def auto_netease_attempts(song, artist, args):
    """auto 第 1 步：网易云搜同名歌曲，逐个试外链直链。"""
    candidates = netease_search_candidates(song, artist, limit=8)
    nsong = normalize_lyric_text(song)
    nartist = normalize_lyric_text(artist) if artist else ""
    scored = []
    for cand in candidates:
        if args.min_duration <= cand["duration"] <= args.max_duration:
            match = 0
            if nsong and nsong in normalize_lyric_text(cand["title"]):
                match += 2
            if nartist and any(nartist in normalize_lyric_text(x) for x in cand["singers"]):
                match += 2
            scored.append((-match, cand["rank"], cand))
    scored.sort(key=lambda row: (row[0], row[1]))
    tried = 0
    for _, _, cand in scored:
        if tried >= args.max_auto_candidates:
            break
        tried += 1
        log("  auto/网易云 候选：%s / %s (%.1fs)" % (
            cand["title"], "/".join(cand["singers"]), cand["duration"]))
        try:
            path, meta = attempt_netease_id(cand["id"], args, title=cand["title"])
            yield path, meta
        except Exception as exc:
            log("  auto/网易云 候选失败：%s" % exc)


def auto_bilibili_attempts(song, artist, args):
    """auto 第 2 步：B 站搜索同名视频（时长匹配）→ yt-dlp。"""
    try:
        candidates = bilibili_search_candidates(song, artist)
    except Exception as exc:
        log("  auto/B 站 搜索不可用（可改用 --url 直链）：%s" % exc)
        return
    if not candidates:
        log("  auto/B 站 没有搜到同名视频")
        return
    picked = [c for c in candidates
              if c["title_match"] and args.min_duration <= c["duration"] <= args.max_duration]
    # 标题含歌手 / DJ 的优先，其次按 B 站搜索顺序
    picked.sort(key=lambda c: (-(int(bool(c["artist_match"])) * 2
                                + int("dj" in c["title"].lower())), c["rank"]))
    tried = 0
    for cand in picked:
        if tried >= args.max_auto_candidates:
            break
        tried += 1
        log("  auto/B 站 候选：%s (%.0fs, %s)" % (cand["title"], cand["duration"], cand["id"]))
        try:
            path, meta = attempt_ytdlp(cand["source_url"], args)
            meta["title"] = meta.get("title") or cand["title"]
            yield path, meta
        except Exception as exc:
            log("  auto/B 站 候选失败：%s" % exc)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def build_parser():
    ap = argparse.ArgumentParser(description="找完整音源（本地/直链/B站/网易云/自动搜索）")
    ap.add_argument("--song", default="", help="歌名（auto 搜索用）")
    ap.add_argument("--artist", default="", help="歌手（可选，auto 搜索用）")
    ap.add_argument("--url", default="", help="播放页或直链 URL（B 站公开视频等）")
    ap.add_argument("--file", default="", help="本地音源文件（优先级最高）")
    ap.add_argument("--netease-id", default="", help="网易云歌曲 id（用外链直链下载）")
    ap.add_argument("--out", required=True, help="输出文件路径（扩展名决定容器：.m4a/.mp3/.wav…）")
    ap.add_argument("--min-duration", type=float, default=60.0, help="允许的最短时长（秒）")
    ap.add_argument("--max-duration", type=float, default=400.0, help="允许的最长时长（秒）")
    ap.add_argument("--expect-duration", type=float, default=None,
                    help="期望时长（秒）。给定时校验下载结果（±3s），防止拿到错误版本")
    ap.add_argument("--no-auto", action="store_true", help="不做自动搜索兜底")
    ap.add_argument("--max-auto-candidates", type=int, default=4,
                    help="auto 模式每个来源最多试几个候选（默认 4）")
    return ap


def _attempt_sequence(args):
    """构造 (说明, 工厂函数) 列表，按任务书顺序：file -> url -> netease-id -> auto。"""
    seq = []
    if args.file:
        seq.append(("本地文件 --file", lambda: attempt_local_file(args.file, args)))
    if args.url:
        seq.append(("URL --url", lambda: attempt_url(args.url, args)))
    if args.netease_id:
        seq.append(("网易云 --netease-id",
                    lambda: attempt_netease_id(args.netease_id, args)))
    if not args.no_auto and args.song:
        seq.append(("auto/网易云搜索",
                    lambda: _first_from_generator(auto_netease_attempts(
                        args.song, args.artist, args))))
        seq.append(("auto/B 站搜索",
                    lambda: _first_from_generator(auto_bilibili_attempts(
                        args.song, args.artist, args))))
    return seq


def _first_from_generator(gen):
    """取生成器里第一个成功的结果（生成器内部已 log 失败原因）。"""
    try:
        return next(gen)
    except StopIteration:
        raise RuntimeError("没有可用候选")


def main(argv=None):
    args = build_parser().parse_args(argv)
    if not (args.file or args.url or args.netease_id or args.song):
        die("至少给一个音源：--file / --url / --netease-id / --song（auto 搜索）", code=2)
    if args.min_duration <= 0 or args.max_duration <= args.min_duration:
        die("时长区间不合法：min=%s max=%s" % (args.min_duration, args.max_duration), code=2)
    out_path = abs_path(args.out)
    ensure_dir_for(out_path)
    args._tmpdir = temp_dir("versefield-fetch-audio-")

    seq = _attempt_sequence(args)
    attempts = []
    t_start = time.time()
    for label, factory in seq:
        log("尝试：%s" % label)
        t0 = time.time()
        try:
            path, meta = factory()
            info = validate_audio(path, args.min_duration, args.max_duration,
                                  expect_duration=args.expect_duration)
            out_file = finalize_audio(path, out_path)
            final_info = validate_audio(out_file, args.min_duration, args.max_duration,
                                        expect_duration=args.expect_duration)
            size = os.path.getsize(out_file)
            result = {
                "ok": True,
                "file": out_file,
                "duration": round(float(final_info["duration"]), 3),
                "platform": meta.get("platform") or "",
                "source_url": meta.get("source_url") or "",
                "title": meta.get("title") or "",
                "size": size,
                "codec": final_info.get("audio_codec"),
                "attempts": attempts + [{"step": label, "ok": True,
                                         "elapsed": round(time.time() - t0, 2)}],
            }
            log("成功：%s -> %s（%.2fs / %.1f KB / 总耗时 %.1fs）" % (
                label, out_file, result["duration"], size / 1024.0, time.time() - t_start))
            jprint(result)
            return 0
        except Exception as exc:
            elapsed = round(time.time() - t0, 2)
            log("失败：%s -> %s（%.1fs）" % (label, exc, elapsed))
            attempts.append({"step": label, "ok": False, "error": str(exc),
                             "elapsed": elapsed})

    die("所有音源都失败，没有拿到可用音频。", code=1, attempts=attempts,
        hint="可以用 --file 指定本地音源，或 --url 给 B 站公开视频链接；"
             "B 站搜索接口若被风控（412），auto 模式会失败但 --url 仍可用。")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
