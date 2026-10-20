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

### Step 4 给每句分配画面（原创优先，默认 ≥70% custom）

**先为每句想画面，再决定画法。** 对每句歌词写一个 `concept`（这句要画什么、为什么这样画），
再从画面类型清单里选 `scene_type`，最后决定这一句是 **custom（单独绘制）** 还是 **motif（模板兜底）**。

**默认策略：`original-first`（原创优先）**
- custom 数量 ≥ `max(3, ceil(句数 × 0.7))`；≤4 句时全部 custom。
- 首句、末句、副歌/标题句/情绪峰值句必须 custom。
- motif 只能用于低信息量/重复/过渡句，**≤30%、最多 4 句，且不允许连续两句都用模板**。
- 模板表（m01–m15）只是兜底参考：不要因为歌词里出现「雨/烟花/光/时钟」就直接套 m06/m10/m03/m13；
  先想原创画面，实在没有信息量才用模板。
- 用户明确说「快速版 / 用模板」→ plan 里写 `"scene_policy": "template-ok"`；
  用户说「全部独立场景」→ 全部 custom。

**每句必须写进 plan 的字段**（格式见 `docs/plan-schema.md`）：
- `concept`：一句画面概念（custom 必填，建议 motif 也写）——这是画师唯一的创作依据。
- `scene_type`：画面类型（custom 必填，相邻不得相同）。
- `custom`：true / false；`motif`：custom 可留空，motif 句填 m01–m15。

**画面类型清单**（`scene_type` 只能从以下值选）：
`人物剪影 / 物体特写 / 建筑空间 / 自然景观 / 城市夜景 / 抽象图形 / 几何结构 / 文字排版 / 机械装置 / 第一人称视角 / 微观质感 / 光影剧场 / 其他`

**模板兜底表**（仅用于低信息量过渡句，不要照着抄构图）：

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

**原创性硬要求**（scaffold 会写进 SCENE_BRIEF，画师执行）：
- custom 场景不得复刻 m01–m15 的构图骨架（星空+剪影、雨窗、眼睛海、烟花、时钟、漩涡、燃烧的心…）；
- 同一项目里相邻 custom 必须换 `scene_type`，整片至少出现 4 种画面类型（句数少时按句数）；
- 每首歌 scaffold 会自动给整套调色板做色相偏移（`palette_shift`），所以模板场景也不会和别的歌一模一样；
- 保留 `neon-dj` 风格，但「画什么」必须来自这句歌词，不能是「换色重画模板」。

scaffold 会强制检查：custom 比例不足、缺 concept/scene_type、连续模板、相邻同类型、类型种数不足都会直接报错退出。
确实要模板快速版，必须显式设 `"scene_policy": "template-ok"`。

### Step 5 生成项目

把 Step 1–4 的结果写成 `plan.json`（格式见 `docs/plan-schema.md`），然后：

```bash
python <SKILL>/scripts/scaffold.py --plan plan.json --out "<输出目录>" --build
```

scaffold 会：复制页面工程 + motif 场景 → 生成 `src/timeline.js`（场景起止/歌词/调色板/卡点表）→
内联音频 → 生成 index/preview/test-runner → 写 `project.json`、`README.md`，有 custom 时写 `SCENE_BRIEF.md`。
`--build` 会直接 `node build.mjs` 产出单文件 `index.html`。
每首歌的整套调色板会按「歌名 + 歌手」自动做 `palette_shift` 色相偏移（同一模板在不同歌里颜色不同）；
要关闭或手动指定时见 `docs/plan-schema.md`。

**门禁**：scaffold 输出 `ok: true`，`scene_count` 与歌词句数一致（s01 从 0s 开始，其余以起唱点切换）；
`scene_policy=original-first` 时 `custom_ratio ≥ 0.7`、custom 句都带 concept/scene_type，否则 scaffold 直接报错。

### Step 6 画 custom 场景（原创优先模式下占大头）

默认一个项目有 70%+ 的句子是 custom，**按 2–4 个场景一组派给多个画师并行**（subagent / teammate）：

- 必读：`<SKILL>/docs/scene-authoring.md` + 项目根目录 `SCENE_BRIEF.md`（每句的 concept / scene_type）+
  项目 `src/art.js` + `src/scenes/` 里任意两个 motif 场景（只为理解 API，不要照抄构图）；
- 每个画师先用自己的话复述分到的 `concept`，再动手；只改分到的 `src/scenes/sXX.js`，页面其它文件不许动；
- **不要复刻 m01–m15 的构图**；相邻场景的画面类型/机位/主体要有明显差别；配色用本片 `scene.palette`；
- 自检：`node tools/check-scene.mjs sXX`（退出码 0、errors=[]、badPaths=[]、nodes<800）+
  截图 `src/preview.html?scene=sXX&t=...&anim=0`，把截图和 concept 一起报给 Lead；
- 全画完重新 `node build.mjs`。

### Step 7 QA（全部通过才算交付）

