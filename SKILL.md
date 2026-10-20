---
name: versefield
description: 歌词视频自动生成技能（VerseField / 词场，也兼容旧名 lyric-video）。当用户想为某首歌做「歌词还原画面 / 歌词视频 / 单页 HTML 音乐可视化 / 一句一景」时使用：用户只需给出歌名和歌词片段（从哪句到哪句，中间省略的句子也会自动补全），技能会自动搜歌词与时间轴、找完整音源并按起唱点截取、校验歌词与声音逐句对齐、生成每句一个 SVG 场景的单文件网页。也支持用户自己上传 BGM。典型触发：「用 versefield / lyric-video 做《歌名》从『第一句』到『最后一句』」「把《歌名》这段做成歌词视频」「做一首 XX 的歌词 MV」「一句一景」。
---

# versefield · 歌词视频自动生成（VerseField / 词场）

一句话：**用户给「歌名 + 歌词起止句（可选 BGM）」→ 自动搜歌词/找音源/对齐截取/画场景/打包成单文件 HTML/跑完 QA 交付。**

技能根目录：`<skill-root>`（本文件所在目录；安装后一般是 `~/.dsh/skills/versefield`，Windows 为 `C:\Users\<你>\.dsh\skills\versefield`）
每一步的脚本都在 `scripts/`，页面工程模板在 `template/`，文档在 `docs/`。

## 0. 什么时候用

- 用户想给某首歌做「每句歌词一个画面的可视化网页 / 歌词视频」；
- 用户给出歌名 + 一段歌词（从 A 句到 B 句）、要求“中间省略的也要”；
- 用户给一个 BGM 文件/链接，要求配歌词画面；
- 用户提到 versefield / lyric-video / 词场 / 歌词还原画面 / 歌词 MV / 单页歌词动画 / 一句一景。

**先确认输入再开工**（只问缺的，不要一次问一堆）：
1. 歌名、歌手（歌手可选，同名歌多时需要）；
2. 歌词起止句（给原句文本；用户可能只给关键词，按包含匹配）；
3. BGM：默认自动搜原曲/热播版；用户给了文件/链接就用用户的；
4. 可选：视觉风格（默认 neon-dj）、输出目录。
   **不要**在生成的页面里加固定宣传文案/水印（用户明确不需要）；也**不要**把“自动播放需要点一次”当成问题反复问，这是浏览器限制，写进 README 即可。

## 1. 环境

- Python 3.10+（脚本依赖 numpy / imageio-ffmpeg / yt-dlp；DSH 运行时通常已预装；其他环境可 `pip install numpy imageio-ffmpeg yt-dlp`）
  （需要 imageio-ffmpeg、yt-dlp；已装）
- Node：PATH 里的 `node`（用于 build.mjs + puppeteer QA）
- 首次在生成项目里跑 QA 前：`npm install --prefix tools`（装 puppeteer-core，约 20s）
- ffmpeg：导出 MP4 时需要（PATH / `FFMPEG_PATH` / `pip install imageio-ffmpeg`）；只生成 HTML 不需要
- 网络：QQ 音乐 / 网易云 / B 站接口可用（脚本内已处理 UA/Referer）

## 2. 全流程（按顺序执行，每步都有质量门禁）

把工作目录设为项目输出目录或工作区；所有命令从项目根目录跑（脚本用绝对路径调用）。

### Step 1 搜歌词 + 逐句时间轴

```bash
python <SKILL>/scripts/fetch_lyrics.py --song "歌名" --artist "歌手" \
  --first-line "起句" --last-line "止句" --out meta/lyrics.json
```

输出 `meta/lyrics.json`（含 `range.lines`：每句 `time` + `text`，时间为**完整音源内**的秒数）。
- 失败时看错误信息里的候选列表，换歌手/歌名再试；仍失败就让用户发歌词文本 + 时间点，或手动写 `meta/lyrics.json`。
- 门禁：`range.lines` 的首尾句必须与用户给的句子对得上；中间行数要覆盖用户说的“省略部分”。

### Step 2 找完整音源

