/* =========================================================================
 * MOTIF m12 — 漩涡下坠
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：漩涡/沉沦/无法自拔/下坠/吸进去
 * ========================================================================= */
/* =========================================================================
 * s12 — 我却已无法自拔  (37.00 – 40.00s / 3.0s)
 * 情绪：失重、下沉。紫粉色漩涡把一切往里吸，人也越缩越小。
 * 画面：多层同心椭环 + 旋转螺旋臂 + 被吸进去的两个剪影 + 螺旋粒子 + 光片。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A, TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[11].palette;
      var dur = (scene && scene.dur) || TL.scenes[11].dur;
      var C = A.C;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);
      var cx = 800, cy = 396;

      /* ---------------- 漩涡底色 ---------------- */
      var deepGlow = A.rad(defs, C.violet, [[0, 0.46], [0.45, 0.16], [1, 0]]);
      H.make('circle', { cx: cx, cy: cy, r: 640, fill: 'url(#' + deepGlow + ')' }, world);
      var pinkDeep = A.rad(defs, pal.accent2, [[0, 0.26], [0.55, 0.08], [1, 0]]);
      H.make('ellipse', { cx: cx + 120, cy: cy + 90, rx: 520, ry: 340, fill: 'url(#' + pinkDeep + ')' }, world);

      // 外围的暗环（把视线聚到中心）
      var darkRing = A.rad(defs, '#05030b', [[0, 0], [0.55, 0.2], [0.82, 0.62], [1, 0.9]]);
      H.make('circle', { cx: cx, cy: cy, r: 780, fill: 'url(#' + darkRing + ')' }, world);

      /* ---------------- 同心椭环（隧道） ---------------- */
      var ringG = H.make('g', {}, world);
      var rings = [];
      var rrand = H.rng(7701);
      for (var r = 0; r < 13; r++) {
        var u = r / 12;
        var col = r % 3 === 0 ? pal.accent2 : (r % 3 === 1 ? pal.accent : C.violet);
        var wrap = H.make('g', {}, ringG);
        var el = H.make('ellipse', {
          cx: cx, cy: cy, rx: 56 + u * u * 520, ry: (56 + u * u * 520) * 0.62,
          fill: 'none', stroke: col,
          'stroke-width': 2.4 - u * 1.7,
          'stroke-dasharray': (r % 2 ? '3 14' : 'none'),
          opacity: 0.5 - u * 0.4
        }, wrap);
        rings.push({
          wrap: wrap, el: el, brx: 56 + u * u * 520, u: u,
          rot: (rrand() - 0.5) * 30, spin: (r % 2 ? 1 : -1) * (6 + rrand() * 14)
        });
      }
      // 隧道深处的亮环
      var hotRings = [];
      for (var hr = 0; hr < 3; hr++) {
        hotRings.push(H.make('ellipse', {
          cx: cx, cy: cy, rx: 46 + hr * 26, ry: (46 + hr * 26) * 0.62,
          fill: 'none', stroke: hr === 1 ? C.white : pal.accent2,
          'stroke-width': 2.2 - hr * 0.5, opacity: 0.5 - hr * 0.12
        }, world));
      }
      // 品红色的反向弧，给紫色漩涡一点对比
      var pinkArcA = H.make('ellipse', {
        cx: cx, cy: cy, rx: 330, ry: 205, fill: 'none', stroke: pal.accent2,
        'stroke-width': 4, 'stroke-dasharray': '150 300', 'stroke-linecap': 'round',
        opacity: 0.5, filter: 'url(#' + A.glowF(defs, 9) + ')'
      }, world);
      var pinkArcB = H.make('ellipse', {
        cx: cx, cy: cy, rx: 470, ry: 292, fill: 'none', stroke: pal.accent2,
        'stroke-width': 2.4, 'stroke-dasharray': '70 260', 'stroke-linecap': 'round', opacity: 0.3
      }, world);

      /* ---------------- 螺旋臂 ---------------- */
      var spiralG = H.make('g', {}, world);
      function spiralD(dir, turns, rMax, phase) {
        var pts = [];
        var steps = 46;
        for (var i = 0; i <= steps; i++) {
          var u = i / steps;
          var ang = phase + dir * u * Math.PI * 2 * turns;
          var rad = 40 + u * rMax;
          pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.62]);
        }
        return H.smoothPath(pts, 0.5);
      }
      var spirals = [];
      for (var sp = 0; sp < 3; sp++) {
        var sWrap = H.make('g', {}, spiralG);
        H.make('path', {
          d: spiralD(1, 1.7, 520, sp * 2.09), fill: 'none',
          stroke: sp === 1 ? pal.accent2 : pal.accent,
          'stroke-width': 1.6, opacity: 0.34 - sp * 0.06,
          'stroke-linecap': 'round'
        }, sWrap);
        var sWrap2 = H.make('g', {}, spiralG);
        H.make('path', {
          d: spiralD(-1, 1.35, 470, sp * 2.09 + 1.2), fill: 'none',
          stroke: C.violet, 'stroke-width': 1.1, opacity: 0.22, 'stroke-linecap': 'round'
        }, sWrap2);
        spirals.push({ a: sWrap, b: sWrap2, ph: sp });
      }

      /* ---------------- 中心光核 ---------------- */
      var coreG = H.make('g', {}, world);
      A.orb(coreG, defs, cx, cy, 120, pal.accent, { opacity: 0.5 });
      A.orb(coreG, defs, cx, cy, 58, C.white, { opacity: 0.9 });
      A.flare(coreG, defs, cx, cy, 16, C.white, { opacity: 0.7 });

      /* ---------------- 被吸入的粒子 ---------------- */
      var prand = H.rng(4309);
      var particles = [];
      for (var p = 0; p < 36; p++) {
        var el = H.make('circle', {
          cx: cx, cy: cy, r: 1, fill: p % 4 === 0 ? C.white : (p % 3 === 0 ? pal.accent2 : pal.accent),
          opacity: 0
        }, world);
        particles.push({
          el: el, a0: prand() * 6.283, sp: 0.09 + prand() * 0.16,
          r0: 300 + prand() * 380, ph: prand(), size: 1 + prand() * 2.4,
          stretch: 2 + prand() * 7
        });
      }
      // 少量被拉成弧线的光条
      var streakG = H.make('g', {}, world);
      var streaks = [];
      for (var s = 0; s < 12; s++) {
        var line = H.make('path', {
          d: 'M0 0 Q0 0 0 0', fill: 'none',
          stroke: s % 3 === 0 ? C.white : (s % 3 === 1 ? pal.accent2 : pal.accent),
          'stroke-width': 1.2 + (s % 3) * 0.5, 'stroke-linecap': 'round', opacity: 0
        }, streakG);
        streaks.push({ el: line, a0: prand() * 6.283, sp: 0.11 + prand() * 0.12, r0: 320 + prand() * 320, ph: prand() });
      }

      /* ---------------- 两个被吸走的人 ---------------- */
      var p1Wrap = H.make('g', {}, world);
      var p2Wrap = H.make('g', {}, world);
      A.person(p1Wrap, { x: 0, y: 0, s: 1, pose: 'reach', flip: false, rim: pal.accent2, color: '#05030b', rimOpacity: 0.9 });
      A.person(p2Wrap, { x: 0, y: 0, s: 1, pose: 'reach', flip: true, rim: pal.accent, color: '#05030b', rimOpacity: 0.85 });

      /* ---------------- 前景破碎光片 ---------------- */
      var shardG = H.make('g', {}, world);
      var shards = [];
      var shardRnd = H.rng(2207);
      for (var sh = 0; sh < 5; sh++) {
        var shWrap = H.make('g', {}, shardG);
        var sx = 300 + shardRnd() * 1000;
        var sy = 260 + shardRnd() * 380;
        H.make('polygon', {
          points: '0,0 ' + (40 + shardRnd() * 70) + ',' + (8 + shardRnd() * 26) + ' ' +
            (16 + shardRnd() * 40) + ',' + (44 + shardRnd() * 50),
          fill: H.rgba(sh % 2 ? pal.accent2 : pal.accent, 0.14),
          stroke: H.rgba(sh % 2 ? pal.accent2 : C.white, 0.35), 'stroke-width': 1
        }, shWrap);
        shards.push({ g: shWrap, x: sx, y: sy, rot: shardRnd() * 360, spin: (shardRnd() - 0.5) * 26 });
      }

      /* ---------------- 氛围 ---------------- */
      A.bokeh(world, defs, {
        count: 8, seed: 31, x: [120, 1480], y: [80, 520], r: [50, 130],
        colors: [pal.accent, pal.accent2, C.violet], opacity: 0.20, blur: 22
      });
      var dust = A.dust(world, {
        count: 30, seed: 63, x: [-40, 1640], y: [80, 720], r: [1, 2.6],
        colors: [C.white, pal.accent2, pal.accent], opacity: 0.55
      });
      var ripple = A.ripple(world, defs, cx, cy, pal.accent2, {
        count: 3, r0: 80, r1: 420, width: 1.4, alpha: 0.6, period: 0.9
      });

      /* ---------------- HUD ---------------- */
      var hud = H.make('g', {}, root);
      var tag = A.tag(hud, ((scene && scene.tag) || '12 — SINKING'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.45 });
      var tagR = A.tag(hud, 'NO WAY OUT', 1536, 196, pal.accent, { size: 10, spacing: 6, opacity: 0.32, anchor: 'end' });
      var depth = A.tag(hud, 'DEPTH  0', 64, 214, pal.accent, { size: 9, spacing: 4, opacity: 0.3 });

      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var energy = info.energy != null ? info.energy : 0.5;
          var enter = A.enter(t, dur, 0.3, 0.32);
          var e = H.clamp(t / dur, 0, 1);
          // 镜头压向中心，越到后面越近
          var cam = 1 + 0.085 * H.E.inOutCubic(e) + 0.005 * pulse;
          world.setAttribute('transform',
            'translate(' + cx + ' ' + cy + ') scale(' + cam.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
          root.setAttribute('opacity', (0.35 + 0.65 * enter).toFixed(3));

          // 同心环：鼓点向外扩，整体旋转
          for (var r = 0; r < rings.length; r++) {
            var rg = rings[r];
            var sc = 1 + pulse * 0.035 * (0.4 + rg.u) + Math.sin(t * 0.9 + r) * 0.006;
            rg.el.setAttribute('rx', (rg.brx * sc).toFixed(1));
            rg.el.setAttribute('ry', (rg.brx * sc * 0.62).toFixed(1));
            rg.el.setAttribute('opacity', (0.46 - rg.u * 0.38 + pulse * 0.1).toFixed(3));
            rg.wrap.setAttribute('transform',
              'rotate(' + (rg.rot + t * rg.spin).toFixed(2) + ' ' + cx + ' ' + cy + ')');
          }
          for (var h = 0; h < hotRings.length; h++) {
            hotRings[h].setAttribute('opacity', (0.4 - h * 0.1 + pulse * 0.25).toFixed(3));
          }
          pinkArcA.setAttribute('transform', 'rotate(' + (-t * 34).toFixed(2) + ' ' + cx + ' ' + cy + ')');
          pinkArcA.setAttribute('opacity', (0.32 + pulse * 0.3).toFixed(3));
          pinkArcB.setAttribute('transform', 'rotate(' + (t * 18 + 60).toFixed(2) + ' ' + cx + ' ' + cy + ')');

          // 螺旋臂反向旋转
          for (var s = 0; s < spirals.length; s++) {
            var sp = spirals[s];
            sp.a.setAttribute('transform', 'rotate(' + (t * 30 + s * 40).toFixed(2) + ' ' + cx + ' ' + cy + ')');
            sp.b.setAttribute('transform', 'rotate(' + (-t * 21 - s * 34).toFixed(2) + ' ' + cx + ' ' + cy + ')');
          }

          // 中心光核
          var coreS = 1 + pulse * 0.08;
          coreG.setAttribute('transform',
            'translate(' + cx + ' ' + cy + ') scale(' + coreS.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
          coreG.setAttribute('opacity', (0.75 + 0.25 * pulse).toFixed(3));

          // 吸入的粒子：半径不断缩小、角度加速
          for (var p = 0; p < particles.length; p++) {
            var pt = particles[p];
            var u = H.fract(pt.ph + t * pt.sp);
            var rad = pt.r0 * Math.pow(1 - u, 1.7);
            var ang = pt.a0 + u * 4.2 + t * 0.25;
            var px = cx + Math.cos(ang) * rad;
            var py = cy + Math.sin(ang) * rad * 0.62;
            pt.el.setAttribute('cx', px.toFixed(1));
            pt.el.setAttribute('cy', py.toFixed(1));
            pt.el.setAttribute('r', (pt.size * (0.6 + u * 0.9)).toFixed(2));
            pt.el.setAttribute('opacity', (Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.85).toFixed(3));
          }
          // 弧形光条
          for (var s2 = 0; s2 < streaks.length; s2++) {
            var st = streaks[s2];
            var u2 = H.fract(st.ph + t * st.sp);
            var rad2 = st.r0 * Math.pow(1 - u2, 1.5);
            var ang2 = st.a0 + u2 * 3.6 + t * 0.25;
            var x2 = cx + Math.cos(ang2) * rad2;
            var y2 = cy + Math.sin(ang2) * rad2 * 0.62;
            var tang = ang2 + Math.PI / 2;
            var len2 = 26 + 40 * (1 - u2);
            st.el.setAttribute('d',
              'M' + (x2 - Math.cos(tang) * len2).toFixed(1) + ' ' + (y2 - Math.sin(tang) * len2 * 0.62).toFixed(1) +
              ' Q' + (x2 + Math.cos(tang) * 12).toFixed(1) + ' ' + (y2 + Math.sin(tang) * 6).toFixed(1) +
              ' ' + (x2 + Math.cos(tang) * len2).toFixed(1) + ' ' + (y2 + Math.sin(tang) * len2 * 0.62).toFixed(1));
            st.el.setAttribute('opacity', (Math.sin(Math.PI * Math.min(1, u2 * 1.2)) * 0.55).toFixed(3));
          }

          // 两个人被慢慢吸向中心、缩小、旋转
          var pull = H.E.inOutCubic(H.clamp(t / (dur * 0.92), 0, 1));
          var p1x = H.lerp(548, 766, pull);
          var p1y = H.lerp(650, 436, pull);
          var p1s = 0.74 - 0.5 * pull;
          p1Wrap.setAttribute('transform',
            'translate(' + p1x.toFixed(1) + ' ' + p1y.toFixed(1) + ') rotate(' + (pull * -26).toFixed(1) +
            ') scale(' + p1s.toFixed(3) + ' ' + (p1s * 0.92).toFixed(3) + ')');
          var p2x = H.lerp(1052, 838, pull);
          var p2y = H.lerp(650, 456, pull);
          var p2s = 0.66 - 0.44 * pull;
          p2Wrap.setAttribute('transform',
            'translate(' + p2x.toFixed(1) + ' ' + p2y.toFixed(1) + ') rotate(' + (pull * 22).toFixed(1) +
            ') scale(' + p2s.toFixed(3) + ' ' + (p2s * 0.92).toFixed(3) + ')');

          // 前景光片
          for (var sh = 0; sh < shards.length; sh++) {
            var sd = shards[sh];
            sd.g.setAttribute('transform',
              'translate(' + sd.x.toFixed(1) + ' ' + sd.y.toFixed(1) + ') rotate(' +
              (sd.rot + t * sd.spin).toFixed(1) + ') translate(' + (Math.sin(t * 1.2 + sh) * 18).toFixed(1) + ' 0)');
            sd.g.setAttribute('opacity', (0.32 + 0.14 * Math.sin(t * 1.6 + sh * 2)).toFixed(3));
          }

          ripple.update(t, pulse);
          dust.update(t, energy);
          tag.setAttribute('opacity', (0.32 + pulse * 0.12).toFixed(3));
          depth.textContent = 'DEPTH  ' + Math.round(40 + pull * 560);
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
