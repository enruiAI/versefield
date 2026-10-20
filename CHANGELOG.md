# Changelog

## v0.1.5 — 2026-10-20

### 新增（社区规范）

- `CODE_OF_CONDUCT.md`：采用 Contributor Covenant 2.1，明确举报与处理流程。
- `SECURITY.md`：支持的版本、私密漏洞报告方式、安全范围与提示。
- `ACCESSIBILITY.md`：无障碍支持情况、已知限制与反馈方式；新增无障碍 issue 模板。
- `.github/PULL_REQUEST_TEMPLATE.md`：PR 自检清单（语法、版权、截图、文档同步、QA）。
- GitHub 仓库启用 Discussions 与私密漏洞报告；README 增加“社区与安全”入口。
- CHANGELOG / 版本号同步到 v0.1.5。

## v0.1.4 — 2026-10-20

### 新增

- **MP4 视频导出**：生成项目新增 `tools/export-video.mjs`。用无头 Chrome 打开 `index.html?export=1`，
  按时间轴逐帧渲染并截图，再用 ffmpeg 把 PNG 序列 + 项目音轨合成 H.264/AAC MP4。
  音轨直接取 `assets/song_clip.mp3`，不经过浏览器，因此不会掉帧、不会音画漂移（不是录屏）。
  - 默认 30fps / 1600×900；`--fps 50 --scale 1.2` 可出 1920×1080 / 50fps（对齐 50fps 卡点表）；
  - 支持 `--start/--end` 只导出一段、`--out` 指定产物、`--show-ui` 保留控件、`--keep-frames` 调试；
  - 依赖 ffmpeg（PATH / `FFMPEG_PATH` / `pip install imageio-ffmpeg`）+ puppeteer-core。
- `core.js` 增加导出模式：`?export=1` 冻结主循环与 CSS 动画，`window.__player.renderAt(t)` 逐帧渲染。
- SKILL.md / README / 生成项目的 README 增加“导出 MP4”说明与参数示例。

## v0.1.3 — 2026-10-20

### 调整

- **默认策略改为 `flexible`（按语义判断，不强制比例）**：模板不再按配比硬性分配，
  只有某句的画面构思和某个 motif 真正贴合时才借用（例如歌词真的在写烟花才用 m10），其余句子单独绘制。
  响应反馈：技能主要提供思路，模板应在确实相近时灵活使用。
- scaffold 从「硬性门禁」改为「提醒 + 可选严格模式」：
  - `flexible`（默认）：不拦生成；对全模板、模板占比过高、连续两句模板、custom 缺 concept 给 `warnings`，
    提示回去确认是否真的贴合或偷懒；
  - `original-first`（可选）：用户明确要求「尽量原创 / 全部独立场景」时，仍强制 ≥70% custom、
    首尾 custom、不连续模板、concept/scene_type 门禁；
  - `template-ok`（可选）：用户明确要求「快速版 / 用模板」时允许全模板。
- 保留每首歌自动配色偏移（`palette_shift`）、SCENE_BRIEF 的概念/类型说明、custom 场景不复刻模板构图的要求。
- SKILL.md Step 4 改为「先写 concept → 再扫模板表判断是否真的贴合」的决策流程；plan-schema / scene-authoring /
  README 同步更新。

## v0.1.2 — 2026-10-20

### 变更

- **画面原创优先（重要）**：默认 `scene_policy: "original-first"`，每个项目至少 70% 的句子用 custom 单独绘制
  （≤4 句时全部 custom），首尾句/副歌/情绪句必须 custom；15 个 motif 只允许用于低信息量过渡句，
  最多 30% 且不允许连续两句复用模板。解决「不同歌曲生成出来画面很像同一支 MV」的问题。
- **plan 字段增强**：每句新增 `concept`（画面概念）与 `scene_type`（画面类型，13 种枚举）。
  custom 必填；相邻 custom 不得同类型；整片至少 `min(4, custom 数)` 种类型。scaffold 对不满足的策略直接报错。