```bash
# 默认自动搜（先试用户给的 --file / --url）
# 建议把 Step 1 里的 duration_hint 传进 --expect-duration 做版本守卫
python <SKILL>/scripts/fetch_audio.py --song "歌名" --artist "歌手" \
  --expect-duration 171.5 --out assets/full.m4a
# 用户提供：
#   --file D:\music\foo.mp3    或   --url https://www.bilibili.com/video/BVxxxx
```

- 输出 JSON 的 `duration` 必须覆盖 Step 1 里最后一句的时间（差太多说明不是同一版本，换一个候选）；
  有 `duration_hint` 时传 `--expect-duration <hint>`，脚本会按 ±3s 校验候选。
- 同名歌曲有多个版本（原版/DJ版/翻唱/加速版）时：`fetch_lyrics.py` 传 `--duration <hint>`，
  音频传 `--expect-duration <hint>`，并核对返回的 `title / platform / singer` 是否与目标版本一致。
- 找不到时：把候选清单给用户，请他提供文件/链接；或用 `--file` 兜底。**不要拿明显不对的音频硬做。**

### Step 3 起音校准 + 截取 + 卡点表

```bash
python <SKILL>/scripts/align_and_cut.py \
  --audio assets/full.m4a --lyrics meta/lyrics.json \
  --first-line "起句" --last-line "止句" \
  --out-mp3 assets/song_clip.mp3 --out-meta meta/cut.json --pulse-file meta/pulse_table.txt
```

- 脚本会：人声起音检测 → 与 LRC 逐句比对 → 截取（默认 lead-in 0.4s、结尾淡出）→
  对截段复测 → 生成 50fps 卡点 hex 表。
- **门禁**：`meta/cut.json` 里 `alignment.ok == true`（命中率 ≥90%、max|Δ| ≤0.5s）。
  不通过 = 音源版本不对或 LRC 不对，回 Step 1/2 换源，**绝不能跳过**。
- **补充校验（重要）**：起音门禁在鼓点很密的 DJ/电音里可能“假通过”（±0.5s 总能找到鼓点），
  所以还要同时满足：
  1. 音源时长 ≈ LRC 平台时长（Step 2 的 `--expect-duration`），标题/歌手/版本名对得上；
  2. `cut.duration` ≈（末句时间 − 首句时间 + tail），且 15 句的 `rel` 与 LRC 相对间隔一致；
  3. 交付前自己听一遍片段开头两句——如果唱的不是用户给的句子，说明版本不对，回 Step 1/2。
- 用户上传的 BGM 如果没有官方 LRC：让用户给每句大概时间，或在 Step 1 里手写 `meta/lyrics.json`；
  仍用 align_and_cut 做复测（容忍度可放宽到 0.8s）。

### Step 4 给每句分配画面（默认：按歌词判断，模板只在真正贴合时借用）

核心原则：**模板不是配额，是「这句的画面刚好和某个模板一致」时才借用的参考。**
大多数歌词的意象/情绪并不相同，所以多数句子应该 custom；只有某句的画面构思和某个 motif
的画面骨架真正对得上时，才用模板——不是只出现一个关键词就套。

对每句按顺序做：
1. **先写 concept**：这句的画面主体、空间、动作、情绪（一句人话）。
2. **再扫一遍模板表**：只有「这句的 concept ≈ 模板画面」时才选模板；否则 custom。
   - 例：「像转瞬即逝的烟花」→ 可以借 m10；「我在雨里想起你」→ 不要直接套 m06 雨窗，
     应该想这句独有的雨夜画面（谁、在哪、在做什么、镜头怎么给）。
   - 不要因为出现「光 / 心 / 雨 / 人 / 夜」这类单字就套模板；要对得上整句的意思。
3. **相邻检查**：如果连续两句都落到模板，回头看是否真的贴切；贴切就保留，不贴切至少改一句 custom。
4. **全片检查**：关键句/副歌/首尾优先想原创画面；如果发现整片大部分都在套模板，
   回到第 1 步重新想——通常是偷懒，而不是歌词真的都像模板。
5. `concept` 建议每句都写；`scene_type` 对 custom 句建议写（可选），相邻场景尽量换类型。

