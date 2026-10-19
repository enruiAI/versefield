/* =========================================================================
 * MOTIF m07 — 拨开阴霾的手
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：拨开/云/阴霾/手/光/放晴
 * ========================================================================= */
/* =========================================================================
 * s07 — 你让我学会如何拨开阴霾  (21.00 – 24.00s)
 * 情绪：厚重云层压着整个画面，一双手从下方伸出，向两侧慢慢拨开阴霾；
 *      金色光从缝隙里炸开，光柱、光尘、光晕铺满画面，结尾被暖光填满。
 * 画面：暗紫云层（左右两团）→ 中央金色光核 / 放射光柱 → 手臂剪影 → 金色光尘。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[6].palette;
      var dur = (scene && scene.dur) || TL.scenes[6].dur;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);
      var glowF = A.glowF(defs, 9);
      var blurF = A.blurF(defs, 22);

      A.tag(root, ((scene && scene.tag) || '07 — PART THE HAZE'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.55 });

      var CX = 800, CY = 396;

      /* ================= 中央光核 ================= */
      var lightG = H.make('g', {}, world);
      // 大范围暖光
      var warmId = H.radial(defs, [
        [0, '#fff8e6', 0.92], [0.16, pal.accent2, 0.8], [0.42, pal.accent, 0.42],
        [0.7, '#8a6a4a', 0.12], [1, '#2a2340', 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var warmGlow = H.make('circle', { cx: CX, cy: CY, r: 560, fill: 'url(#' + warmId + ')' }, lightG);
      // 白热核心
      var coreGlow = A.rad(defs, '#ffffff', [[0, 0.95], [0.35, 0.5], [1, 0]]);
      var core = H.make('circle', { cx: CX, cy: CY, r: 150, fill: 'url(#' + coreGlow + ')' }, lightG);
      // 放射光柱
      var beams = H.make('g', { opacity: 0 }, lightG);
      var beamList = [];
      for (var b = 0; b < 14; b++) {
        var bAng = b / 14 * 360;
        var bLen = 380 + (b % 4) * 90;
        var bW = 26 + (b % 3) * 22;
        beamList.push(A.beam(beams, defs, CX, CY, bW, bLen, b % 3 === 0 ? '#ffffff' : pal.accent, 0.5, bAng));
      }
      // 中心十字星芒
      A.flare(lightG, defs, CX, CY, 34, pal.accent2, { opacity: 0.85 });
      // 扩散光环
      var ripple = A.ripple(lightG, defs, CX, CY, pal.accent, { count: 3, r0: 60, r1: 460, width: 2, alpha: 0.9 });

      /* ================= 左右两团厚重云层 ================= */
      function makeCloudGroup(seed, dir) {
        var grp = H.make('g', {}, world);
        var rand = H.rng(seed);
        // 云团主体：一堆大的暗紫灰椭圆
        for (var i = 0; i < 9; i++) {
          var cxp = dir * (60 + rand() * 560) + 800;
          var cyp = 150 + rand() * 420;
          var crx = 150 + rand() * 220;
          var cry = 90 + rand() * 150;
          var gid = H.radial(defs, [
            [0, '#3d335e', 0.96], [0.55, '#241d3a', 0.93], [1, '#14101f', 0]
          ], { cx: 0.5, cy: 0.5, r: 0.5 });
          H.make('ellipse', {
            cx: cxp, cy: cyp, rx: crx, ry: cry,
            fill: 'url(#' + gid + ')', opacity: 0.95
          }, grp);
        }
        // 云团朝向中心的边缘被光染亮（几条暖金弧线）
        for (var k = 0; k < 3; k++) {
          H.make('path', {
            d: 'M' + (800 + dir * (24 + k * 26)) + ' ' + (210 + k * 150) +
              ' Q' + (800 + dir * (10 + k * 20)) + ' ' + (260 + k * 150) +
              ' ' + (800 + dir * (34 + k * 22)) + ' ' + (330 + k * 150),
            fill: 'none', stroke: pal.accent, 'stroke-width': 2.2 - k * 0.5,
            'stroke-linecap': 'round', opacity: 0.28, filter: 'url(#' + glowF + ')'
          }, grp);
        }
        return grp;
      }
      var cloudL = makeCloudGroup(41, -1);
      var cloudR = makeCloudGroup(73, 1);

      /* ================= 一双手（从下方伸出、向两侧拨开） ================= */
      function makeHand() {
        var hand = H.make('g', {}, null);
        var shapes = [];
        shapes.push('M -32 14 Q -38 -26 -25 -56 L 25 -56 Q 38 -26 32 14 Q 0 30 -32 14 Z');
        var fingers = [
          { x: -24, len: 66, w: 13, a: -13 },
          { x: -8, len: 78, w: 14, a: -4 },
          { x: 8, len: 74, w: 14, a: 4 },
          { x: 23, len: 58, w: 12, a: 14 }
        ];
        fingers.forEach(function (f) {
          shapes.push({ d: 'M' + f.x + ' -44 L' + f.x + ' ' + (-f.len), w: f.w, a: f.a });
        });
        // 拇指
        shapes.push({ d: 'M 30 -6 L 52 -34', w: 16, a: 0 });
        shapes.forEach(function (s) {
          if (typeof s === 'string') {
            H.make('path', { d: s, fill: '#0b0716' }, hand);
          } else {
            var fg = H.make('g', { transform: 'rotate(' + s.a + ' ' + (s.x || 0) + ' -44)' }, hand);
            H.make('path', {
              d: s.d, fill: 'none', stroke: '#0b0716', 'stroke-width': s.w, 'stroke-linecap': 'round'
            }, fg);
          }
        });
        return hand;
      }
      // 手的外轮廓光：同样的形状换成金色，略微放大垫在暗色手之后
      function makeHandRim() {
        var hand = H.make('g', { opacity: 0.75, filter: 'url(#' + glowF + ')' }, null);
        var shapes = [];
        shapes.push('M -32 14 Q -38 -26 -25 -56 L 25 -56 Q 38 -26 32 14 Q 0 30 -32 14 Z');
        var fingers = [
          { x: -24, len: 66, w: 13, a: -13 },
          { x: -8, len: 78, w: 14, a: -4 },
          { x: 8, len: 74, w: 14, a: 4 },
          { x: 23, len: 58, w: 12, a: 14 }
        ];
        fingers.forEach(function (f) {
          shapes.push({ d: 'M' + f.x + ' -44 L' + f.x + ' ' + (-f.len), w: f.w, a: f.a });
        });
        shapes.push({ d: 'M 30 -6 L 52 -34', w: 16, a: 0 });
        shapes.forEach(function (s) {
          if (typeof s === 'string') {
            H.make('path', { d: s, fill: pal.accent2 }, hand);
          } else {
            var fg = H.make('g', { transform: 'rotate(' + s.a + ' ' + (s.x || 0) + ' -44)' }, hand);
            H.make('path', {
              d: s.d, fill: 'none', stroke: pal.accent2, 'stroke-width': s.w, 'stroke-linecap': 'round'
            }, fg);
          }
        });
        return hand;
      }

      // 左臂（肩在下方画面外，手推到左上）
      var armL = H.make('g', {}, world);
      var armRimL = H.make('path', {
        d: 'M 742 940 L 694 660 L 636 430', fill: 'none', stroke: pal.accent2,
        'stroke-width': 64, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        opacity: 0.6, filter: 'url(#' + glowF + ')'
      }, armL);
      var armBodyL = H.make('path', {
        d: 'M 742 940 L 694 660 L 636 430', fill: 'none', stroke: '#0b0716',
        'stroke-width': 54, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }, armL);
      var handL = H.make('g', { transform: 'translate(636 430) rotate(-28)' }, armL);
      handL.appendChild(makeHandRim());
      handL.appendChild(makeHand());

      // 右臂（镜像）
      var armR = H.make('g', {}, world);
      H.make('path', {
        d: 'M 858 940 L 906 660 L 964 430', fill: 'none', stroke: pal.accent2,
        'stroke-width': 64, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        opacity: 0.6, filter: 'url(#' + glowF + ')'
      }, armR);
      H.make('path', {
        d: 'M 858 940 L 906 660 L 964 430', fill: 'none', stroke: '#0b0716',
        'stroke-width': 54, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }, armR);
      var handR = H.make('g', { transform: 'translate(964 430) rotate(28) scale(-1 1)' }, armR);
      handR.appendChild(makeHandRim());
      handR.appendChild(makeHand());

      // 手臂边上被光照亮的金色光尘
      var dust = A.dust(world, {
        count: 54, seed: 27, x: [120, 1480], y: [150, 760], r: [1, 3],
        colors: ['#fff2cc', pal.accent, '#ffffff'], opacity: 0.6
      });
      var bokeh = A.bokeh(world, defs, {
        count: 12, seed: 63, x: [340, 1260], y: [120, 560], r: [30, 90],
        colors: [pal.accent2, pal.accent], opacity: 0.3, blur: 22
      });

      // 结尾铺满的暖光（不盖住歌词区）
      var fillGrad = H.grad(defs, [
        [0, pal.accent2, 0], [0.55, pal.accent, 0.24], [1, pal.accent, 0]
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      var warmFill = H.make('rect', { x: 0, y: 130, width: W, height: 520, fill: 'url(#' + fillGrad + ')', opacity: 0 }, world);

      // 轻微暗角，让光更集中
      var vig = H.radial(defs, [[0, '#000', 0], [0.6, '#000', 0.10], [1, '#000', 0.55]], { cx: 0.5, cy: 0.45, r: 0.8 });
      var vigEl = H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + vig + ')', opacity: 0.8 }, root);

      /* ================= 更新 ================= */
      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var enter = A.enter(t, dur, 0.26, 0.22);
          var p = H.clamp(t / 2.35, 0, 1);
          var spread = H.E.inOutCubic(p);           // 云开程度 0..1
          var late = H.clamp((t - 1.9) / 1.0, 0, 1); // 结尾暖光

          root.setAttribute('opacity', (0.35 + 0.65 * enter).toFixed(3));

          // 推镜：越拨越近
          var cam = 1.02 + 0.05 * spread + 0.01 * pulse;
          world.setAttribute('transform',
            'translate(800 440) scale(' + cam.toFixed(4) + ') translate(-800 -440)');

          // 云：左右分开 + 鼓点时再退一点
          var off = 62 + spread * 320 + pulse * 18;
          cloudL.setAttribute('transform', 'translate(' + (-off - 10).toFixed(1) + ' ' + (8 * spread).toFixed(1) + ') rotate(' + (-3 - spread * 5).toFixed(2) + ' 800 400)');
          cloudR.setAttribute('transform', 'translate(' + (off + 10).toFixed(1) + ' ' + (8 * spread).toFixed(1) + ') rotate(' + (3 + spread * 5).toFixed(2) + ' 800 400)');

          // 光核：随云开变亮、随鼓点膨胀
          var lightA = 0.18 + 0.72 * spread + 0.16 * pulse;
          lightG.setAttribute('opacity', (lightA * (0.4 + 0.6 * enter)).toFixed(3));
          var ls = 0.6 + 0.5 * spread + 0.06 * pulse;
          lightG.setAttribute('transform',
            'translate(' + CX + ' ' + CY + ') scale(' + ls.toFixed(3) + ') translate(' + (-CX) + ' ' + (-CY) + ')');
          warmGlow.setAttribute('r', (430 + 180 * spread + 40 * pulse).toFixed(1));
          core.setAttribute('r', (96 + 54 * spread + 16 * pulse).toFixed(1));
          beams.setAttribute('opacity', (0.18 + 0.72 * spread + 0.2 * pulse).toFixed(3));
          beams.setAttribute('transform', 'rotate(' + (t * 5.5).toFixed(2) + ' ' + CX + ' ' + CY + ')');
          ripple.update(t, pulse);

          // 手：向外推开（绕肩部旋转）
          var push = spread * 1.0;
          armL.setAttribute('transform', 'rotate(' + (-4 - push * 7).toFixed(2) + ' 742 940) translate(' + (-push * 10).toFixed(1) + ' ' + (push * -6).toFixed(1) + ')');
          armR.setAttribute('transform', 'rotate(' + (4 + push * 7).toFixed(2) + ' 858 940) translate(' + (push * 10).toFixed(1) + ' ' + (push * -6).toFixed(1) + ')');
          handL.setAttribute('transform', 'translate(636 430) rotate(' + (-28 + push * 8).toFixed(1) + ')');
          handR.setAttribute('transform', 'translate(964 430) rotate(' + (28 - push * 8).toFixed(1) + ') scale(-1 1)');

          // 结尾暖光填满 + 光尘
          warmFill.setAttribute('opacity', (0.72 * late * enter).toFixed(3));
          dust.update(t, 0.7 + 0.6 * spread + 0.4 * pulse);
          bokeh.update(t, pulse);
          vigEl.setAttribute('opacity', (0.85 - 0.3 * spread).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
