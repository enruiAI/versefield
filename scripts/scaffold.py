#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scaffold.py — 用 plan.json 生成一个完整的「歌词视频」项目

用法：
  python scaffold.py --plan plan.json [--out 目录] [--pulse-hex pulse.txt] [--build] [--force]

plan.json 见 docs/dev-plan-schema.md。生成的项目结构：
  index.html / src/ / tools/ / assets/song_clip.mp3 / shots/ / project.json / README.md
"""
import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL_ROOT / "template"
sys.path.insert(0, str(SKILL_ROOT / "scripts"))

CST = timezone(timedelta(hours=8))


def die(msg):
    print(json.dumps({"ok": False, "error": msg}, ensure_ascii=False))
    sys.exit(2)


def load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as e:
        die(f"读取 JSON 失败 {path}: {e}")


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        p = shutil.which("ffmpeg")
        if not p:
            die("找不到 ffmpeg（需要 imageio-ffmpeg 或 PATH 里的 ffmpeg）")
        return p


def probe_duration(path):
    out = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(path)],
                         capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", out.stderr)
    if not m:
        die(f"无法读取音频时长: {path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def compute_pulse_hex(audio_path, ffmpeg):
    """解码成 wav 后调用 build_pulse_table.build_pulse_table()"""
    import build_pulse_table as bpt  # noqa: E402  (scripts/ 已在 sys.path)
    tmpdir = tempfile.mkdtemp(prefix="versefield-pulse-")
    wav = os.path.join(tmpdir, "audio.wav")
    subprocess.run([ffmpeg, "-hide_banner", "-y", "-i", str(audio_path),
                    "-ar", "44100", "-ac", "2", wav],
                   check=True, capture_output=True)
    try:
        hexstr, rate = bpt.build_pulse_table(wav)
    except TypeError:
        # 兼容只有 CLI 的旧版：直接跑脚本再读结果
        hexstr, rate = None, 50.0
    shutil.rmtree(tmpdir, ignore_errors=True)
    if hexstr:
        return hexstr, rate
    die("build_pulse_table.py 没有可调用的 build_pulse_table(wav) 接口，请先升级脚本")


def render(tpl_name, mapping):
    tpl = (TEMPLATE / "templates" / tpl_name).read_text(encoding="utf-8")
    for k, v in mapping.items():
        tpl = tpl.replace("{{%s}}" % k, str(v))
    left = re.findall(r"\{\{[A-Z0-9_]+\}\}", tpl)
    if left:
        die(f"模板 {tpl_name} 还有未替换占位符: {sorted(set(left))[:6]}")
    return tpl


def slugify(name):
    s = re.sub(r"[\\/:*?\"<>|\s]+", "-", name).strip("-")
    return s[:60] or "untitled"


def fmt_total(sec):
    sec = max(0, int(round(sec)))
    return "%02d:%02d" % (sec // 60, sec % 60)


def build_project(plan, plan_dir, out_dir, pulse_hex_override=None, do_build=False, force=False):
    # ---------- 校验 ----------
    song = plan.get("song") or die("plan 缺少 song")
    artist = plan.get("artist") or ""
    lines = plan.get("lines") or die("plan 缺少 lines")
    if len(lines) < 2:
        die("lines 至少 2 句")
    header = ""   # 兼容旧 plan 字段；生成页面不再显示固定宣传文案
    style = plan.get("style") or "neon-dj"
    audio_info = plan.get("audio") or {}
    audio_src = audio_info.get("file")
    if not audio_src:
        die("plan.audio.file 缺失")
    audio_src = Path(audio_src)
    if not audio_src.is_absolute():
        audio_src = (plan_dir / audio_src).resolve()
    if not audio_src.exists():
        die(f"音频文件不存在: {audio_src}")

    duration = float(audio_info.get("duration") or probe_duration(audio_src))

    catalog = json.loads((TEMPLATE / "motifs" / "motif_catalog.json").read_text(encoding="utf-8"))
    motifs = {m["id"]: m for m in catalog["motifs"]}

    # 每句的 motif / 自定义 / 标签
    norm = []
    for i, ln in enumerate(lines):
        for key in ("lyric", "start"):
            if key not in ln:
                die(f"lines[{i}] 缺少 {key}")
        motif = (ln.get("motif") or "").strip()
        custom = bool(ln.get("custom", False))
        if custom:
            if not motif:
                motif = "m01"
        elif motif not in motifs:
            die(f"lines[{i}] motif '{motif}' 不存在（可选：{', '.join(motifs)}）")
        tag = ln.get("tag")
        if not tag:
            suffix = motifs[motif]["defaultTag"].split(" — ", 1)[-1] if motif in motifs else "CUSTOM"
            tag = "%02d — %s" % (i + 1, suffix)
        pal = dict(motifs[motif]["palette"])
        if isinstance(ln.get("palette"), dict):
            pal.update(ln["palette"])
        norm.append({
            "index": i + 1,
            "id": "s%02d" % (i + 1),
            "lyric": str(ln["lyric"]).strip(),
            "sub": ln.get("sub") or "",
            "start": float(ln["start"]),
            "motif": motif,
            "custom": custom,
            "tag": tag,
            "palette": pal,
        })
    norm.sort(key=lambda x: x["start"])
    for i in range(1, len(norm)):
        if norm[i]["start"] <= norm[i - 1]["start"]:
            die("lines 的 start 必须严格递增")
    if norm[0]["start"] < 0:
        die("lines[0].start 不能为负")

    # 场景切点：s01 从 0 开始（含 lead-in），之后每句一句一切
    for i, s in enumerate(norm):
        s["scene_start"] = 0.0 if i == 0 else s["start"]
        s["scene_end"] = norm[i + 1]["start"] if i + 1 < len(norm) else duration
        s["dur"] = s["scene_end"] - s["scene_start"]
        if s["dur"] <= 0.5:
            die(f"场景 {s['id']} 时长过短: {s['dur']}")
    total = norm[-1]["scene_end"]

    # ---------- 目录 ----------
    out_dir = Path(out_dir).resolve()
    if out_dir.exists() and any(out_dir.iterdir()):
        if not force:
            die(f"输出目录已存在且非空: {out_dir}（加 --force 覆盖）")
        shutil.rmtree(out_dir)
    for sub in ("src/scenes", "assets", "meta", "tools", "tests", "shots"):
        (out_dir / sub).mkdir(parents=True, exist_ok=True)

    # ---------- 基础文件 ----------
    for f in ("helpers.js", "art.js", "style.css", "audio.js", "core.js"):
        shutil.copy2(TEMPLATE / "src" / f, out_dir / "src" / f)
    # audio.js 的兜底时长
    audio_js = out_dir / "src" / "audio.js"
    t = audio_js.read_text(encoding="utf-8")
    t = re.sub(r"var FALLBACK_DURATION = [\d.]+;", "var FALLBACK_DURATION = %.3f;" % total, t)
    audio_js.write_text(t, encoding="utf-8")

    shutil.copy2(TEMPLATE / "build.mjs", out_dir / "build.mjs")
    shutil.copy2(TEMPLATE / "tests" / "audio-real-check.html", out_dir / "tests" / "audio-real-check.html")
    # tools
    for f in (TEMPLATE / "tools").iterdir():
        if f.name == "node_modules":
            continue
        if f.is_dir():
            shutil.copytree(f, out_dir / "tools" / f.name, dirs_exist_ok=True)
        else:
            shutil.copy2(f, out_dir / "tools" / f.name)

    # ---------- 场景文件 ----------
    scene_files = []
    custom_ids = []
    for s in norm:
        if s["custom"]:
            src = (TEMPLATE / "templates" / "custom-scene-stub.js").read_text(encoding="utf-8")
            custom_ids.append(s["id"])
        else:
            src = (TEMPLATE / "motifs" / motifs[s["motif"]]["file"]).read_text(encoding="utf-8")
        src = src.replace("__SCENE_ID__", s["id"])
        p = out_dir / "src" / "scenes" / (s["id"] + ".js")
        p.write_text(src, encoding="utf-8")
        scene_files.append("scenes/%s.js" % s["id"])
    manifest = "".join('  "%s",\n' % s["id"] for s in norm)
    (out_dir / "src" / "scenes" / "manifest.js").write_text(
        "window.SCENE_MANIFEST = [\n%s];\n" % manifest, encoding="utf-8")

    # ---------- 音频 ----------
    clip = out_dir / "assets" / "song_clip.mp3"
    shutil.copy2(audio_src, clip)
    b64 = base64.b64encode(clip.read_bytes()).decode("ascii")
    (out_dir / "src" / "audio-data.js").write_text(
        "/* =========================================================================\n"
        " * audio-data.js — 内联音轨（base64 data URL）\n"
        " * 音源：%s\n"
        " * 成品：assets/song_clip.mp3（%.2fs）\n"
        " * 本文件由 scaffold.py 生成，请勿手改。\n"
        " * ========================================================================= */\n"
        "window.__SONG_AUDIO_DATA_URL = 'data:audio/mpeg;base64,%s';\n"
        % (audio_info.get("source") or song, total, b64),
        encoding="utf-8")
    # 供 tests/audio-real-check.html 读取的期望时长（避免测试脚本写死）
    (out_dir / "src" / "test-config.js").write_text(
        "window.__EXPECTED_DURATION__ = %.3f;\nwindow.__PROJECT_META__ = %s;\n" % (
            total, json.dumps({"song": song, "artist": artist, "duration": round(total, 3)},
                              ensure_ascii=False)),
        encoding="utf-8")

    # ---------- 卡点脉冲 ----------
    pulse_hex = None
    pulse_rate = 50
    if pulse_hex_override:
        pulse_hex = Path(pulse_hex_override).read_text(encoding="utf-8").strip()
    elif audio_info.get("pulse_hex_file"):
        p = Path(audio_info["pulse_hex_file"])
        if not p.is_absolute():
            p = (plan_dir / p).resolve()
        if not p.exists():
            die(f"pulse_hex_file 不存在: {p}")
        pulse_hex = p.read_text(encoding="utf-8").strip()
    else:
        pulse_hex, pulse_rate = compute_pulse_hex(audio_src, ffmpeg_exe())
    if not re.fullmatch(r"[0-9a-f]+", pulse_hex or ""):
        die("pulse hex 非法")
    (out_dir / "meta" / "pulse_table.txt").write_text(pulse_hex, encoding="utf-8")

    # ---------- timeline.js ----------
    pal_rows = []
    for key in ("s%02d" % (i + 1) for i in range(len(norm))):
        pass
    data_rows = []
    for s in norm:
        data_rows.append(
            "    ['%s', %d, %.3f, %.3f, %s, %s, %s, %s, %s]" % (
                s["id"], s["index"], s["scene_start"], s["scene_end"],
                json.dumps(s["lyric"], ensure_ascii=False),
                json.dumps(s["sub"], ensure_ascii=False),
                json.dumps(s["tag"], ensure_ascii=False),
                json.dumps(s["motif"], ensure_ascii=False),
                "true" if s["custom"] else "false"))
    pal_lines = []
    for s in norm:
        pal_lines.append("    %s: %s," % (s["id"], json.dumps(s["palette"], ensure_ascii=False)))
    bpm = float(plan.get("bpm") or 130)
    timeline = """/* =========================================================================
 * timeline.js — 全局时间轴（由 versefield skill / scaffold.py 生成）
 *
 * 歌曲：%(song)s%(artist_part)s
 * 音源：%(audio_source)s
 * 片段：%(duration).3fs（lead-in/截取信息见 project.json）
 *
 * 场景切换点 = 每句起唱时间（已通过音频起音校验，详见 project.json / meta/）
 * 每个场景可拿到 scene.tag / scene.palette / scene.motif / scene.custom。
 * ========================================================================= */
