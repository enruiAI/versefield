# 自定义场景绘制指南（scene-authoring）

> 给「每句单独绘制」时使用的子代理 / 画师。项目里会复制一份项目专用的
> `SCENE_BRIEF.md`（含本片整片视觉基调、每句的 `concept` / `scene_type`、模板避让清单、配色），
> 本文件是通用规范。**默认原创优先模式下，一个项目 70% 以上的镜头都是 custom**。

## 0. 开工前先读

1. 项目根目录 `SCENE_BRIEF.md`：找到分给你的 `sXX` 的 **歌词 / concept / scene_type / 时间 / HUD**；
2. 分到的 `src/scenes/sXX.js` 文件头注释（scaffold 已把 concept 写进去）；
3. `src/art.js`（素材库 API）和 `src/scenes/` 里任意两个模板场景（**只为理解 API，不要照抄构图**）；
4. 本规范第 3–4 节。

## 1. 你只能改哪些文件

只改项目里分给你的 `src/scenes/sXX.js`。**不要**改 `timeline.js / art.js / core.js /
index.html / style.css / preview.html / test-runner.html / project.json`。

## 2. 场景 API

```js
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};
  SCENES.s03 = {                       // 文件对应的场景 id
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A, TL = global.TL;
      var pal = scene.palette;         // {bg1,bg2,bg3,accent,accent2,ink}，已按本歌色相偏移
      var dur = scene.dur;             // 本镜头真实时长（秒）
      var tagText = scene.tag;         // 左上角 HUD 文案（可按句改写）
      // ... 画静态结构（建议先 A.frame 已由 core 画好，这里直接加元素）...
      return {
        update: function (t, info) {
          // t: 0..dur 秒；info.pulse 0..1 鼓点包络；info.energy/bass/mid/treble 0..1
          // 纯函数、确定性：同一 t 必须同一帧（禁止 Math.random / performance.now）
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
```

## 3. 视觉规范（默认 neon-dj 风格，画之前先读）

- 画布 1600×900；顶部 y<130 固定标题，底部 y>640 固定歌词/控制条；主体放 y150–620。
- 配色只用 `scene.palette` + `A.C` 通用色 + 白色；不要引入新的主色系。
- 每帧至少 3 层：远景（星空/城市/雾）→ 中景（主视觉）→ 近景（粒子/光斑）。
- 霓虹用 `A.neon`（外发光+主色+白芯）；人物用 `A.person`（近黑剪影+轮廓光，不画脸）；
  粒子用 `A.dust` / `A.bokeh` / `A.rain`；鼓点用 `A.ripple` 或 `info.pulse` 做 2–4 处缩放/辉光。
- 镜头内 3 段式：入场（0–0.35s）→ 展开 → 收束（结束前 0.2–0.4s）；切点是硬切，不拖尾。
- 每场景节点 < 800；不要每帧改 filter；不要外部图片/字体/网络；不要写中文歌词（HTML 层负责）。
- 场景左上角放 `A.tag(g, scene.tag || 'NN — TITLE', 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.5 })`。

## 4. 原创性要求（最重要，违反就重画）

不同歌曲复用同一批画面，是这首歌看起来「像别的 MV」的根本原因。每条 custom 场景必须做到：

1. **围绕你分到的 `concept` 画**：concept 是这句歌词专属的画面隐喻，不是模板名。
   先用自己的话复述一遍 concept，再决定主体、空间、镜头。
2. **禁止复刻 m01–m15 的构图骨架**。常见模板骨架（出现即视为抄袭模板）：
   - 星空 + 地平线 + 小小人物剪影（m01）
   - 玻璃球/星球 + 城市微缩（m02）
   - 地平线大光晕 + 人物背影（m03）
   - 眼睛里倒映海面（m04）
   - 天台护栏 + 拍立得/城市夜景（m05）
   - 雨夜窗户 + 室内人影（m06）
   - 手拨开云层/阴霾（m07）
   - 流水线/机器收集与删除（m08）
   - 耳机线 + 情话气泡（m09）
   - 城市夜空烟花（m10）
   - 冻结在半空的烟花（m11）
   - 漩涡/下坠隧道（m12）
   - 两只错位时钟（m13）
   - 松手让光球升空（m14）
   - 燃烧的心脏（m15）
3. **同片不重复**：和本项目其它 custom 场景并排看，机位（远景/中景/特写）、主体、背景三层都要有明显差别；
   `scene_type` 相邻不同是底线，但即使类型不同也不能是「同一个构图换配色」。
4. **每个场景至少一个「只属于这句」的视觉点子**：一个具体的物体、动作、空间结构或材质，
   能让人不看歌词也猜不到是别的歌的镜头。
5. **背景不要偷懒**：不能所有场景都是「深色星空 + 光晕 + 粒子」。可以用城市、房间、水面、纸张、织物、
   机械内部、抽象几何、镜头光斑等不同空间；模板场景的配色可以借鉴，构图不行。
6. **配色统一**：整片用 `scene.palette`（每首歌已经做过色相偏移），需要层次时用 `A.C` 里的白/灰/通用色，
   不要自己造一套主色，否则整片会花。
7. **不确定就问 Lead**：concept 缺失、和别的场景撞构图、或想换 scene_type，先报 Lead 再画。

## 5. 自检命令（项目根目录）

```powershell
# 单场景检查（build/update 报错、非法 path、节点数、每帧耗时）
node tools/check-scene.mjs sXX

# 截两帧看效果（t≈45% 与 80%）。注意：preview.html 的 t 是「镜头内相对时间」，
# 不是全局时间；例如 s07 从 20.95s 开始、本镜头 8s，则截 45% 用 t=3.6，而不是 24.55。
node tools/shot.mjs "src/preview.html?scene=sXX&t=1.5&anim=0" shots/dev_sXX_1.png 900
```

要求：`check-scene` 退出码 0、`errors: []`、`badPaths: []`、节点数 < 800；
截图主体清晰、无出界/死黑；**再把截图和 SCENE_BRIEF 里的模板清单/其它分镜并排看**，像模板或像邻镜就重画。

## 6. 完成后

告诉 Lead：场景 id、文件路径、截图路径、一句话画面描述（对应 concept）、和哪个模板最容易混（自评）。
Lead 会重新 `node build.mjs` 并跑最终 QA。
