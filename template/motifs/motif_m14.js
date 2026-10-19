/* =========================================================================
 * MOTIF m14 — 松手让光球升起
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：放下/松手/升空/释然/放手
 * ========================================================================= */
/* =========================================================================
 * s14 — 也为你骗自己放下  (43.00 – 47.00s / 4.0s)
 * 情绪：安静的释然。夜空中一只手松开细线，光球慢慢升走；
 *      眼前那几层“自欺”的玻璃板一片片碎掉。
 * 画面：深蓝夜空 + 稀疏星 + 远城微光 + 玻璃滤镜碎片 + 松手 + 上升光球。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A, TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[13].palette;
      var dur = (scene && scene.dur) || TL.scenes[13].dur;
      var C = A.C;
      var cool = pal.accent, pale = pal.accent2;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);

      /* ---------------- 夜空 ---------------- */
      var deep = A.vgrad(defs, [
        [0, '#04070f', 0], [0.5, '#050b18', 0.35], [1, '#0a1428', 0.6]
      ], 'letgo');
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + deep + ')' }, world);
      var moonGlow = A.rad(defs, cool, [[0, 0.16], [0.5, 0.05], [1, 0]]);
      H.make('circle', { cx: 1180, cy: 180, r: 520, fill: 'url(#' + moonGlow + ')' }, world);

      // 星星
      var srand = H.rng(8803);
      var stars = [];
      for (var i = 0; i < 78; i++) {
        var sx = srand() * W;
        var sy = 30 + srand() * 520;
        var sr = 0.5 + srand() * 1.7;
        var base = 0.12 + srand() * 0.62;
        var el = H.make('circle', {
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: sr.toFixed(2),
          fill: i % 6 === 0 ? pale : '#ffffff', opacity: base.toFixed(3)
        }, world);
        stars.push({ el: el, base: base, sp: 0.5 + srand() * 1.8, ph: srand() * 6.283 });
      }
      // 两三颗带光芒的亮星
      A.flare(world, defs, 320, 180, 6, pale, { opacity: 0.35 });
      A.flare(world, defs, 1440, 300, 5, pale, { opacity: 0.28 });
      A.flare(world, defs, 700, 96, 4, cool, { opacity: 0.24 });

      // 淡淡的几层夜雾
      var mist1 = A.rad(defs, cool, [[0, 0.12], [0.6, 0.04], [1, 0]]);
      H.make('ellipse', { cx: 460, cy: 330, rx: 520, ry: 90, fill: 'url(#' + mist1 + ')' }, world);
      var mist2 = A.rad(defs, pale, [[0, 0.08], [0.6, 0.03], [1, 0]]);
      H.make('ellipse', { cx: 1180, cy: 430, rx: 560, ry: 80, fill: 'url(#' + mist2 + ')' }, world);

      /* ---------------- 远处城市 + 地面 ---------------- */
      var cityG = H.make('g', {}, world);
      var crand = H.rng(5511);
      var baseY = 646;
      var bx = -20;
      while (bx < W + 30) {
        var bw = 34 + crand() * 86;
        var bh = 22 + crand() * 96;
        H.make('rect', {
          x: bx.toFixed(1), y: (baseY - bh).toFixed(1), width: bw.toFixed(1),
          height: (bh + 120).toFixed(1), fill: '#03060f', opacity: 0.9
        }, cityG);
        // 零星窗灯
        if (crand() > 0.45) {
          H.make('rect', {
            x: (bx + 4 + crand() * (bw - 10)).toFixed(1),
            y: (baseY - bh + 8 + crand() * 22).toFixed(1),
            width: 2, height: 3.4, fill: pale, opacity: 0.18 + crand() * 0.3
          }, cityG);
        }
        bx += bw + 5 + crand() * 18;
      }
      var cityGlow = A.rad(defs, cool, [[0, 0.22], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: 646, rx: 760, ry: 90, fill: 'url(#' + cityGlow + ')' }, cityG);
      // 地面暗带（让画面坐稳）
      H.make('rect', { x: 0, y: 646, width: W, height: 254, fill: '#020409', opacity: 0.88 }, world);
      var floorGlow = A.rad(defs, cool, [[0, 0.15], [0.5, 0.05], [1, 0]]);
      H.make('ellipse', { cx: 900, cy: 660, rx: 620, ry: 60, fill: 'url(#' + floorGlow + ')' }, world);

      /* ---------------- 自欺的玻璃板（滤镜） ---------------- */
      var paneDefs = [
        { x: 468, y: 330, w: 320, h: 210, rot: -11, t0: 0.95, ph: 0.0 },
        { x: 810, y: 286, w: 380, h: 240, rot: 7, t0: 1.65, ph: 1.7 },
        { x: 1116, y: 394, w: 300, h: 190, rot: -6, t0: 2.35, ph: 3.1 },
        { x: 640, y: 470, w: 340, h: 200, rot: -15, t0: 3.05, ph: 4.4 }
      ];
      var panes = [];
      for (var p = 0; p < paneDefs.length; p++) {
        var pd = paneDefs[p];
        var pg = H.make('g', { transform: 'translate(' + pd.x + ' ' + pd.y + ') rotate(' + pd.rot + ')' }, world);
        var hw = pd.w / 2, hh = pd.h / 2;
        var shade = H.grad(defs, [
          [0, pale, 0.10], [0.45, pale, 0.035], [1, cool, 0.02]
        ], { x1: 0, y1: 0, x2: 1, y2: 1 });
        var face = H.make('rect', {
          x: -hw, y: -hh, width: pd.w, height: pd.h, rx: 6,
          fill: 'url(#' + shade + ')', stroke: H.rgba(pale, 0.34), 'stroke-width': 1.1
        }, pg);
        // 高光边
        H.make('path', {
          d: 'M' + (-hw + 8) + ' ' + (-hh + 4) + ' L' + (hw - 8) + ' ' + (-hh + 4),
          stroke: '#ffffff', 'stroke-width': 1.4, opacity: 0.28, 'stroke-linecap': 'round', fill: 'none'
        }, pg);
        H.make('path', {
          d: 'M' + (-hw + 6) + ' ' + (hh - 4) + ' L' + (hw - 6) + ' ' + (hh - 4),
          stroke: pale, 'stroke-width': 0.9, opacity: 0.12, 'stroke-linecap': 'round', fill: 'none'
        }, pg);
        // 碎裂纹（碎裂时出现）
        var crack = H.make('path', {
          d: 'M0 0 L-46 -58 L-72 -34 M0 0 L54 -40 L84 -14 M0 0 L30 62 L64 44 M0 0 L-38 52',
          fill: 'none', stroke: '#ffffff', 'stroke-width': 1.1, opacity: 0,
          'stroke-linecap': 'round'
        }, pg);
        // 玻璃的内层反光（斜向光带 + 内框）
        H.make('polygon', {
          points: (-hw + 10) + ',' + (-hh + 10) + ' ' + (hw - 40) + ',' + (-hh + 10) + ' ' +
            (hw - 120) + ',' + (hh - 14) + ' ' + (-hw + 26) + ',' + (hh - 14),
          fill: H.rgba('#ffffff', 0.045)
        }, pg);
        H.make('rect', {
          x: -hw + 9, y: -hh + 9, width: pd.w - 18, height: pd.h - 18, rx: 3,
          fill: 'none', stroke: H.rgba(pale, 0.12), 'stroke-width': 0.8
        }, pg);
        panes.push({ g: pg, face: face, crack: crack, pd: pd, ph: pd.ph, baseY: pd.y });
      }

      /* ---------------- 松手的手（剪影） ---------------- */
      // 手腕在画面底边，手掌抬起，指尖朝上——为松开那根线
      var handWrap = H.make('g', { transform: 'translate(1088 900) scale(1.02)' }, world);
      var handInk = '#03040a', handRim = '#8fb6ff';
      // 手背后的天光，把剪影从黑地面上分离出来
      var handHalo = A.rad(defs, cool, [[0, 0.22], [0.5, 0.07], [1, 0]]);
      H.make('circle', { cx: 1088, cy: 720, r: 240, fill: 'url(#' + handHalo + ')' }, world);
      // 前臂 + 手腕
      H.make('path', {
        d: 'M-76 40 L-62 -52 C-58 -112 -30 -146 2 -146 C36 -146 62 -112 64 -52 ' +
           'L80 40 L60 260 L-56 260 Z',
        fill: handInk
      }, handWrap);
      // 四根手指（略微分叉、微屈）
      var fingerDefs = [
        [-48, -140, -74, -232, 30], [-16, -150, -24, -252, 31],
        [16, -150, 20, -258, 31], [46, -140, 62, -238, 29]
      ];
      for (var f = 0; f < fingerDefs.length; f++) {
        var fd = fingerDefs[f];
        H.make('path', {
          d: 'M' + fd[0] + ' ' + fd[1] + ' Q' + ((fd[0] + fd[2]) / 2 + 6) + ' ' + ((fd[1] + fd[3]) / 2) +
             ' ' + fd[2] + ' ' + fd[3],
          fill: 'none', stroke: handInk, 'stroke-width': fd[4], 'stroke-linecap': 'round'
        }, handWrap);
      }
      // 拇指
      H.make('path', {
        d: 'M-62 -70 C-96 -86 -116 -118 -110 -148', fill: 'none',
        stroke: handInk, 'stroke-width': 30, 'stroke-linecap': 'round'
      }, handWrap);
      // 轮廓光：指尖 / 手掌外侧 / 前臂外缘（月光从左上打来）
      H.make('path', {
        d: 'M-74 -232 Q-80 -196 -46 -160 M-24 -252 Q-30 -212 -14 -166 ' +
           'M20 -258 Q26 -214 18 -166 M62 -238 Q66 -200 48 -148 ' +
           'M-62 -52 C-58 -112 -30 -146 2 -146 M-76 40 L-62 -52 M64 -52 L80 40',
        fill: 'none', stroke: handRim, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.42
      }, handWrap);
      // 指尖上的一点微光（刚刚松开）
      H.make('circle', { cx: 16, cy: -262, r: 3, fill: pale, opacity: 0.5 }, handWrap);
      H.make('circle', { cx: 16, cy: -262, r: 10, fill: 'url(#' + A.rad(defs, pale, [[0, 0.5], [1, 0]]) + ')', opacity: 0.5 }, handWrap);

      /* ---------------- 上升的光球 + 细线 ---------------- */
      var orbG = H.make('g', {}, world);
      var haloId = A.rad(defs, pale, [[0, 0.5], [0.35, 0.18], [1, 0]]);
      var halo = H.make('circle', { cx: 0, cy: 0, r: 78, fill: 'url(#' + haloId + ')' }, orbG);
      A.orb(orbG, defs, 0, 0, 20, pale, { opacity: 0.95 });
      H.make('circle', { cx: 0, cy: 0, r: 6.5, fill: '#ffffff', opacity: 0.95 }, orbG);
      var orbRing = H.make('circle', { cx: 0, cy: 0, r: 30, fill: 'none', stroke: pale, 'stroke-width': 1, opacity: 0.35 }, orbG);

      // 细线（手 → 光球，松手后垂在光球下方）
      var lineG = H.make('g', {}, world);
      var stringLine = H.make('path', {
        d: 'M0 0 Q0 0 0 0', fill: 'none', stroke: pale,
        'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.8
      }, lineG);
      var stringGlow = H.make('path', {
        d: 'M0 0 Q0 0 0 0', fill: 'none', stroke: pale,
        'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.18
      }, lineG);

      // 光球身后的星屑尾迹
      var trail = [];
      var trand = H.rng(3307);
      for (var tr = 0; tr < 9; tr++) {
        trail.push(H.make('circle', {
          cx: 0, cy: 0, r: 1 + trand() * 1.8, fill: tr % 2 ? pale : '#ffffff', opacity: 0
        }, world));
      }

      /* ---------------- 氛围 ---------------- */
      A.bokeh(world, defs, {
        count: 6, seed: 61, x: [100, 1500], y: [120, 520], r: [30, 90],
        colors: [cool, pale], opacity: 0.14, blur: 18
      });
      var dust = A.dust(world, {
        count: 26, seed: 83, x: [-40, 1640], y: [80, 700], r: [0.8, 2.2],
        colors: ['#ffffff', pale, cool], opacity: 0.42
      });
      // 一颗远处的流星（2.7–3.3s）
      var meteor = H.make('g', { opacity: 0 }, world);
      var mGrad = H.grad(defs, [[0, '#ffffff', 0.9], [1, pale, 0]], { x1: 1, y1: 1, x2: 0, y2: 0 });
      H.make('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: 'url(#' + mGrad + ')', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, meteor);

      /* ---------------- HUD ---------------- */
      var hud = H.make('g', {}, root);
      var tag = A.tag(hud, ((scene && scene.tag) || '14 — LET GO'), 64, 196, pale, { size: 11, spacing: 7, opacity: 0.42 });
      var tagR = A.tag(hud, 'EXHALE  /  RELEASE', 1536, 196, cool, { size: 10, spacing: 5, opacity: 0.3, anchor: 'end' });
      var meters = [];
      for (var mm = 0; mm < 4; mm++) {
        meters.push(H.make('rect', { x: 64, y: 250 + mm * 16, width: 40 - mm * 6, height: 1.4, fill: cool, opacity: 0.14 }, hud));
      }

      // 光球轨迹
      var orbStart = { x: 1104, y: 632 };
      var orbEnd = { x: 930, y: 192 };
      function orbAt(tt) {
        var p = H.E.outCubic(H.clamp((tt - 0.35) / (dur - 0.55), 0, 1));
        return {
          x: H.lerp(orbStart.x, orbEnd.x, p) + Math.sin(tt * 0.7 + 0.4) * 18 * p,
          y: H.lerp(orbStart.y, orbEnd.y, p) + Math.cos(tt * 0.6) * 8 * p
        };
      }

      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var energy = info.energy != null ? info.energy : 0.5;
          var enter = A.enter(t, dur, 0.45, 0.5);
          var e = H.clamp(t / dur, 0, 1);

          // 极缓的推镜，像轻轻吸气
          var cam = 1 + 0.025 * H.E.inOutCubic(e);
          world.setAttribute('transform',
            'translate(800 400) scale(' + cam.toFixed(4) + ') translate(-800 -400)');
          root.setAttribute('opacity', (0.3 + 0.7 * enter).toFixed(3));

          // 星空微闪
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.el.setAttribute('opacity', (s.base * (0.7 + 0.3 * Math.sin(t * s.sp + s.ph))).toFixed(3));
          }

          // 光球
          var op = orbAt(t);
          orbG.setAttribute('transform', 'translate(' + op.x.toFixed(1) + ' ' + op.y.toFixed(1) + ')');
          var orbScale = 1 + pulse * 0.08;
          orbG.setAttribute('transform',
            'translate(' + op.x.toFixed(1) + ' ' + op.y.toFixed(1) + ') scale(' + orbScale.toFixed(3) + ')');
          orbG.setAttribute('opacity', (0.85 + 0.15 * Math.sin(t * 2.1)).toFixed(3));
          orbRing.setAttribute('r', (30 + Math.sin(t * 1.6) * 5 + pulse * 10).toFixed(1));

          // 尾迹：光球身后的几个残影
          for (var tr = 0; tr < trail.length; tr++) {
            var tgo = orbAt(Math.max(0, t - 0.07 * (tr + 1)));
            trail[tr].setAttribute('cx', tgo.x.toFixed(1));
            trail[tr].setAttribute('cy', tgo.y.toFixed(1));
            trail[tr].setAttribute('opacity', (0.42 * (1 - tr / trail.length)).toFixed(3));
          }

          // 手：轻轻上抬一点点后停住（松手的动作）
          var release = 1.62;
          var lift = H.ramp(t, 0.2, 0.9, H.E.outCubic) * 12 - H.ramp(t, release, release + 0.35, H.E.outCubic) * 9;
          var handSway = Math.sin(t * 0.7) * 2;
          handWrap.setAttribute('transform',
            'translate(' + (1088 + handSway).toFixed(1) + ' ' + (900 + lift).toFixed(1) + ') scale(1.02)');

          // 细线：松手前连着手，松手后垂在光球下方
          if (t < release) {
            var handX = 1104 + handSway;
            var handY = 633 + lift;
            var cxp = (handX + op.x) / 2 + Math.sin(t * 1.1) * 8;
            var cyp = (handY + op.y) / 2;
            var dd = 'M' + handX.toFixed(1) + ' ' + handY.toFixed(1) +
              ' Q' + cxp.toFixed(1) + ' ' + cyp.toFixed(1) + ' ' + op.x.toFixed(1) + ' ' + op.y.toFixed(1);
            stringLine.setAttribute('d', dd);
            stringGlow.setAttribute('d', dd);
            stringLine.setAttribute('opacity', '0.85');
            stringGlow.setAttribute('opacity', '0.2');
          } else {
            // 松手后：线从光球垂下来，下面一小段随气流飘
            var sw = Math.sin(t * 1.8) * 10;
            var dd2 = 'M' + op.x.toFixed(1) + ' ' + op.y.toFixed(1) +
              ' Q' + (op.x + 8 + sw * 0.4).toFixed(1) + ' ' + (op.y + 62).toFixed(1) +
              ' ' + (op.x + sw).toFixed(1) + ' ' + (op.y + 118).toFixed(1);
            stringLine.setAttribute('d', dd2);
            stringGlow.setAttribute('d', dd2);
            stringLine.setAttribute('opacity', (0.7 * (1 - H.ramp(t, release, release + 0.4))).toFixed(3));
            stringGlow.setAttribute('opacity', (0.14 * (1 - H.ramp(t, release, release + 0.4))).toFixed(3));
          }

          // 玻璃板一层层碎掉
          for (var p = 0; p < panes.length; p++) {
            var pn = panes[p];
            var q = H.clamp((t - pn.pd.t0) / 0.75, 0, 1);
            var shatter = H.E.inOutCubic(q);
            pn.g.setAttribute('opacity', (0.75 * (1 - shatter)).toFixed(3));
            pn.g.setAttribute('transform',
              'translate(' + pn.pd.x + ' ' + (pn.pd.y - shatter * 26) .toFixed(1) + ') rotate(' +
              (pn.pd.rot + shatter * 5).toFixed(2) + ') translate(' + (Math.sin(t * 0.6 + pn.ph) * 5).toFixed(1) + ' 0)');
            pn.crack.setAttribute('opacity', (q > 0 ? (1 - q) * 0.55 : 0).toFixed(3));
          }

          // 流星
          var mp = H.clamp((t - 2.6) / 0.7, 0, 1);
          if (mp > 0 && mp < 1) {
            meteor.setAttribute('opacity', (Math.sin(Math.PI * mp) * 0.7).toFixed(3));
            meteor.setAttribute('transform',
              'translate(' + H.lerp(1460, 960, mp).toFixed(1) + ' ' + H.lerp(120, 260, mp).toFixed(1) + ')');
            var ln = meteor.firstChild;
            ln.setAttribute('x1', '-90'); ln.setAttribute('y1', '-38');
            ln.setAttribute('x2', '0'); ln.setAttribute('y2', '0');
          } else {
            meteor.setAttribute('opacity', '0');
          }

          dust.update(t, energy);
          tag.setAttribute('opacity', (0.3 + 0.12 * Math.sin(t * 1.2)).toFixed(3));
          tagR.setAttribute('opacity', (0.26 + pulse * 0.1).toFixed(3));
          for (var mm2 = 0; mm2 < meters.length; mm2++) {
            meters[mm2].setAttribute('opacity', (0.1 + 0.06 * Math.sin(t * 1.4 + mm2)).toFixed(2));
          }
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
