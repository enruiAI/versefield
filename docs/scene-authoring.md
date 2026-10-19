# 自定义场景绘制指南（scene-authoring）

> 给「关键句需要单独绘制」时使用的子代理 / 画师。项目里会复制一份项目专用的
> `SCENE_BRIEF.md`（含本项目的句子、时长、配色、slug），本文件是通用规范。

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
      var pal = scene.palette;         // {bg1,bg2,bg3,accent,accent2,ink}
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

- 先读 `src/art.js`（window.A 素材库）和 `src/scenes/` 里任意两个模板场景。
- 画布 1600×900；顶部 y<130 固定标题，底部 y>640 固定歌词/控制条；主体放 y150–620。
- 配色只用 `scene.palette` + `A.C` 通用色 + 白色；不要引入新的主色系。
- 每帧至少 3 层：远景（星空/城市/雾）→ 中景（主视觉）→ 近景（粒子/光斑）。
- 霓虹用 `A.neon`（外发光+主色+白芯）；人物用 `A.person`（近黑剪影+轮廓光，不画脸）；
  粒子用 `A.dust` / `A.bokeh` / `A.rain`；鼓点用 `A.ripple` 或 `info.pulse` 做 2–4 处缩放/辉光。
- 镜头内 3 段式：入场（0–0.35s）→ 展开 → 收束（结束前 0.2–0.4s）；切点是硬切，不拖尾。
- 每场景节点 < 800；不要每帧改 filter；不要外部图片/字体/网络；不要写中文歌词（HTML 层负责）。
- 场景左上角放 `A.tag(g, scene.tag || 'NN — TITLE', 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.5 })`。

## 4. 自检命令（项目根目录）

```powershell
# 单场景检查（build/update 报错、非法 path、节点数、每帧耗时）
node tools/check-scene.mjs sXX

# 截两帧看效果（t≈45% 与 80%）。注意：preview.html 的 t 是「镜头内相对时间」，
# 不是全局时间；例如 s07 从 20.95s 开始、本镜头 8s，则截 45% 用 t=3.6，而不是 24.55。
node tools/shot.mjs "src/preview.html?scene=sXX&t=1.5&anim=0" shots/dev_sXX_1.png 900
```

要求：`check-scene` 退出码 0、`errors: []`、`badPaths: []`、节点数 < 800；
截图主体清晰、无出界/死黑；完成后把两张截图路径和一句话画面描述报给 Lead。

## 5. 完成后

告诉 Lead：场景 id、文件路径、截图路径、画面描述、是否有共享素材需求。
Lead 会重新 `node build.mjs` 并跑最终 QA。
