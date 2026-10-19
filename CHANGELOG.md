# Changelog

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