- **每首歌独立配色**：scaffold 按「歌名 + 歌手」自动对整套调色板做 -50°~50° 色相偏移（`palette_shift`），
  复用的模板场景也会换一套颜色；可用 `palette_variant: false` 关闭或手动指定角度。
- **`SCENE_BRIEF.md` 重写**：加入整片视觉基调、原创性硬要求、模板避让清单、每句 concept/画面类型对照表，
  custom 场景文件头部直接写入该句 concept；画师不用猜。
- SKILL.md / docs（plan-schema、scene-authoring）/ README 同步更新；涉及 70%+ 场景，画师按 2–4 场景一组并行。
- 仍可用 `"scene_policy": "template-ok"` 显式切回模板快速版（仅当用户明确要求）。

## v0.1.1 — 2026-10-19

### 变更

- **仓库根目录就是技能包本体**：`SKILL.md` 位于仓库根。clone / 解压后把整个 `versefield/`
  文件夹放进 `~/.dsh/skills/` 即可使用，不用再找子文件夹、也不用手动改名。
- **许可证由 MIT 更换为 Apache License 2.0**（新增 `NOTICE`）；README、贡献指南等文档同步更新。
- 仓库名统一为小写 `versefield`，`git clone` 得到的文件夹名与技能目录名一致。
- `install.sh` / `install.ps1` 适配根目录安装，自动排除 `.git`、`node_modules`、`__pycache__` 等；
  CI 路径同步更新。
- Release 附件 `versefield-v0.1.1.zip` 只包含技能包本体，解压即可放进技能目录。

## v0.1.0 — 2026-10-19

首个公开版本。

### 新增

- **完整生成流水线**：`fetch_lyrics.py`（QQ/网易云歌词与时间轴）、`fetch_audio.py`（本地文件 / URL / 网易云 / B 站自动搜）、
  `align_and_cut.py`（人声起音 vs LRC 逐句校验 + 截取 + 卡点表）、`scaffold.py`（由 `plan.json` 生成整首歌项目）。
- **15 个可复用 SVG 场景模板（motif）**：星海 / 玻璃星球 / 地平线光 / 眼睛海 / 天台拍立得 / 雨夜窗 /
  拨云手 / 收集机器 / 耳机气泡 / 城市烟花 / 冻结烟花 / 漩涡 / 错位时钟 / 松手光球 / 燃烧的心。
- **混合场景模式**：关键句单独绘制（`custom: true`），其余复用 motif；自动生成 `SCENE_BRIEF.md`。
- **页面引擎**：单文件离线 HTML（内联音频，0 外部请求）、逐句硬切 + 主色闪白、逐字歌词、
  50fps 起音包络驱动的鼓点/光环/心跳。
- **QA 工具**：`validate` / `check-scene` / `check-final` / `check-real-full` / `test-real-audio` /
  `check-autoplay-fallback` / `contact-sheet`，全部由 `project.json` 驱动、场景数与时长自适应。
- **DSH Skill 集成**：`SKILL.md` 提供触发语、8 步流水线、质量门禁与故障处理。
- **端到端验证**：用真实歌曲片段（7 句 / 28.95s）从零生成并跑通全部 QA（见 `research/e2e-validation.md`，本地）。

### 已知限制

- 浏览器必须用户点击一次后才能播放声音（自动播放限制）。
- 同名歌曲多版本时，工具用“标题 + 歌手 + 时长 + LRC + 起音 + 试听”多层兜底，仍建议人工确认。
- 音源平台接口可能变化，需要登录/VIP 的曲目请使用 `--file` 传入本地 BGM。
- 当前视觉风格只有 `neon-dj`。

### 许可

MIT License（v0.1.0 历史版本；自 v0.1.1 起改为 Apache License 2.0）。仓库不包含任何歌曲音频或歌词文件。
