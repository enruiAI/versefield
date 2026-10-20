/* =========================================================================
 * 自定义场景占位（CUSTOM SCENE STUB）
 * 这个文件是 scaffold 给「需要单独绘制」的场景生成的占位。
 * 文件头部已写入本句的歌词 / 画面类型 / 画面概念（concept）。
 *
 * 画师请：
 *   1. 读项目根目录 SCENE_BRIEF.md 与技能目录 docs/scene-authoring.md；
 *   2. 围绕 concept 设计这句专属的画面，**不要复刻 m01–m15 任何模板的构图**；
 *   3. 相邻场景的画面类型/机位/主体必须不同。
 *
 * API：build(g, defs, H, W, HGT, scene) -> { update(t, info) }
 *   scene: { id, index, start, end, dur, lyric, sub, tag, palette, motif, custom }
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var pal = scene.palette;
      var tag = A.tag(g, 'TODO — CUSTOM SCENE', 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.5 });
      var glow = A.rad(defs, pal.accent, [[0, 0.55], [0.5, 0.15], [1, 0]]);
      H.make('circle', { cx: 800, cy: 430, r: 300, fill: 'url(#' + glow + ')' }, g);
      A.tag(g, 'PLEASE CUSTOMIZE：' + (scene ? scene.lyric : ''), 800, 470, pal.ink,
        { size: 26, anchor: 'middle', opacity: 0.9 });
      A.tag(g, (scene ? scene.id.toUpperCase() : '') + ' · ' + (scene ? scene.tag || '' : ''),
        800, 530, pal.accent2, { size: 13, anchor: 'middle', spacing: 4, opacity: 0.55 });
      return {
        update: function (t, info) {
          glow && null;
          tag.setAttribute('opacity', (0.35 + (info && info.pulse ? info.pulse : 0) * 0.4).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