**写进 plan 的字段**（格式见 `docs/plan-schema.md`）：
- `custom`：true = 单独绘制；false = 复用模板（必须给 `motif`）。
- `motif`：模板 id（m01–m15）；custom 可留空。
- `concept`：画面概念，一句话（建议写；`original-first` 策略下 custom 必填）。
- `scene_type`：画面类型（可选；`original-first` 策略下 custom 必填，相邻尽量不同）。

**策略选择（scaffold 支持，默认 `flexible`）**：
- `flexible`（默认）：不强制比例，完全按语义贴合度判断；scaffold 只对「全模板 / 模板占比过高 /
  连续模板 / custom 缺 concept」给 `warnings`，提醒你回头检查。
- `original-first`：用户明确要求「尽量原创 / 全部独立场景」时用；强制 ≥70% custom、首尾必须 custom、
  不允许连续模板、custom 必须有 concept + scene_type（不满足直接报错）。
- `template-ok`：用户明确要求「快速版 / 用模板」时用；允许全部模板。

**模板参考表**（概念对得上才用，不要照着抄构图）：

| motif | 画面 | 适合的歌词意象 |
|---|---|---|
| m01 | 星海与渺小的人 | 星空/宇宙/渺小/孤单/两个人/远方 |
| m02 | 玻璃星球小世界 | 小世界/愿望/星球/玻璃/城市/祈愿 |
| m03 | 地平线升起的光 | 光/希望/遇见/日出/天亮/照亮 |
| m04 | 眼里的大海 | 眼睛/海/泪/看见/辽阔/蓝 |
| m05 | 天台与拍立得 | 天台/城市夜/并肩/拍立得/回忆/取代 |
| m06 | 雨夜窗边 | 雨/窗/发呆/陪伴/夜晚/灰暗 |
| m07 | 拨开阴霾的手 | 拨开/云/阴霾/手/光/放晴 |
| m08 | 收集与淘汰的机器 | 收集/淘汰/快乐/删掉/整理/分类 |
| m09 | 耳机与情话气泡 | 情话/耳机/气泡/甜/声音/告白 |
| m10 | 城市烟花 | 烟花/短暂/绚烂/夜空/绽放 |
| m11 | 冻结的烟花 | 一刹那/定格/冻结/瞬间/停住 |
| m12 | 漩涡下坠 | 漩涡/沉沦/无法自拔/下坠 |
| m13 | 错位的两只钟 | 时差/时钟/错位/距离 |
| m14 | 松手让光球升起 | 放下/松手/升空/释然 |
| m15 | 燃烧的心 | 心/燃烧/炙热/爱自己/火 |

**通用规则**（无论哪种策略）：
- custom 场景不得复刻 m01–m15 的构图骨架（星空+剪影、雨窗、眼睛海、烟花、时钟、漩涡、燃烧的心…）；
- 每首歌 scaffold 会自动给整套调色板做色相偏移（`palette_shift`），模板场景换歌也会换色；
- 保留 `neon-dj` 风格，但「画什么」必须来自这句歌词，不能是「换色重画模板」。

### Step 5 生成项目

把 Step 1–4 的结果写成 `plan.json`（格式见 `docs/plan-schema.md`），然后：

```bash
python <SKILL>/scripts/scaffold.py --plan plan.json --out "<输出目录>" --build
```

scaffold 会生成 **交付目录** 和 **工程目录** 两层：

- 交付目录（用户直接打开）：`index.html`（最终单页）、`README.md`、以及之后的 `lyric-video.mp4`；
- `<输出目录>/_project/`：`src/`、`tools/`、`assets/`、`shots/`、`meta/`、`project.json`、
  `SCENE_BRIEF.md`、`build.mjs`、`preview/test-runner.html` 等工程文件，**删掉不影响 index.html 播放**。

`--build` 会执行 `node build.mjs` 产出单文件，并自动把 `index.html` 同步到交付目录。
画面默认带 **0.28s 场景交叉淡化 + 0.6s 片头 / 0.8s 片尾黑场淡入淡出**（plan 的
`fade` / `fade_in` / `fade_out` 可调，设 0 关闭）。
每首歌的整套调色板会按「歌名 + 歌手」自动做 `palette_shift` 色相偏移（同一模板在不同歌里颜色不同）；
要关闭或手动指定时见 `docs/plan-schema.md`。

