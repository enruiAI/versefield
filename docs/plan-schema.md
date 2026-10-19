# plan.json 结构（scaffold.py 输入）

```json
{
  "song": "把回忆拼好给你",
  "artist": "cici_",
  "style": "neon-dj",
  "out": "versefield/把回忆拼好给你",
  "audio": {
    "file": "C:/.../assets/song_clip.mp3",
    "duration": 53.70,
    "source": "bilibili av598640625 / QQ songmid 004aGvuF4GYdQ8",
    "pulse_hex_file": "meta/pulse_table.txt"
  },
  "lead_in": 0.45,
  "bpm": 130,
  "audio_label": "原曲片段",
  "line_label": "",
  "start_note": "（可选，覆盖开始页说明）",
  "end_msg": "献给每一个 认真爱过的人",
  "sources": {"lyrics": "QQ 004aGvuF4GYdQ8", "audio": "bilibili av598640625"},
  "cut": {"alignment": {"hits": 15, "total": 15, "max_abs_delta": 0.15}},
  "qa_results": "（可选，写进 README 的 QA 结论）",
  "lines": [
    {
      "lyric": "我们都是渺小真实存在",
      "sub": "we are small, but we are real",
      "start": 0.45,
      "motif": "m01",
      "tag": "01 — TINY, BUT REAL",
      "custom": false,
      "palette": {}
    }
  ]
}
```

字段说明：
- `lines`：按句排列，`start` 是**成品音轨内**的起唱秒数（来自 align_and_cut.py 的 `cut.json` 的 `rel`）。
  第一句的 `start` = lead-in 秒数；场景 s01 从 0s 开始显示（含 lead-in），s02 从第二句起唱点开始，依次类推。
- `motif`：模板库 id（m01–m15，见 `template/motifs/motif_catalog.json`）。
- `custom: true`：这句话需要单独绘制——scaffold 会生成 `TODO` 占位场景，并在项目根目录写 `SCENE_BRIEF.md`。
- `tag`：左上角英文 HUD；省略则自动取 `序号 — motif 默认文案`。
- `palette`：可选，覆盖该句颜色（一般不用）。
- `audio.pulse_hex_file`：可选；省略时 scaffold 用 build_pulse_table 自动计算（需要 ffmpeg）。
- `audio.duration`：可选；省略时用 ffmpeg 探测。

生成的 `project.json` 与 plan 类似，但 `scenes` 里是场景级时间（s01 从 0 开始），tools 的 QA 脚本读它。
