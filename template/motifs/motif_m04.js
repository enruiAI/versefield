/* =========================================================================
 * MOTIF m04 — 眼里的大海
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：眼睛/海/泪/看见/辽阔/蓝
 * ========================================================================= */
/* =========================================================================
 * s04 — 眼睛里看到的都是广袤无垠的大海  (10.00 – 14.00s)
 * 情绪：一只巨大的眼睛占据画面中央。瞳仁里就是海平线：上半是星空与夜色，
 *       下半是发光的海面，中间一道水平光带；睫毛是一排细长的霓虹弧线；
 *       一滴泪光从眼角滑落，落到画面底部化成涟漪。镜头缓慢 push-in。
 *
 * 层次：远景深海底色/散景 → 中景巨眼（球面高光+虹膜里的海） → 近景眼泪/涟漪/光尘
 *       HUD：04 — OPEN SEA
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[3].palette;
      var dur = (scene && scene.dur) || TL.scenes[3].dur;
      var C = A.C;
      var clamp = H.clamp, lerp = H.lerp;

      var EX = 800, EY = 404;       // 眼睛中心
      var IR = 172;                 // 虹膜半径
      var LCX = 270, RCX = 1330;    // 左右眼角

      /* ---------------- 眼底氛围 ---------------- */
      var world = H.make('g', {}, g);
      var deepGrad = H.grad(defs, [
        [0, '#01060e'], [0.4, '#041a28'], [0.72, '#063a52'], [1, '#02080f']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + deepGrad + ')' }, world);
      // 深海里的大光晕（眼睛自身的氛围）
      var eyeHalo = H.make('circle', {
        cx: EX, cy: EY, r: 470,
        fill: 'url(#' + A.rad(defs, pal.accent, [[0, 0.3], [0.45, 0.1], [1, 0]]) + ')'
      }, world);
      var eyeHalo2 = H.make('circle', {
        cx: EX, cy: EY, r: 300,
        fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.26], [0.5, 0.08], [1, 0]]) + ')'
      }, world);

      // 远景散景 + 光尘
      var bokeh = A.bokeh(world, defs, {
        count: 10, seed: 13, x: [60, 1540], y: [80, 700], r: [30, 96],
        colors: [pal.accent, C.violet, pal.accent2], opacity: 0.16, blur: 24
      });
      var dust = A.dust(world, {
        count: 40, seed: 47, x: [40, 1560], y: [120, 860], r: [0.9, 2.6],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.6
      });

      /* ---------------- 眼形（上下眼睑） ---------------- */
      // 上眼睑：三次贝塞尔；下眼睑对称
      var P0 = [LCX, EY], P1 = [430, 188], P2 = [1170, 188], P3 = [RCX, EY];
      var Q1 = [1170, 610], Q2 = [430, 610];
      function bez(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return [
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        ];
      }
      function bezD(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return [
          3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
          3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
        ];
      }
      var eyeD = 'M' + LCX + ' ' + EY +
        ' C' + P1[0] + ' ' + P1[1] + ' ' + P2[0] + ' ' + P2[1] + ' ' + P3[0] + ' ' + P3[1] +
        ' C' + Q1[0] + ' ' + Q1[1] + ' ' + Q2[0] + ' ' + Q2[1] + ' ' + P0[0] + ' ' + P0[1] + ' Z';

      // 裁剪：眼形
      var eyeClipId = H.uid('s04eye');
      var eyeClip = H.make('clipPath', { id: eyeClipId }, defs);
      H.make('path', { d: eyeD }, eyeClip);

      var eyeG = H.make('g', { 'clip-path': 'url(#' + eyeClipId + ')' }, world);

      // 眼白（玻璃质感）
      var scleraGrad = H.radial(defs, [
        [0, '#cdf6ff', 0.30], [0.45, '#5aa8c8', 0.16], [0.8, '#0a3448', 0.5], [1, '#02141f', 0.85]
      ], { cx: 0.42, cy: 0.4, r: 0.72 });
      H.make('path', { d: eyeD, fill: 'url(#' + scleraGrad + ')' }, eyeG);
      // 血丝（很淡的细弧）
      var veinRand = H.rng(26);
      for (var v = 0; v < 7; v++) {
        var vx = 420 + veinRand() * 760;
        var vy = EY - 90 + veinRand() * 150;
        H.make('path', {
          d: 'M' + vx.toFixed(0) + ' ' + vy.toFixed(0) +
            ' q' + (18 + veinRand() * 30).toFixed(0) + ' ' + (veinRand() * 16 - 8).toFixed(0) +
            ' ' + (34 + veinRand() * 40).toFixed(0) + ' ' + (veinRand() * 20 - 10).toFixed(0),
          fill: 'none', stroke: '#7fd8f0', 'stroke-width': 0.8, opacity: 0.07 + veinRand() * 0.06
        }, eyeG);
      }

      /* ---------------- 虹膜：里面是一整片海 ---------------- */
      var irisClipId = H.uid('s04iris');
      var irisClip = H.make('clipPath', { id: irisClipId }, defs);
      H.make('circle', { cx: EX, cy: EY, r: IR }, irisClip);
      var irisG = H.make('g', { 'clip-path': 'url(#' + irisClipId + ')' }, eyeG);
      // 虹膜底：上半夜空 / 下半海
      var irisSky = H.grad(defs, [
        [0, '#020a1e'], [0.42, '#062338'], [0.52, '#0a4a62'], [1, '#03141f']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('circle', { cx: EX, cy: EY, r: IR, fill: 'url(#' + irisSky + ')' }, irisG);
      // 瞳仁里的星空
      var starRand = H.rng(919);
      var irisStars = [];
      for (var s = 0; s < 26; s++) {
        var ang = starRand() * Math.PI * 2;
        var rad = Math.sqrt(starRand()) * (IR - 12);
        var sx = EX + Math.cos(ang) * rad;
        var sy = EY + Math.sin(ang) * rad * 0.92;
        if (sy > EY - 2) continue;
        irisStars.push(H.make('circle', {
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: (0.6 + starRand() * 1.5).toFixed(2),
          fill: s % 5 === 0 ? pal.accent2 : '#ffffff',
          opacity: (0.25 + starRand() * 0.6).toFixed(2)
        }, irisG));
      }
      // 海面（下半）
      var seaGrad = H.grad(defs, [
        [0, '#0a4a62'], [0.18, '#0b6b86'], [0.5, '#0a8fa8'], [1, '#02141f']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', {
        x: EX - IR, y: EY, width: IR * 2, height: IR, fill: 'url(#' + seaGrad + ')'
      }, irisG);
      // 月亮 + 倒影光柱
      var moon = H.make('circle', {
        cx: 744, cy: 320, r: 17,
        fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 1], [0.5, 0.85], [1, 0]]) + ')'
      }, irisG);
      var moonHalo = H.make('circle', {
        cx: 744, cy: 320, r: 62, fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.32], [0.5, 0.1], [1, 0]]) + ')'
      }, irisG);
      var reflGrad = H.grad(defs, [
        [0, '#ffffff', 0.5], [0.5, pal.accent2, 0.22], [1, pal.accent2, 0]
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      var moonRefl = H.make('rect', {
        x: 702, y: EY, width: 84, height: 116, fill: 'url(#' + reflGrad + ')'
      }, irisG);
      // 海平线上的水平光带
      var bandGrad = H.grad(defs, [
        [0, pal.accent2, 0], [0.25, '#ffffff', 0.95], [0.5, pal.accent2, 0.85], [0.75, '#ffffff', 0.9], [1, pal.accent2, 0]
      ], { x1: 0, y1: 0, x2: 1, y2: 0 });
      var horizBand = H.make('rect', {
        x: EX - IR, y: EY - 5, width: IR * 2, height: 10, fill: 'url(#' + bandGrad + ')'
      }, irisG);
      var horizGlow = H.make('ellipse', {
        cx: EX, cy: EY, rx: IR * 1.15, ry: 26,
        fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.5], [0.4, 0.16], [1, 0]]) + ')'
      }, irisG);
      // 海浪线（横向滚动）
      var waveG = H.make('g', {}, irisG);
      var waves = [];
      var waveRand = H.rng(33);
      for (var wv = 0; wv < 6; wv++) {
        var wy = EY + 18 + wv * 22;
        var amp = 3 + waveRand() * 4;
        var d = 'M' + (EX - IR - 40) + ' ' + wy;
        for (var seg = 0; seg < 9; seg++) {
          var wx0 = EX - IR - 40 + seg * 44;
          d += ' Q' + (wx0 + 11) + ' ' + (wy + (seg % 2 ? -amp : amp)) +
            ' ' + (wx0 + 22) + ' ' + wy +
            ' Q' + (wx0 + 33) + ' ' + (wy + (seg % 2 ? amp : -amp)) +
            ' ' + (wx0 + 44) + ' ' + wy;
        }
        waves.push(H.make('path', {
          d: d, fill: 'none', stroke: wv % 2 ? pal.accent2 : '#bff6ff',
          'stroke-width': 1.1, opacity: (0.18 + waveRand() * 0.24).toFixed(2)
        }, waveG));
      }
      // 海面上碎光
      var glints = [];
      var glRand = H.rng(66);
      for (var gl = 0; gl < 14; gl++) {
        glints.push(H.make('rect', {
          x: (EX - 130 + glRand() * 260).toFixed(1), y: (EY + 6 + glRand() * 150).toFixed(1),
          width: (3 + glRand() * 10).toFixed(1), height: 1.2,
          fill: '#ffffff', opacity: 0.25
        }, irisG));
      }
      // 虹膜内缘的暗影（让海有“泡在眼睛里”的纵深）
      var irisInner = H.make('circle', {
        cx: EX, cy: EY, r: IR, fill: 'url(#' + H.radial(defs, [
          [0, '#000000', 0], [0.56, '#000000', 0], [0.86, '#000a12', 0.42], [1, '#000a12', 0.75]
        ], { cx: 0.5, cy: 0.5, r: 0.5 }) + ')'
      }, irisG);
      // 虹膜边缘：青 + 紫的彩色光晕
      var irisRim = H.make('circle', {
        cx: EX, cy: EY, r: IR - 1, fill: 'none', stroke: pal.accent,
        'stroke-width': 4.5, opacity: 0.55
      }, eyeG);
      var irisRim2 = H.make('circle', {
        cx: EX, cy: EY, r: IR - 9, fill: 'none', stroke: C.violet,
        'stroke-width': 2.2, opacity: 0.4
      }, eyeG);
      var irisRim3 = H.make('circle', {
        cx: EX, cy: EY, r: IR - 15, fill: 'none', stroke: pal.accent2,
        'stroke-width': 1, opacity: 0.35,
        'stroke-dasharray': '3 7'
      }, eyeG);

      /* ---------------- 上眼睑高光 + 睫毛 ---------------- */
      var lidShine = H.make('path', {
        d: 'M' + LCX + ' ' + EY + ' C' + P1[0] + ' ' + P1[1] + ' ' + P2[0] + ' ' + P2[1] + ' ' + P3[0] + ' ' + P3[1],
        fill: 'none', stroke: '#eaffff', 'stroke-width': 2.2, opacity: 0.55
      }, world);
      var crease = H.make('path', {
        d: 'M330 356 C470 158 1130 158 1270 356',
        fill: 'none', stroke: pal.accent2, 'stroke-width': 1.2, opacity: 0.25
      }, world);
      // 上睫毛（细长霓虹弧线，沿眼睑法线向外）
      var lashes = [];
      for (var l = 0; l < 16; l++) {
        var lt = 0.07 + l * 0.057;
        var lp = bez(P0, P1, P2, P3, lt);
        var ld = bezD(P0, P1, P2, P3, lt);
        var ll = Math.sqrt(ld[0] * ld[0] + ld[1] * ld[1]) || 1;
        var nx = -ld[1] / ll, ny = ld[0] / ll;   // 法线
        if (ny > 0) { nx = -nx; ny = -ny; }      // 朝上
        var len = 30 + Math.sin(lt * Math.PI) * 26 + (l % 3) * 5;
        var tipX = lp[0] + nx * len + (l % 2 ? 5 : -5);
        var tipY = lp[1] + ny * len;
        lashes.push(H.make('path', {
          d: 'M' + lp[0].toFixed(1) + ' ' + lp[1].toFixed(1) + ' Q' +
            (lp[0] + nx * len * 0.5 + (l % 2 ? 6 : -6)).toFixed(1) + ' ' +
            (lp[1] + ny * len * 0.55).toFixed(1) + ' ' + tipX.toFixed(1) + ' ' + tipY.toFixed(1),
          fill: 'none', stroke: pal.accent2, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.6
        }, world));
      }
      // 下睫毛（短、朝下）
      for (var l2 = 0; l2 < 7; l2++) {
        var lt2 = 0.16 + l2 * 0.11;
        var lp2 = bez(P3, Q1, Q2, P0, lt2);
        var ld2 = bezD(P3, Q1, Q2, P0, lt2);
        var ll2 = Math.sqrt(ld2[0] * ld2[0] + ld2[1] * ld2[1]) || 1;
        var nx2 = -ld2[1] / ll2, ny2 = ld2[0] / ll2;
        if (ny2 < 0) { nx2 = -nx2; ny2 = -ny2; }
        var len2 = 14 + Math.sin(lt2 * Math.PI) * 12;
        lashes.push(H.make('path', {
          d: 'M' + lp2[0].toFixed(1) + ' ' + lp2[1].toFixed(1) + ' L' +
            (lp2[0] + nx2 * len2).toFixed(1) + ' ' + (lp2[1] + ny2 * len2).toFixed(1),
          fill: 'none', stroke: pal.accent, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.4
        }, world));
      }

      /* ---------------- 泪光：从眼角滑落，落到底部化成涟漪 ---------------- */
      var tearG = H.make('g', {}, world);
      var tearHalo = H.make('circle', {
        cx: 0, cy: 0, r: 15, fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 0.95], [0.35, 0.4], [1, 0]]) + ')', opacity: 0
      }, tearG);
      var tear = H.make('circle', {
        cx: 0, cy: 0, r: 4.6, fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 1], [0.5, 0.75], [1, 0]]) + ')', opacity: 0
      }, tearG);
      var tearTrail = H.make('path', {
        d: '', fill: 'none', stroke: pal.accent2, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0
      }, tearG);
      // 底部涟漪
      var rippleG = H.make('g', {}, world);
      var ripples = [];
      for (var rp = 0; rp < 3; rp++) {
        ripples.push(H.make('ellipse', {
          cx: 1210, cy: 792, rx: 20, ry: 6, fill: 'none', stroke: pal.accent2,
          'stroke-width': 1.6 - rp * 0.4, opacity: 0
        }, rippleG));
      }

      // 眼睛边缘的一圈微弱光晕（让眼睛浮起来）
      var eyeRimGlow = H.make('path', {
        d: eyeD, fill: 'none', stroke: pal.accent2, 'stroke-width': 4, opacity: 0.16,
        filter: 'url(#' + A.glowF(defs, 10) + ')'
      }, world);
      // 眼形清晰描边
      var eyeEdge = H.make('path', {
        d: eyeD, fill: 'none', stroke: '#dffbff', 'stroke-width': 1.8, opacity: 0.5
      }, world);

      // HUD
      var tag = A.tag(H.make('g', {}, g), ((scene && scene.tag) || '04 — OPEN SEA'), 64, 196, pal.accent2, {
        size: 11, spacing: 7, opacity: 0.45
      });
      A.num(H.make('g', {}, g), 4, 64, 226, pal.accent2, { size: 11, anchor: 'start', opacity: 0.3 });

      return {
        update: function (t, info) {
          var enter = A.enter(t, dur, 0.3, 0.22);
          var pulse = info.pulse || 0;
          var p = H.clamp(t / dur, 0, 1);

          // push-in：整体 1 → 1.06
          var cam = 1 + 0.06 * H.E.inOutSine(p);
          world.setAttribute('transform',
            'translate(' + EX + ' ' + EY + ') scale(' + cam.toFixed(4) + ') translate(' + (-EX) + ' ' + (-EY) + ')');
          world.setAttribute('opacity', (0.3 + 0.7 * enter).toFixed(3));

          // 眼睛氛围光随鼓点
          eyeHalo.setAttribute('opacity', (0.55 + 0.35 * pulse).toFixed(3));
          eyeHalo2.setAttribute('opacity', (0.4 + 0.3 * pulse).toFixed(3));
          eyeRimGlow.setAttribute('opacity', (0.1 + 0.1 * pulse).toFixed(3));

          // 虹膜边缘 / 水平光带
          irisRim.setAttribute('opacity', (0.4 + 0.35 * pulse).toFixed(3));
          irisRim2.setAttribute('opacity', (0.28 + 0.3 * pulse).toFixed(3));
          irisRim3.setAttribute('transform', 'rotate(' + (t * 8).toFixed(1) + ' ' + EX + ' ' + EY + ')');
          horizGlow.setAttribute('opacity', (0.5 + 0.35 * pulse).toFixed(3));
          horizBand.setAttribute('height', (8 + 5 * pulse).toFixed(1));
          horizBand.setAttribute('y', (EY - (8 + 5 * pulse) / 2).toFixed(1));
          moonHalo.setAttribute('r', (56 + 8 * pulse).toFixed(1));
          moonRefl.setAttribute('opacity', (0.5 + 0.35 * pulse).toFixed(3));

          // 星星闪烁
          for (var i = 0; i < irisStars.length; i++) {
            irisStars[i].setAttribute('opacity', (0.2 + 0.55 * Math.abs(Math.sin(t * 1.5 + i * 1.3))).toFixed(2));
          }
          // 海浪横向滚动
          for (var w = 0; w < waves.length; w++) {
            var dir = w % 2 ? -1 : 1;
            var sp = 14 + w * 5;
            waves[w].setAttribute('transform', 'translate(' + (H.mod(t * sp * dir, 88) - 44).toFixed(1) + ' 0)');
            waves[w].setAttribute('opacity', (0.12 + 0.18 * Math.abs(Math.sin(t * 0.8 + w)) + 0.1 * pulse).toFixed(3));
          }
          // 海面碎光
          for (var gl2 = 0; gl2 < glints.length; gl2++) {
            glints[gl2].setAttribute('opacity', (0.12 + 0.4 * Math.abs(Math.sin(t * 2.2 + gl2 * 1.7)) * (0.5 + 0.5 * pulse)).toFixed(2));
          }
          // 虹膜内缘暗影 / 边缘光
          irisInner.setAttribute('opacity', (0.7 + 0.2 * pulse).toFixed(3));

          // 泪：0.5s 出现在眼角 → 1.15s 沿下眼睑滑到外侧 → 1.9s 离开眼睛下落 → 2.7s 落到底部
          var tearIn = H.clamp((t - 0.5) / 0.35, 0, 1);
          var slideP = H.E.inOutCubic(H.clamp((t - 0.95) / 0.95, 0, 1));
          var sx = lerp(1274, 1188, slideP);
          var sy = lerp(EY - 10, 520, slideP);
          var fallP = H.E.inQuad(H.clamp((t - 1.9) / 0.8, 0, 1));
          var dx = sx + fallP * 24;
          var dy = sy + fallP * 272;
          var tearOp = tearIn * (1 - H.clamp((t - 2.6) / 0.5, 0, 1));
          tearHalo.setAttribute('cx', dx.toFixed(1));
          tearHalo.setAttribute('cy', dy.toFixed(1));
          tearHalo.setAttribute('r', (11 + 9 * slideP * (1 - fallP * 0.5)).toFixed(1));
          tearHalo.setAttribute('opacity', (tearOp * 0.55).toFixed(3));
          tear.setAttribute('cx', dx.toFixed(1));
          tear.setAttribute('cy', dy.toFixed(1));
          tear.setAttribute('r', (3.6 + 2.4 * (1 - fallP)).toFixed(2));
          tear.setAttribute('opacity', tearOp.toFixed(3));
          tearTrail.setAttribute('d', 'M' + dx.toFixed(1) + ' ' + (dy - 44 * (1 - fallP)).toFixed(1) +
            ' L' + dx.toFixed(1) + ' ' + dy.toFixed(1));
          tearTrail.setAttribute('opacity', (tearOp * (0.16 + 0.3 * (1 - fallP))).toFixed(3));

          // 底部涟漪：2.7s 起
          for (var rp2 = 0; rp2 < ripples.length; rp2++) {
            var rk = H.clamp((t - 2.7 - rp2 * 0.16) / 1.05, 0, 1);
            if (rk > 0 && rk < 1) {
              ripples[rp2].setAttribute('rx', (14 + 150 * H.E.outCubic(rk)).toFixed(1));
              ripples[rp2].setAttribute('ry', (4 + 26 * H.E.outCubic(rk)).toFixed(1));
              ripples[rp2].setAttribute('opacity', ((1 - rk) * 0.34).toFixed(3));
            } else {
              ripples[rp2].setAttribute('opacity', '0');
            }
          }

          // 睫毛随光呼吸
          for (var ls = 0; ls < lashes.length; ls++) {
            var base = ls < 16 ? 0.42 : 0.28;
            lashes[ls].setAttribute('opacity', (base + 0.3 * pulse).toFixed(3));
          }
          lidShine.setAttribute('opacity', (0.4 + 0.3 * pulse).toFixed(3));
          eyeEdge.setAttribute('opacity', (0.35 + 0.3 * pulse).toFixed(3));
          crease.setAttribute('opacity', (0.18 + 0.12 * pulse).toFixed(3));

          bokeh.update(t, pulse * 0.6);
          dust.update(t, info.energy);
          tag.setAttribute('opacity', (0.3 + 0.15 * Math.sin(t * 1.5)).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