```bash
npm install --prefix tools          # 首次
node build.mjs
node tools/validate.mjs             # 场景全量：加载/update/path/性能
node tools/check-final.mjs          # 单文件：0 外部请求、0 console error、逐场景 active+lyric、截图
node tools/check-real-full.mjs      # 真音频完整播放：切点误差、结束/重播
node tools/test-real-audio.mjs      # 音轨引擎 24 项断言
node tools/check-autoplay-fallback.mjs  # 自动播放被拦 → 海报+点击起播
node tools/contact-sheet.mjs        # 生成接触表
```

通过标准：
- validate：`failed=0`、`badPaths=[]`、`maxMs<1.0`；
- check-final：`externalOk/consoleOk/headerOk/durationOk/sceneLayersOk/syncOk/shotsOk` 全 true；
- check-real-full：`allOk=true`（切点误差 ≤0.45s），结束页和重播正常；
- test-real-audio：`pass=24 fail=0`；
- 接触表亲自看一遍（或让画师看），确认每格画面成立、无 TODO 占位；
- **画面原创性复核**：把接触表与 15 个模板逐格对照——custom 场景如果像某个 mXX 模板就重画；相邻场景构图/机位不能雷同；
  整片画面类型 ≥ `min(4, custom 句数)` 种；`project.json` 里 `custom_ratio ≥ 0.7`（除非用户明确要 template-ok）。

**不通过就修再跑**；不要说“应该没问题”。修完重新 `node build.mjs` 再全量 QA。

### Step 8 交付

用 `present` 给用户：
1. `index.html`（最终单文件，双击即播）；
2. `assets/song_clip.mp3`（试听/核对用）；
3. `shots/contact_sheet.png`（全片接触表）；
4. `README.md`（使用说明 + 时间轴 + 来源 + 版权提示）。
并说明：浏览器需要点一次「点击开始」才有声音；音频来源与版权提示；如需要换片段/换风格可重跑。

## 3. 目录与产物

```
<输出目录>/
  index.html               最终单文件（离线可播）
  src/                     开发工程（timeline/scenes/audio-data/…）
  tools/                   QA 脚本（读 project.json）
  assets/song_clip.mp3     截取后的音轨
  project.json             项目配置（场景/时间轴/来源/custom 标记）
  README.md / SCENE_BRIEF.md
  shots/                   QA 截图 + 接触表
  meta/                    plan.json / lyrics.json / cut.json / pulse_table.txt
```

## 4. 常见故障与处理

| 现象 | 原因 | 处理 |
|---|---|---|
| fetch_lyrics 找不到首尾句 | 歌词文本差异/翻唱版本不同 | 打印候选；让用户确认歌手或直接给歌词文本/时间 |
| align_and_cut 命中率低 | 音源不是 LRC 对应的版本（同名单曲≠同一录音） | 换音源（平台的同名 DJ/翻唱版本很多）；用 `--file` 让用户提供；绝不硬交付 |
| fetch_audio 下不到 | 版权/VIP/接口变化 | 用 B 站公开视频链接；或让用户提供 mp3 |
| 页面场景报错/空白 | scene 文件 build/update 抛错 | `node tools/check-scene.mjs sXX`，修完重建 |
| 页面声音与歌词不同步 | 时间轴没按 cut.json 的 rel 时间 | 重新 scaffold；检查 `project.json` 的 `start` 与 cut.json `rel` 是否一致 |
| custom 场景还是 TODO | 画师没交付 | 重新派单；交付前 grep `TODO — CUSTOM SCENE` |
| QA 依赖缺 puppeteer | 没装 node_modules | `npm install --prefix tools` |

## 5. 硬约束（写进交付说明，不要对用户隐瞒）

1. **版权**：公开平台的音源/歌词默认只能用于非商业演示；商用需授权或用户自备素材。
2. **自动播放**：浏览器必须用户点击一次才能出声，无法绕过。
3. **音源版本校验是强制的**：`meta/cut.json` 的 alignment 不通过就不交付，这是本技能最重要的一条。
4. 单文件体积：53s 音频约 1.4MB；长篇/多段会更大，必要时降低码率或减少片段长度。
5. 生成项目的 `tools/` 需要 `npm install` 才能跑浏览器 QA；构建（build.mjs）不需要。
6. **不要在生成的页面里加固定宣传文案 / 模型名 / 水印**（用户明确不需要）；页面只保留歌名、歌词、播放控件。
7. 交付前确认 `grep -r "TODO — CUSTOM SCENE" src/scenes/` 为空（除非用户同意先用占位）。
8. **原创优先是默认交付标准**：除非用户明确要求「模板快速版」，不得用 `scene_policy: "template-ok"` 绕过；
   交付前确认 `custom_ratio ≥ 0.7`、SCENE_BRIEF 里的 concept 都已落实、custom 场景没有复刻模板构图。

## 6. 模板库与扩展

- 视觉风格：当前只有 `neon-dj`（`template/src/art.js` + `style.css` + `motifs/`）。
- 新增风格：复制 `template/` 为 `template-<style>/` 或把 art/style/motifs 放进 `styles/<style>/`，
  并在 scaffold 里按 `plan.style` 选择；先把现有风格跑稳再加。
- 新增 motif：往 `template/motifs/` 加 `motif_mXX.js`（遵循 scene 规范：`SCENES.__SCENE_ID__`、
  `build(g, defs, H, W, HGT, scene)`、`scene.palette/scene.dur/scene.tag`），再登记 `motif_catalog.json`。