**门禁**：scaffold 输出 `ok: true`，`scene_count` 与歌词句数一致（s01 从 0s 开始，其余以起唱点切换）。
默认 `flexible` 下看 `warnings`：全模板 / 模板占比过高 / 连续模板 / custom 缺 concept 都要回头确认；
`scene_policy=original-first` 时 `custom_ratio ≥ 0.7`、custom 句都带 concept/scene_type，否则 scaffold 直接报错；
`template-ok` 只允许在用户明确要快速版时使用。

### Step 6 画 custom 场景（默认方案下占多数）

custom 句通常占多数（视歌词与模板贴合度而定），**按 4–6 个场景一组派给多个画师并行**（subagent / teammate；
相邻场景不要分给同一个画师，避免构图雷同）。
所有工程操作都在 `<输出目录>/_project/` 里进行：

- 必读：`<SKILL>/docs/scene-authoring.md` + `<输出目录>/_project/SCENE_BRIEF.md`（每句 concept / scene_type）+
  `_project/src/art.js` + `_project/src/scenes/` 里任意两个 motif 场景（只为理解 API，不要照抄构图）；
- 每个画师先用自己的话复述分到的 `concept`，再动手；只改分到的 `_project/src/scenes/sXX.js`，页面其它文件不许动；
- **不要复刻 m01–m15 的构图**；相邻场景的画面类型/机位/主体要有明显差别；配色用本片 `scene.palette`；
- 自检（在 `_project/` 下）：`node tools/check-scene.mjs sXX`（退出码 0、errors=[]、badPaths=[]、nodes<800）+
  截图 `_project/src/preview.html?scene=sXX&t=...&anim=0`，把截图和 concept 一起报给 Lead；
- 全画完重新 `node build.mjs`（会自动同步交付目录的 index.html）。

### Step 7 QA（迭代用 `--fast`，交付前跑完整版）

```bash
cd "<输出目录>/_project"
npm install --prefix tools          # 每个新项目首次（约 20s，只需装一次）
node build.mjs                      # 打包并自动同步交付目录 index.html

node tools/qa.mjs --fast            # 迭代期：约 20s，跳过整片实时播放
node tools/qa.mjs                   # 交付前：完整 QA，约 时长 + 25s
```

`qa.mjs` 会依次跑下面这些单项（需要单看某一项时也可以单独跑）：

```bash
node tools/validate.mjs             # 场景全量：加载/update/path/性能
node tools/check-final.mjs          # 单文件：0 外部请求、0 console error、逐场景 active+lyric、截图
node tools/check-real-full.mjs      # 真音频完整播放：切点误差、结束/重播（时长 = 片段时长）
node tools/test-real-audio.mjs      # 音轨引擎 24 项断言
node tools/check-autoplay-fallback.mjs  # 自动播放被拦 → 海报+点击起播
node tools/contact-sheet.mjs        # 生成接触表（_project/shots/）
```

通过标准：
- validate：`failed=0`、`badPaths=[]`、`maxMs<1.0`；
- check-final：`externalOk/consoleOk/headerOk/durationOk/sceneLayersOk/syncOk/shotsOk` 全 true；
- check-real-full：`allOk=true`（切点误差 ≤0.45s），结束页和重播正常；
- test-real-audio：`pass=24 fail=0`；
- 接触表亲自看一遍（或让画师看），确认每格画面成立、无 TODO 占位；
- **画面原创性复核**：把接触表与 15 个模板逐格对照——custom 场景如果像某个 mXX 模板就重画；相邻场景构图/机位不能雷同；
  模板句也要确认「这句真的和模板贴切」；`flexible` 下的 `warnings` 应已逐条确认或修掉。

**不通过就修再跑**；不要说“应该没问题”。修完重新 `node build.mjs` 再全量 QA。

> 速度提示：`check-final` / `contact-sheet` 现在只在一次页面加载里用
> `?export=1` + `__player.renderAt(t)` 逐场景定格，不再为每个场景重新导航，整片约 3~5s；
> 改完场景先跑 `qa.mjs --fast`，确认全过再跑一次完整版，不要每轮都实时播完整片。

