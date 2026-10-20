# 贡献指南（Contributing）

感谢愿意一起完善 VerseField（词场）！这是一个把「歌名 + 歌词片段」自动变成每句一个 SVG 场景的歌词视频生成器。

仓库根目录**本身就是技能包**（`SKILL.md` 在根），所有路径都相对仓库根。

## 开发环境

- Node.js ≥ 18
- Python ≥ 3.10，`pip install numpy imageio-ffmpeg yt-dlp`
- Chrome / Edge / Chromium（跑 QA / 导出视频用；可用 `CHROME_PATH` 指定）
- ffmpeg（仅导出 MP4 需要；PATH / `FFMPEG_PATH` / imageio-ffmpeg）
- 首次在生成项目里跑浏览器 QA：`npm install --prefix <生成项目>/tools`

## 目录约定

- `SKILL.md`：技能入口（触发语 / 流水线 / 质量门禁 / 故障处理）
- `scripts/`：音频流水线（搜歌词 / 找音源 / 对齐截取 / 卡点表 / 生成项目）
- `template/`：会被复制进每个生成项目的页面工程
  - `src/`：页面引擎（helpers / art / core / audio / style）
  - `motifs/`：可复用场景模板 + `motif_catalog.json`
  - `templates/`：index / preview / test-runner / README / 自定义场景模板
  - `tools/`：QA 脚本 + `export-video.mjs`（逐帧渲染导出 MP4），读 `project.json`，场景数/时长自适应
- `docs/`：plan.json 结构、自定义场景规范
- `examples/`：示例截图（**不要提交音频或含内联音频的 HTML**）

## 本地验证

```bash
# 语法检查（与 CI 一致）
python -m py_compile scripts/*.py
for f in template/tools/*.mjs template/build.mjs; do node --check "$f"; done

# 端到端验证（推荐）
# 1) 准备一首歌的 lyrics.json / 完整音源
# 2) 用 scripts/ 走一遍 fetch_lyrics → fetch_audio → align_and_cut
# 3) 写 plan.json 后 scaffold.py --build
# 4) 在生成项目里 npm install --prefix tools 后跑 tools/ 下的 QA
```

## 新增场景模板（motif）

1. 在 `template/motifs/` 新建 `motif_mXX.js`，遵循 `docs/scene-authoring.md`：
   - 注册 `SCENES.__SCENE_ID__`（scaffold 会替换成 `sNN`）
   - `build(g, defs, H, W, HGT, scene)`，使用 `scene.palette / scene.dur / scene.tag`
   - 纯函数 `update(t, info)`，禁止 `Math.random` / `performance.now`
   - 节点数 < 800，无外部图片/字体/网络
2. 在 `template/motifs/motif_catalog.json` 登记：`id`、`file`、`name`、`keywords`、`defaultTag`、`palette`。
3. 用 `template/preview` 或一个临时项目截图自检，并跑 `check-scene.mjs`。

## 新增视觉风格

当前只有 `neon-dj`（`template/src/art.js` + `style.css` + motifs 配色）。新增风格建议：
复制一份 `template/` 到独立目录，再在 `scripts/scaffold.py` 里按 `plan.style` 选择；先不要改动现有风格。

## 音源适配

`scripts/fetch_audio.py` 里每个平台的探测/下载逻辑是独立的。新增平台请：
- 保持输出 JSON 字段 `{ok, file, duration, platform, source_url, title}`
- 失败时把候选清单和失败原因写进错误 JSON，方便上层兜底
- 只处理公开可访问的音频；不要加入绕过 DRM/付费墙的逻辑

## PR 要求

- 一个 PR 只做一件事，描述里写清楚「为什么 + 怎么验证」；
- 不提交版权音源、歌词文件、含内联音频的成品 HTML、`node_modules`、`__pycache__`；
- custom 场景不得复刻已有 motif 的构图骨架（不同歌曲复用同一批画面是明确要避免的问题）；
  新增 motif 时也请保持“兜底模板”定位，不要成为默认画面；
- 改动 UI/场景请附截图；改动脚本请附实际运行输出；
- 保持代码风格：Python 4 空格 / JS 2 空格，中文注释可以，但关键日志建议中英混合便于排查。
- 提交的代码默认按 [Apache License 2.0](LICENSE) 授权（与项目一致）。

## 报告问题

请附：操作系统、Node/Python 版本、执行的命令、完整报错、相关文件（歌词/音源请给公开链接，不要直接上传版权文件）。
