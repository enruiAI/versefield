# plan.json 结构（scaffold.py 输入）

```json
{
  "song": "把回忆拼好给你",
  "artist": "cici_",
  "style": "neon-dj",
  "scene_policy": "flexible",
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
      "custom": true,
      "concept": "一个很小的人站在巨大的星空穹顶下，四周的星座正缓缓移动",
      "scene_type": "人物剪影",
      "tag": "01 — TINY, BUT REAL"
    },
    {
      "lyric": "在人群里发着光",
      "sub": "glowing in the crowd",
      "start": 4.82,
      "custom": true,
      "concept": "熙攘人群的长曝光拖影，只有一个人清晰，肩头亮着一盏小灯",
      "scene_type": "城市夜景",
      "tag": "02 — GLOW"
    },
    {
      "lyric": "认真被爱过的",
      "sub": "truly loved",
      "start": 8.60,
      "custom": true,
      "concept": "一只旧毛衣袖口被抽出一根线，线在空中绕成一个发光的心形",
      "scene_type": "微观质感",
      "tag": "03 — TRULY LOVED"
    },
    {
      "lyric": "像转瞬即逝的烟花",
      "sub": "like a firework, gone in a flash",
      "start": 12.40,
      "custom": false,
      "motif": "m10",
      "concept": "这句画面和 m10 的城市烟花一致，直接借用模板",
      "tag": "04 — FIREWORK"
    },
    {
      "lyric": "把回忆拼好给你",
      "sub": "piecing the memories for you",
      "start": 16.10,
      "custom": true,
      "concept": "散落一地的照片碎片被风卷起，在半空拼回一张完整的侧脸",
      "scene_type": "第一人称视角",
      "tag": "05 — MEMORIES"
    }
  ]
}
```

字段说明：

## 顶层字段

- `song` / `artist`：歌名 / 歌手。
- `style`：视觉风格，目前只有 `neon-dj`。
- `scene_policy`：画面分配策略，**默认 `flexible`**。
  - `flexible`：按歌词与模板画面的贴合度灵活判断，**不强制比例**。多数歌词意思不同，所以多数句子应 custom；
    只有这句的画面构思和某个 motif 真正一致时才用模板。scaffold 只给提醒（`warnings`），不拦生成：
    全模板、模板占比过高（custom < 25%）、连续两句模板、custom 缺 concept。
  - `original-first`：用户明确要求「尽量原创 / 全部独立场景」时用。强制 ≥70% custom、首尾必须 custom、
    不允许连续模板、custom 必须有 concept + scene_type、相邻类型不同、整片至少 `min(4, custom 数)` 种类型；
    不满足直接报错退出（exit 2）。
  - `template-ok`：用户明确要求「快速版 / 用模板」时用；允许全部模板，不做限制。
- `palette_shift`：可选，整套调色板的色相偏移角度（例如 `18`、`-40`）。省略时按「歌名 + 歌手」自动生成一个
  -50°~50° 的固定角度——**同一首歌曲每次生成颜色一致，不同歌曲颜色不同**，所以复用的模板场景也不会跨歌一模一样。
- `palette_variant`：设为 `false` 可关闭自动色相偏移（`palette_shift` 优先）。
- `out`：输出目录（可被 `--out` 覆盖）。
- `lead_in` / `bpm` / `audio_label` / `line_label` / `start_note` / `end_msg`：页面文案与节奏，均可省略。
- `sources` / `cut` / `qa_results`：来源、起音校验结果、QA 结论，会写进生成项目的 README / project.json。

## lines（每句歌词）

- `lyric`：句子文本（必填）。
- `start`：**成品音轨内**的起唱秒数（来自 align_and_cut.py 的 `cut.json` 的 `rel`）。
  第一句的 `start` = lead-in 秒数；场景 s01 从 0s 开始显示（含 lead-in），s02 从第二句起唱点开始，依次类推。
- `custom`：`true` = 单独绘制（scaffold 生成 `TODO` 占位 + `SCENE_BRIEF.md`）；`false` = 复用模板。
- `motif`：模板库 id（m01–m15，见 `template/motifs/motif_catalog.json`）。`custom: false` 时必填；
  custom 句可留空。**只有这句的画面和模板真正贴合时才用**，不要为了省事套模板。
- `concept`：**画面概念**（建议每句都写，`original-first` 下 custom 必填）。一句人话描述这句要画什么、
  为什么这样画，是画师最重要的创作依据；会写进 `SCENE_BRIEF.md` 和 custom 场景文件头。
- `scene_type`：**画面类型**（可选，custom 建议写；`original-first` 下 custom 必填），可选值：
  `人物剪影 / 物体特写 / 建筑空间 / 自然景观 / 城市夜景 / 抽象图形 / 几何结构 / 文字排版 / 机械装置 / 第一人称视角 / 微观质感 / 光影剧场 / 其他`。
  写了以后 scaffold 会在 `warnings` 里提醒相邻同类；`original-first` 下会强制检查。
- `tag`：左上角英文 HUD；省略则自动取「序号 — motif 默认文案」。
- `palette`：可选，覆盖该句颜色（一般不用；整套色板已由 `palette_shift` 自动变化）。

## 其它

- `audio.pulse_hex_file`：可选；省略时 scaffold 用 build_pulse_table 自动计算（需要 ffmpeg）。
- `audio.duration`：可选；省略时用 ffmpeg 探测。
- 生成的 `project.json` 与 plan 类似，但 `scenes` 里是场景级时间（s01 从 0 开始），并额外记录
  `scene_policy / custom_ratio / palette_shift / warnings`；tools 的 QA 脚本读它。

## 示例：用户要求「尽量原创」

```json
{
  "song": "某首歌",
  "artist": "某歌手",
  "scene_policy": "original-first",
  "audio": {"file": "assets/song_clip.mp3", "duration": 24.0},
  "lines": [
    {"lyric": "第一句", "start": 0.4, "custom": true, "concept": "……", "scene_type": "物体特写"},
    {"lyric": "第二句", "start": 4.1, "custom": true, "concept": "……", "scene_type": "自然景观"},
    {"lyric": "第三句", "start": 8.2, "custom": true, "concept": "……", "scene_type": "抽象图形"},
    {"lyric": "第四句", "start": 12.3, "custom": true, "concept": "……", "scene_type": "微观质感"},
    {"lyric": "第五句", "start": 16.4, "custom": true, "concept": "……", "scene_type": "人物剪影"}
  ]
}
```

## 示例：用户要求「快速版 / 用模板」

```json
{
  "song": "某首歌",
  "artist": "某歌手",
  "scene_policy": "template-ok",
  "audio": {"file": "assets/song_clip.mp3", "duration": 24.0},
  "lines": [
    {"lyric": "第一句", "start": 0.4, "custom": false, "motif": "m03"},
    {"lyric": "第二句", "start": 4.1, "custom": false, "motif": "m10"},
    {"lyric": "第三句", "start": 8.2, "custom": false, "motif": "m15"}
  ]
}
```