(function (global) {
  'use strict';

  var PAL = {
%(pal)s
  };

  function scene(id, index, start, end, lyric, sub, tag, motif, custom, palette) {
    return {
      id: id, index: index, start: start, end: end, dur: end - start, design: end - start,
      lyric: lyric, sub: sub, tag: tag, motif: motif, custom: custom, palette: palette
    };
  }

  var data = [
%(rows)s
  ];

  var scenes = data.map(function (d) {
    return scene(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], PAL[d[0]]);
  });

  var TL = {
    bpm: %(bpm)s,
    beat: 60 / %(bpm)s,
    bar: 60 / %(bpm)s * 4,
    duration: %(duration).3f,
    lineLabel: %(line_label)s,
    pulseRate: %(pulse_rate)s,
    pulseHex: '%(pulse_hex)s',
    scenes: scenes,
    all: scenes,
    sceneAt: function (t) {
      if (t <= scenes[0].start) return scenes[0];
      for (var i = 0; i < scenes.length; i++) { if (t < scenes[i].end) return scenes[i]; }
      return scenes[scenes.length - 1];
    },
    lineAt: function (t) { return TL.sceneAt(t); },
    pulseAt: function (t) {
      var h = TL.pulseHex;
      if (!h) return 0;
      var x = t * TL.pulseRate;
      var i = Math.floor(x);
      var f = x - i;
      var a = parseInt(h.charAt(i) || '0', 16) / 15;
      var b = parseInt(h.charAt(i + 1) || '0', 16) / 15;
      return a + (b - a) * f;
    }
  };

  global.TL = TL;
})(typeof window !== 'undefined' ? window : this);
""" % {
        "song": song,
        "artist_part": (" · " + artist) if artist else "",
        "audio_source": audio_info.get("source") or song,
        "duration": total,
        "pal": "\n".join(pal_lines),
        "rows": ",\n".join(data_rows),
        "bpm": ("%g" % bpm),
        "pulse_rate": pulse_rate,
        "pulse_hex": pulse_hex,
        "line_label": json.dumps(plan.get("line_label") or "", ensure_ascii=False),
    }
    (out_dir / "src" / "timeline.js").write_text(timeline, encoding="utf-8")

    # ---------- index / preview / test-runner ----------
    scripts = "\n".join('<script src="%s"></script>' % f for f in scene_files)
    scene_count = len(norm)
    audio_label = plan.get("audio_label") or "原曲片段"
    start_artist = "%s · 音频截取自公开音源" % (artist or "未知歌手")
    start_note = plan.get("start_note") or (
        "%d 秒片段 · %d 句歌词 / %d 个 SVG 场景 · 逐句卡点<br>"
        "浏览器需要一次点击才允许播放声音 · 点击后全程自动播放<br>"
        "建议佩戴耳机 · 按空格 / 回车也可以开始" % (round(total), scene_count, scene_count))
    index_html = render("index.tpl", {
        "SONG": song,
        "KICKER": plan.get("kicker") or ("%d LINES · %d SEC · LYRIC VIDEO" % (scene_count, round(total))),
        "START_ARTIST": start_artist,
        "START_NOTE": start_note,
        "AUDIO_LABEL": audio_label,
        "TOTAL_LABEL": fmt_total(total),
        "END_MSG": plan.get("end_msg") or "献给每一个 认真爱过的人",
        "SCENE_SCRIPTS": scripts,
    })
    (out_dir / "index.html").write_text(index_html, encoding="utf-8")
    # 同步写一份开发版 src/index.html
    (out_dir / "src" / "index.html").write_text(index_html, encoding="utf-8")

    (out_dir / "preview.html").write_text(render("preview.tpl", {
        "SONG": song, "SCENE_SCRIPTS": scripts}), encoding="utf-8")
    (out_dir / "src" / "preview.html").write_text((out_dir / "preview.html").read_text(encoding="utf-8"), encoding="utf-8")
    (out_dir / "test-runner.html").write_text(render("test-runner.tpl", {
        "SONG": song, "SCENE_SCRIPTS": scripts}), encoding="utf-8")
    (out_dir / "src" / "test-runner.html").write_text((out_dir / "test-runner.html").read_text(encoding="utf-8"), encoding="utf-8")

    # ---------- project.json ----------
    project = {
        "schema": "versefield/project@1",
        "song": song,
        "artist": artist,
        "style": style,
        "duration": round(total, 3),
        "bpm": bpm,
        "scenes": [{
            "id": s["id"], "index": s["index"],
            "start": round(s["scene_start"], 3), "end": round(s["scene_end"], 3),
            "dur": round(s["dur"], 3),
            "lyric": s["lyric"], "sub": s["sub"], "tag": s["tag"],
            "motif": s["motif"], "custom": s["custom"], "palette": s["palette"],
            "line_start": round(s["start"], 3)
        } for s in norm],
        "audio": {
            "file": "assets/song_clip.mp3",
            "duration": round(total, 3),
            "source": audio_info.get("source") or "",
            "original_file": str(audio_src),
        },
        "sources": plan.get("sources") or {},
        "cut": plan.get("cut") or {},
        "generated_at": datetime.now(CST).isoformat(timespec="seconds"),
    }
    (out_dir / "project.json").write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "meta" / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------- README ----------
    rows = []
    for s in norm:
        rows.append("| %.2f–%.2fs | %02d | %s | %s |" % (
            s["scene_start"], s["scene_end"], s["index"], s["lyric"],
            ("自定义场景" if s["custom"] else ("模板：" + motifs[s["motif"]]["name"]))))
    alignment = plan.get("cut", {}).get("alignment") or {}
    align_summary = "音源截取 %s，共 %.2fs；15 句起音校验见 meta/cut.json" % (
        audio_info.get("source") or "", total)
    if alignment:
        align_summary = "音源截取自 %s；起音校验 %s/%s 命中，max|Δ|=%.2fs" % (
            audio_info.get("source") or "", alignment.get("hits", "?"), alignment.get("total", "?"),
            alignment.get("max_abs_delta", 0))
    readme = render("README.tpl", {
        "SONG": song, "ARTIST": artist or "未知", "DURATION": "%.2f" % total,
        "LINE_COUNT": scene_count,
        "LINE_TABLE": "\n".join(rows),
        "ALIGNMENT_SUMMARY": align_summary,
        "STARTS": " / ".join("%.2f" % s["scene_start"] for s in norm),
        "AUDIO_LABEL": audio_label,
        "SOURCE_AUDIO": (plan.get("sources", {}) or {}).get("audio") or audio_info.get("source") or "公开平台",
        "SOURCE_LYRICS": (plan.get("sources", {}) or {}).get("lyrics") or "公开歌词平台（见 project.json）",
        "PLAY_QA_SECONDS": str(round(total + 5)),
        "QA_RESULTS": plan.get("qa_results") or ("- 场景校验：待运行 `node tools/validate.mjs`\n- 单文件产物：待运行 `node tools/check-final.mjs`"),
        "GENERATED_AT": datetime.now(CST).isoformat(timespec="seconds"),
    })
    (out_dir / "README.md").write_text(readme, encoding="utf-8")

    # ---------- SCENE_BRIEF.md（自定义场景）----------
    if custom_ids:
        brief = ["# 自定义场景任务（SCENE_BRIEF）\n",
                 "本项目有 %d 个场景需要单独绘制（其余为模板复用）。" % len(custom_ids),
                 "通用规范见：`%s`\n" % (SKILL_ROOT / "docs" / "scene-authoring.md"),
                 "| 场景 | 歌词 | 时间 | 建议 HUD |", "|---|---|---|---|"]
        for s in norm:
            if s["custom"]:
                brief.append("| `%s` | %s | %.2f–%.2fs | `%s` |" % (
                    s["id"], s["lyric"], s["scene_start"], s["scene_end"], s["tag"]))
        brief.append("\n每句只改 `src/scenes/<id>.js`；自检（注意：preview 的 `t` 是**镜头内相对时间**，不是全局时间）：")
        for s in norm:
            if s["custom"]:
                mid = s["dur"] * 0.5   # 镜头内相对时间
                brief.append('  node tools/check-scene.mjs %s' % s["id"])
                brief.append('  node tools/shot.mjs "src/preview.html?scene=%s&t=%.2f&anim=0" shots/dev_%s.png 900' % (
                    s["id"], mid, s["id"]))
        brief.append("\n完成后把所有 custom 场景补画、重新 `node build.mjs` 并跑 QA。")
        (out_dir / "SCENE_BRIEF.md").write_text("\n".join(brief), encoding="utf-8")

    # ---------- 构建 ----------
    build_out = None
    if do_build:
        node = shutil.which("node")
        if not node:
            die("需要 node 来构建，但 PATH 里找不到 node")
        r = subprocess.run([node, "build.mjs"], cwd=str(out_dir), capture_output=True,
                           text=True, encoding="utf-8", errors="replace")
        build_out = {"code": r.returncode, "stdout": r.stdout.strip(), "stderr": r.stderr.strip()[-800:]}

    return {
        "ok": True,
        "out": str(out_dir),
        "song": song,
        "scene_count": scene_count,
        "duration": round(total, 3),
        "custom_scenes": custom_ids,
        "pulse_hex_len": len(pulse_hex),
        "audio_file": str(clip),
        "build": build_out,
        "next": [
            "cd \"%s\"" % out_dir,
            "npm install --prefix tools",
            "node build.mjs",
            "node tools/validate.mjs && node tools/check-final.mjs",
            "node tools/check-real-full.mjs && node tools/test-real-audio.mjs",
            "node tools/contact-sheet.mjs",
        ],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out", default=None)
    ap.add_argument("--pulse-hex", default=None)
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    plan_path = Path(args.plan).resolve()
    plan = load_json(plan_path)
    out = args.out or plan.get("out") or str(Path.cwd() / "versefield" / slugify(plan.get("song", "song")))
    result = build_project(plan, plan_path.parent, out, args.pulse_hex, args.build, args.force)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