用户要视频时（可选）：QA 全过后在 `<输出目录>/_project` 里跑 `node tools/export-video.mjs`
（离线逐帧渲染 + ffmpeg 合成，不是录屏；默认 30fps/1600×900）。
默认 4 个 Chrome 进程并行 + 快速截图，30s 片段约 2 分钟（旧版约 9 分钟；机器负载高时会慢一些）；
`--fps 50 --scale 1.2` 出 1080p/50fps，`--workers 2` 可给低配机器降压，
`--format jpeg --quality 92` 可再快一点（有轻微压缩）。
产物默认到 **交付目录根** 的 `lyric-video.mp4`，检查时长和音画同步。

### Step 8 交付

用 `present` 给用户（主目录只放成品，工程文件在 `_project/`）：
1. `<输出目录>/index.html`（最终单文件，双击即播）；
2. `<输出目录>/README.md`（使用说明 + 时间轴 + 来源 + 版权提示）；
3. `<输出目录>/lyric-video.mp4`（如果用户要视频；`node tools/export-video.mjs` 产出）；
4. `_project/shots/contact_sheet.png`（全片接触表，内部 QA 产物）；
5. `_project/assets/song_clip.mp3`（试听/核对用，内部）。
并说明：主目录的 `index.html` 可单独拷走播放；`_project/` 只用于二次生成/QA，删掉不影响播放；
浏览器需要点一次「点击开始」才有声音；音频来源与版权提示；如需要换片段/换风格可重跑。

## 3. 目录与产物

```
<输出目录>/                  ← 交付目录：只放成品
  index.html               最终单文件（离线可播，可直接拷走）
  README.md                使用说明 / 时间轴 / 来源 / 版权
  lyric-video.mp4          可选：导出的视频
  _project/                ← 工程目录（删掉不影响 index.html 播放）
    src/                   页面工程（timeline/scenes/audio-data/preview…）
    tools/                 QA 脚本 + export-video.mjs（视频导出）
    assets/song_clip.mp3   截取后的音轨
    project.json           项目配置（场景/时间轴/来源/custom 标记）
    SCENE_BRIEF.md         自定义场景任务说明（如有）
    shots/                 QA 截图 + 接触表
    meta/                  plan.json / lyrics.json / cut.json / pulse_table.txt
    build.mjs              打包脚本（自动同步上级 index.html）
```

## 4. 常见故障与处理

| 现象 | 原因 | 处理 |
|---|---|---|
| fetch_lyrics 找不到首尾句 | 歌词文本差异/翻唱版本不同 | 打印候选；让用户确认歌手或直接给歌词文本/时间 |
| align_and_cut 命中率低 | 音源不是 LRC 对应的版本（同名单曲≠同一录音） | 换音源（平台的同名 DJ/翻唱版本很多）；用 `--file` 让用户提供；绝不硬交付 |
| fetch_audio 下不到 | 版权/VIP/接口变化 | 用 B 站公开视频链接；或让用户提供 mp3 |
| 页面场景报错/空白 | scene 文件 build/update 抛错 | 在 `_project/` 下 `node tools/check-scene.mjs sXX`，修完重建 |
| 页面声音与歌词不同步 | 时间轴没按 cut.json 的 rel 时间 | 重新 scaffold；检查 `_project/project.json` 的 `start` 与 cut.json `rel` 是否一致 |
| custom 场景还是 TODO | 画师没交付 | 重新派单；交付前 grep `_project/src/scenes/` 里的 `TODO — CUSTOM SCENE` |
| QA 依赖缺 puppeteer | 没装 node_modules | 在 `_project/` 下 `npm install --prefix tools` |
| export-video 找不到 ffmpeg | PATH/FFMPEG_PATH 没有 ffmpeg | `pip install imageio-ffmpeg`，或设置 `FFMPEG_PATH`，或 `--ffmpeg <路径>` |
| 导出视频音画不同步 | 用了录屏/剪映录浏览器 | 改用 `_project/tools/export-video.mjs`（逐帧渲染 + 音轨直接合成，不做实时录屏） |
| 导出/QA 比预期慢 | 机器负载高、CPU 降频，或并行进程过多 | 关掉其它占 CPU 的程序；导出用 `--workers 2`、`--format jpeg --quality 92`；先 `--start/--end` 导一段验证 |

