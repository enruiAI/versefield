/* =========================================================================
 * MOTIF m01 — 星海与渺小的人
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：星空/宇宙/渺小/孤单/两个人/远方
 * ========================================================================= */
/* =========================================================================
 * s01 — 我们都是渺小真实存在  (0.00 – 3.00s)
 * 情绪：巨大宇宙 vs 两个很小的人。镜头从近处慢慢拉远，让“渺小”被看见。
 * 画面：星海、远处行星与霓虹城市、悬浮舞台、两个剪影、脚下扩散的光环、划过的流星。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[0].palette;

      var world = H.make('g', {}, g);

      /* ---------- 远处行星 + 星环 ---------- */
      var planet = H.radial(defs, [
        [0, '#a8ccff', 0.38], [0.5, '#3f6fa8', 0.22], [0.78, '#16294a', 0.16], [1, '#16294a', 0]
      ], { cx: 0.38, cy: 0.4, r: 0.66 });
      H.make('circle', { cx: 1210, cy: 168, r: 268, fill: 'url(#' + planet + ')' }, world);
      H.make('circle', { cx: 1210, cy: 168, r: 268, fill: 'none', stroke: pal.accent, 'stroke-width': 1.1, opacity: 0.28 }, world);
      H.make('ellipse', {
        cx: 1210, cy: 205, rx: 430, ry: 92, fill: 'none',
        stroke: pal.accent2, 'stroke-width': 1.4, opacity: 0.22,
        transform: 'rotate(-13 1210 205)'
      }, world);
      H.make('ellipse', {
        cx: 1210, cy: 205, rx: 470, ry: 108, fill: 'none',
        stroke: pal.accent, 'stroke-width': 0.8, opacity: 0.12,
        transform: 'rotate(-13 1210 205)'
      }, world);

      // 行星边缘亮弧 + 背光阴影（让它更像一颗真的星）
      H.make('circle', { cx: 1200, cy: 176, r: 268, fill: '#04030f', opacity: 0.55 }, world);
      H.make('path', {
        d: 'M 982 40 A 268 268 0 0 1 1320 380',
        fill: 'none', stroke: '#dff0ff', 'stroke-width': 2.2, opacity: 0.55,
        filter: 'url(#' + A.glowF(defs, 7) + ')'
      }, world);

      // 极光带：三条巨大的柔和光带横扫夜空
      var aurora1 = H.radial(defs, [[0, pal.accent, 0.32], [0.5, pal.accent, 0.10], [1, pal.accent, 0]], { cx: 0.5, cy: 0.5, r: 0.5 });
      var aurora2 = H.radial(defs, [[0, pal.accent2, 0.26], [0.5, pal.accent2, 0.08], [1, pal.accent2, 0]], { cx: 0.5, cy: 0.5, r: 0.5 });
      H.make('ellipse', { cx: 520, cy: 240, rx: 640, ry: 120, fill: 'url(#' + aurora1 + ')', transform: 'rotate(-12 520 240)' }, world);
      H.make('ellipse', { cx: 1020, cy: 330, rx: 560, ry: 90, fill: 'url(#' + aurora2 + ')', transform: 'rotate(9 1020 330)' }, world);
      H.make('ellipse', { cx: 260, cy: 470, rx: 420, ry: 70, fill: 'url(#' + aurora1 + ')', transform: 'rotate(-5 260 470)', opacity: 0.75 }, world);

      // 天穹大光环（很淡，只用来撑住构图）
      H.make('circle', { cx: 800, cy: 430, r: 640, fill: 'none', stroke: pal.accent, 'stroke-width': 1, opacity: 0.07 }, world);
      H.make('circle', { cx: 800, cy: 430, r: 520, fill: 'none', stroke: pal.accent2, 'stroke-width': 0.8, opacity: 0.05 }, world);

      // 星云光斑
      A.bokeh(world, defs, {
        count: 14, seed: 17, x: [120, 1520], y: [20, 460], r: [40, 130],
        colors: [pal.accent, pal.accent2, '#8fa8ff'], opacity: 0.20, blur: 24
      });

      /* ---------- 星空 ---------- */
      var rand = H.rng(23);
      var stars = [];
      for (var i = 0; i < 170; i++) {
        var sx = rand() * W;
        var sy = rand() * 580;
        var sr = 0.6 + rand() * 2.1;
        var base = 0.22 + rand() * 0.75;
        var el = H.make('circle', {
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: sr.toFixed(2),
          fill: i % 7 === 0 ? pal.accent : (i % 5 === 0 ? pal.accent2 : '#ffffff'),
          opacity: base.toFixed(3)
        }, world);
        stars.push({ el: el, base: base, sp: 0.8 + rand() * 2.6, ph: rand() * 6.283 });
      }
      // 几颗亮星带十字光芒
      [[240, 150], [600, 90], [980, 210], [1430, 330]].forEach(function (p, k) {
        A.flare(world, defs, p[0], p[1], 7 + k * 2, pal.accent2, { opacity: 0.5 });
      });

      /* ---------- 远处城市 ---------- */
      var city = A.skyline(world, defs, pal, {
        baseY: 640, height: 150, seed: 31, win: pal.accent2
      });
      // 城市上方的雾光
      var haze = A.rad(defs, pal.accent, [[0, 0.22], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: 640, rx: 720, ry: 120, fill: 'url(#' + haze + ')' }, world);

      /* ---------- 悬浮舞台 ---------- */
      var stageY = 640;
      var ringGlow = A.glowF(defs, 9);
      // 台面
      var disc = H.radial(defs, [
        [0, '#0a1226', 0.98], [0.7, '#060a18', 0.98], [1, '#04060f', 1]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      H.make('ellipse', { cx: 800, cy: stageY, rx: 430, ry: 86, fill: 'url(#' + disc + ')' }, world);
      // 霓虹边
      H.make('ellipse', {
        cx: 800, cy: stageY, rx: 430, ry: 86, fill: 'none', stroke: pal.accent,
        'stroke-width': 2.2, opacity: 0.55, filter: 'url(#' + ringGlow + ')'
      }, world);
      H.make('ellipse', {
        cx: 800, cy: stageY, rx: 430, ry: 86, fill: 'none', stroke: '#ffffff',
        'stroke-width': 0.7, opacity: 0.5
      }, world);
      // 台面同心光环
      var rings = [];
      for (var r = 1; r <= 4; r++) {
        rings.push(H.make('ellipse', {
          cx: 800, cy: stageY, rx: 430 * r / 5, ry: 86 * r / 5, fill: 'none',
          stroke: pal.accent, 'stroke-width': 0.9, opacity: 0.16 + 0.05 * (5 - r)
        }, world));
      }
      // 台面碎光点
      var prand = H.rng(77);
      for (var k2 = 0; k2 < 26; k2++) {
        var ang = prand() * Math.PI * 2;
        var rr = Math.sqrt(prand()) * 0.88;
        H.make('circle', {
          cx: (800 + Math.cos(ang) * 430 * rr).toFixed(1),
          cy: (stageY + Math.sin(ang) * 86 * rr).toFixed(1),
          r: (0.7 + prand() * 1.6).toFixed(2),
          fill: pal.accent2, opacity: (0.15 + prand() * 0.4).toFixed(2)
        }, world);
      }
      // 舞台下方漏光
      var under = A.rad(defs, pal.accent, [[0, 0.5], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: stageY + 60, rx: 470, ry: 90, fill: 'url(#' + under + ')' }, world);

      /* ---------- 追光 ---------- */
      A.beam(world, defs, 566, stageY - 6, 150, 520, pal.accent, 0.30, 7);
      A.beam(world, defs, 1034, stageY - 6, 120, 470, pal.accent2, 0.24, -6);
      A.beam(world, defs, 800, stageY - 8, 320, 330, '#ffffff', 0.10, 0);

      /* ---------- 两个小小的人 ---------- */
      // 每个人身后一团小光晕，像舞台追光打在小小的他们身上
      var halo1 = A.rad(defs, pal.accent2, [[0, 0.55], [0.45, 0.18], [1, 0]]);
      H.make('circle', { cx: 566, cy: stageY - 30, r: 96, fill: 'url(#' + halo1 + ')' }, world);
      var halo2 = A.rad(defs, pal.accent, [[0, 0.45], [0.45, 0.15], [1, 0]]);
      H.make('circle', { cx: 1034, cy: stageY - 26, r: 82, fill: 'url(#' + halo2 + ')' }, world);
      var p1 = A.person(world, { x: 566, y: stageY + 4, s: 0.62, pose: 'stand', rim: pal.accent, color: '#03040c', rimOpacity: 0.95 });
      var p2 = A.person(world, { x: 1034, y: stageY + 2, s: 0.54, pose: 'stand', flip: true, rim: pal.accent2, color: '#03040c', rimOpacity: 0.85 });

      // 脚下光环 + 光圈
      var rip1 = A.ripple(world, defs, 566, stageY + 4, pal.accent, { count: 3, r0: 26, r1: 190, width: 1.6, alpha: 0.85 });
      var rip2 = A.ripple(world, defs, 1034, stageY + 2, pal.accent2, { count: 2, r0: 22, r1: 150, width: 1.3, alpha: 0.6 });
      var footGlow = A.rad(defs, pal.accent2, [[0, 0.5], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: stageY + 4, rx: 180, ry: 34, fill: 'url(#' + footGlow + ')' }, world);

      /* ---------- 流星 ---------- */
      var meteor = H.make('g', { opacity: 0 }, world);
      var mGrad = H.grad(defs, [[0, '#ffffff', 0.95], [0.35, pal.accent2, 0.6], [1, pal.accent2, 0]], { x1: 1, y1: 1, x2: 0, y2: 0 });
      H.make('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: 'url(#' + mGrad + ')', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, meteor);
      var meteorHead = H.make('circle', { cx: 0, cy: 0, r: 3, fill: '#ffffff' }, meteor);

      /* ---------- 光尘 ---------- */
      var dust = A.dust(world, {
        count: 58, seed: 91, x: [-40, 1640], y: [80, 860], r: [1, 3.2],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.55
      });

      var dur = (scene && scene.dur) || TL.scenes[0].dur;
      var tag = A.tag(H.make('g', {}, g), ((scene && scene.tag) || '01 — TINY, BUT REAL'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.4 });

      return {
        update: function (t, info) {
          var enter = A.enter(t, dur, 0.3, 0.2);
          var e = H.clamp(t / 2.4, 0, 1);
          // 镜头慢慢拉远：人越来越小，世界越来越大
          var cam = 1.20 - 0.24 * H.E.outCubic(e);
          world.setAttribute('transform',
            'translate(800 460) scale(' + cam.toFixed(4) + ') translate(-800 -460)');
          world.setAttribute('opacity', (0.35 + 0.65 * enter).toFixed(3));

          // 星空闪烁
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.el.setAttribute('opacity', (s.base * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph))).toFixed(3));
          }
          city.update(t);
          p1.update(t, info.pulse);
          p2.update(t, info.pulse);
          rip1.update(t + 1.2, info.pulse);
          rip2.update(t + 0.4, info.pulse);
          dust.update(t, info.energy);

          // 舞台光环随鼓点呼吸
          var br = (0.35 + info.pulse * 0.5).toFixed(3);
          rings[0].setAttribute('opacity', br);
          rings[1].setAttribute('opacity', (br * 0.75).toFixed(3));

          // 流星在 1.85s – 2.65s 划过
          var mp = H.clamp((t - 1.85) / 0.8, 0, 1);
          if (mp > 0 && mp < 1) {
            var mx = H.lerp(1500, 520, mp);
            var my = H.lerp(60, 430, mp);
            meteor.setAttribute('opacity', (Math.sin(Math.PI * mp) * 0.95).toFixed(3));
            meteor.setAttribute('transform', 'translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')');
            var line = meteor.firstChild;
            line.setAttribute('x1', (-H.lerp(120, 60, mp)).toFixed(1));
            line.setAttribute('y1', (-H.lerp(30, 18, mp)).toFixed(1));
            line.setAttribute('x2', '0'); line.setAttribute('y2', '0');
            meteorHead.setAttribute('cx', '0'); meteorHead.setAttribute('cy', '0');
          } else {
            meteor.setAttribute('opacity', '0');
          }
          tag.setAttribute('opacity', (0.24 + 0.2 * Math.sin(t * 1.6)).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