## 5. 硬约束（写进交付说明，不要对用户隐瞒）

1. **版权**：公开平台的音源/歌词默认只能用于非商业演示；商用需授权或用户自备素材。
2. **自动播放**：浏览器必须用户点击一次才能出声，无法绕过。
3. **音源版本校验是强制的**：`meta/cut.json` 的 alignment 不通过就不交付，这是本技能最重要的一条。
4. 单文件体积：53s 音频约 1.4MB；长篇/多段会更大，必要时降低码率或减少片段长度。
5. 生成项目的 `_project/tools/` 需要 `npm install` 才能跑浏览器 QA；构建（`_project/build.mjs`）不需要。
6. **不要在生成的页面里加固定宣传文案 / 模型名 / 水印**（用户明确不需要）；页面只保留歌名、歌词、播放控件。
7. 交付前确认 `grep -r "TODO — CUSTOM SCENE" _project/src/scenes/` 为空（除非用户同意先用占位）。
8. **模板只在真正贴合时使用**：不要整片套模板省事；如用户明确要求「尽量原创 / 全部独立场景」，
   用 `original-first` 的 70% 门禁；交付前确认 SCENE_BRIEF 里 custom 的 concept 已落实、custom 场景没有复刻模板构图。
9. **MP4 导出是逐帧离线渲染**：`_project/tools/export-video.mjs` 用无头 Chrome 渲染 + ffmpeg 合成音轨，
   不依赖浏览器实时播放/录屏，所以画面与 HTML 一致、不会掉帧；需要 ffmpeg（否则只交付 HTML + 说明）。
   默认 4 进程并行 + 快速截图（30s 片段约 2 分钟）；`--workers` / `--format jpeg` 可按机器调。
   导出模式（`?export=1`）下页面主循环不重绘，只由 `renderAt(t)` 驱动，避免空转拖慢截图。
10. **交付目录只放成品**：`index.html`、`README.md`、`lyric-video.mp4`；工程文件都在 `_project/`。
    `index.html` 可单独拷走离线播放；不要把 `_project/` 的内部路径写死进页面。

## 6. 模板库与扩展

- 视觉风格：当前只有 `neon-dj`（`template/src/art.js` + `style.css` + `motifs/`）。
- 新增风格：复制 `template/` 为 `template-<style>/` 或把 art/style/motifs 放进 `styles/<style>/`，
  并在 scaffold 里按 `plan.style` 选择；先把现有风格跑稳再加。
- 新增 motif：往 `template/motifs/` 加 `motif_mXX.js`（遵循 scene 规范：`SCENES.__SCENE_ID__`、
  `build(g, defs, H, W, HGT, scene)`、`scene.palette/scene.dur/scene.tag`），再登记 `motif_catalog.json`。

## 7. 速度：想更快时按这个顺序做

整条流水线里最耗时的是「画 custom 场景」「整片实时 QA」「导出 MP4」，其它步骤都只占几秒：

1. **画场景并行**：每批 4–6 个独立场景派给多个画师；相邻句不要给同一个人。
   改一句只跑 `node tools/check-scene.mjs sXX` + 单场景截图，不要每改一句就重建全片。
2. **QA 分层**：迭代期跑 `node tools/qa.mjs --fast`（约 20s，跳过整片实时播放）；
   交付前再跑一次 `node tools/qa.mjs`（完整版，约 片段时长 + 25s）。不要每轮都实时播完整片。
3. **视频导出**：默认 4 进程并行 + 快速截图，30s 片段约 2 分钟；只做预览时
   `--start/--end` 导一段、`--fps 24`、`--scale 0.75` 都会更快；`--format jpeg --quality 92`
   可再省一点（有轻微压缩）。低配/明显降频的机器用 `--workers 1` 或 `2`，避免多进程互相拖慢。
4. **音源**：用户给了本地文件 / B 站直链就直接 `--file` / `--url`，跳过自动搜索；
   有 `duration_hint` 就传 `--expect-duration`，让候选一次选对版本，避免下载后才发现不对重来。
5. **不要重复 scaffold**：改 plan 才重跑 scaffold（会重建整个工程）；只改场景/歌词就用
   `_project/src/` + `node build.mjs` 增量更新。
