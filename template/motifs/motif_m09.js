/* =========================================================================
 * MOTIF m09 — 耳机与情话气泡
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：情话/耳机/气泡/甜/声音/告白
 * ========================================================================= */
/* =========================================================================
 * s09 — 你对我说的情话  (27.00 – 30.00s)
 * 情绪：粉紫色夜色里，戴耳机的剪影被情话包围。耳机里淌出的声波一圈圈扩散，
 *      霓虹对话气泡里飘着心形、声波、光点；小爱心不断向上飘。
 * 画面：黑胶唱片光环 + 人物剪影 + 耳机 + 声波弧线 + 7 个霓虹气泡 + 上升爱心。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[8].palette;
      var dur = (scene && scene.dur) || TL.scenes[8].dur;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);
      var glowF = A.glowF(defs, 8);
      var glowSoft = A.glowF(defs, 18);

      A.tag(root, ((scene && scene.tag) || '09 — SWEET WORDS'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.55 });

      var CX = 800, CY = 386;                 // 耳机 / 声波中心（接近头部）
      var FEET = 636;

      /* ================= 背景：唱片光环 + 氛围 ================= */
      var vinyl = H.make('g', { opacity: 0.8 }, world);
      var vGlow = A.rad(defs, pal.accent, [[0, 0.18], [0.55, 0.07], [1, 0]]);
      H.make('circle', { cx: 800, cy: 430, r: 330, fill: 'url(#' + vGlow + ')' }, vinyl);
      [150, 200, 250, 300].forEach(function (r, i) {
        H.make('circle', {
          cx: 800, cy: 430, r: r, fill: 'none',
          stroke: i % 2 ? pal.accent2 : pal.accent,
          'stroke-width': i === 0 ? 1.6 : 1,
          'stroke-dasharray': i % 2 ? '3 16' : '60 30',
          opacity: 0.16 + (3 - i) * 0.03
        }, vinyl);
      });
      // 唱片整体缓慢旋转（用虚线圆制造转动感）
      var vinylSpin = vinyl.getElementsByTagName('circle');

      var bokeh = A.bokeh(world, defs, {
        count: 14, seed: 44, x: [100, 1500], y: [150, 620], r: [24, 80],
        colors: [pal.accent, pal.accent2, A.C.magenta], opacity: 0.3, blur: 20
      });
      var dust = A.dust(world, {
        count: 34, seed: 66, x: [80, 1520], y: [150, 820], r: [0.8, 2.4],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.5
      });

      /* ================= 底部均衡器（DJ 感，衬在人物后面） ================= */
      var eqG = H.make('g', { opacity: 0.5 }, world);
      var eqBars = [];
      var eqN = 16;
      for (var e = 0; e < eqN; e++) {
        var ex = 400 + e * 54;
        if (ex > 1200) ex = 400 + (e - 15) * 54;
        var bar = H.make('rect', {
          x: 360 + e * 56, y: FEET - 20, width: 20, height: 20, rx: 3,
          fill: e % 3 === 0 ? pal.accent2 : pal.accent,
          opacity: 0.32 + (e % 4) * 0.08
        }, eqG);
        eqBars.push({ el: bar, i: e });
      }

      /* ================= 人物剪影 ================= */
      var person = A.person(world, {
        x: 800, y: FEET, s: 3.2, pose: 'stand',
        rim: pal.accent2, color: '#07030f', rimOpacity: 0.85, bob: 1.2
      });
      // 人物脚下的一圈光
      var footGlow = A.rad(defs, pal.accent, [[0, 0.4], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: FEET + 4, rx: 210, ry: 36, fill: 'url(#' + footGlow + ')' }, world);

      /* ================= 耳机（叠在剪影上） ================= */
      var headG = H.make('g', {}, world);
      var headY = FEET - 86 * 3.2;            // ≈ 371
      var hpBand = H.make('path', {
        d: 'M 748 ' + (headY + 6) + ' A 56 62 0 0 1 852 ' + (headY + 6),
        fill: 'none', stroke: pal.accent, 'stroke-width': 9, 'stroke-linecap': 'round',
        opacity: 0.95, filter: 'url(#' + glowF + ')'
      }, headG);
      H.make('path', {
        d: 'M 748 ' + (headY + 6) + ' A 56 62 0 0 1 852 ' + (headY + 6),
        fill: 'none', stroke: '#fff0fa', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.85
      }, headG);
      var cups = [];
      [-1, 1].forEach(function (dir) {
        H.make('rect', {
          x: 800 + dir * 46 - 11, y: headY - 22, width: 22, height: 46, rx: 10,
          fill: pal.accent, opacity: 0.95, filter: 'url(#' + glowF + ')'
        }, headG);
        H.make('rect', {
          x: 800 + dir * 46 - 5, y: headY - 14, width: 10, height: 30, rx: 5,
          fill: '#fff0fa', opacity: 0.9
        }, headG);
        cups.push(headG);
      });

      /* ================= 从耳机扩散的声波弧线 ================= */
      var waves = [];
      [-1, 1].forEach(function (dir) {
        for (var wv = 0; wv < 3; wv++) {
          var el = H.make('path', {
            d: '', fill: 'none', stroke: wv % 2 ? pal.accent2 : pal.accent,
            'stroke-width': 2.1 - wv * 0.4, 'stroke-linecap': 'round',
            opacity: 0.5, filter: 'url(#' + glowF + ')'
          }, world);
          waves.push({ el: el, dir: dir, base: 96 + wv * 54, i: wv });
        }
      });

      /* ================= 霓虹对话气泡 ================= */
      var BUBBLES = [
        { x: 268, y: 300, w: 168, h: 96, kind: 0, c: pal.accent2, t0: 0.10, ph: 0.0 },
        { x: 1196, y: 268, w: 176, h: 92, kind: 1, c: pal.accent, t0: 0.22, ph: 1.7 },
        { x: 236, y: 486, w: 132, h: 82, kind: 2, c: A.C.magenta, t0: 0.38, ph: 3.1 },
        { x: 1258, y: 486, w: 154, h: 88, kind: 3, c: pal.accent2, t0: 0.52, ph: 4.2 },
        { x: 560, y: 238, w: 122, h: 72, kind: 4, c: pal.accent, t0: 0.66, ph: 2.4 },
        { x: 1042, y: 206, w: 128, h: 74, kind: 5, c: A.C.magenta, t0: 0.30, ph: 5.0 },
        { x: 1080, y: 580, w: 150, h: 82, kind: 0, c: pal.accent2, t0: 0.78, ph: 0.9 }
      ];

      var bubbleNodes = BUBBLES.map(function (b) {
        var grp = H.make('g', { opacity: 0 }, world);
        var inset = 2;
        H.make('rect', {
          x: -b.w / 2, y: -b.h / 2, width: b.w, height: b.h, rx: 22,
          fill: H.rgba('#2a0a24', 0.55), stroke: b.c, 'stroke-width': 2,
          filter: 'url(#' + glowF + ')'
        }, grp);
        H.make('rect', {
          x: -b.w / 2 + inset, y: -b.h / 2 + inset, width: b.w - inset * 2, height: b.h - inset * 2, rx: 20,
          fill: 'none', stroke: H.rgba('#ffffff', 0.22), 'stroke-width': 0.8
        }, grp);
        // 气泡尾巴（指向人物）
        var dirX = b.x < 800 ? 1 : -1;
        H.make('path', {
          d: 'M' + (dirX * (b.w / 2 - 26)) + ' ' + (b.h / 2 - 2) +
            ' L' + (dirX * (b.w / 2 + 22)) + ' ' + (b.h / 2 + 22) +
            ' L' + (dirX * (b.w / 2 - 60)) + ' ' + (b.h / 2 - 2) + ' Z',
          fill: b.c, opacity: 0.75
        }, grp);

        // 气泡内容（抽象情话）
        if (b.kind === 0) {
          var hd = A.heartPath(0, 0, 20);
          H.make('path', {
            d: hd, fill: 'none', stroke: b.c, 'stroke-width': 3,
            'stroke-linejoin': 'round', filter: 'url(#' + glowF + ')'
          }, grp);
          H.make('path', { d: hd, fill: 'none', stroke: '#fff0fa', 'stroke-width': 0.9, 'stroke-linejoin': 'round', opacity: 0.9 }, grp);
        } else if (b.kind === 1) {
          var pts = [];
          for (var q = 0; q <= 10; q++) {
            pts.push([(-b.w / 2 + 22) + q * (b.w - 44) / 10, Math.sin(q * 1.5) * 14]);
          }
          H.make('path', {
            d: H.smoothPath(pts, 0.4), fill: 'none', stroke: b.c, 'stroke-width': 2.6,
            'stroke-linecap': 'round', filter: 'url(#' + glowF + ')'
          }, grp);
        } else if (b.kind === 2) {
          [-20, 0, 20].forEach(function (dx, di) {
            H.make('circle', { cx: dx, cy: (di === 1 ? -8 : 6), r: 5, fill: b.c, opacity: 0.95 }, grp);
          });
          H.make('circle', { cx: 0, cy: 6, r: 12, fill: 'none', stroke: H.rgba('#ffffff', 0.3), 'stroke-width': 1 }, grp);
        } else if (b.kind === 3) {
          [22, 36, 50].forEach(function (r, ri) {
            H.make('path', {
              d: 'M 0 ' + (-r) + ' A ' + r + ' ' + r + ' 0 0 1 0 ' + r,
              fill: 'none', stroke: b.c, 'stroke-width': 2.2 - ri * 0.5,
              opacity: 0.85 - ri * 0.2, 'stroke-linecap': 'round', filter: 'url(#' + glowF + ')'
            }, grp);
          });
          H.make('circle', { cx: 0, cy: 0, r: 5, fill: '#fff0fa' }, grp);
        } else if (b.kind === 4) {
          H.make('path', {
            d: 'M 0 -26 L 0 26 M -26 0 L 26 0', fill: 'none', stroke: b.c,
            'stroke-width': 2.6, 'stroke-linecap': 'round', filter: 'url(#' + glowF + ')'
          }, grp);
          H.make('circle', { cx: 0, cy: 0, r: 6, fill: '#fff0fa' }, grp);
        } else {
          [[-26, 0], [0, -16], [26, 0]].forEach(function (p) {
            H.make('circle', { cx: p[0], cy: p[1], r: 4.2, fill: b.c, opacity: 0.9 }, grp);
          });
          H.make('path', {
            d: 'M -26 0 L 0 -16 L 26 0', fill: 'none', stroke: H.rgba('#ffffff', 0.35),
            'stroke-width': 1, 'stroke-linejoin': 'round'
          }, grp);
        }
        return { grp: grp, b: b };
      });

      /* ================= 上升的小爱心 ================= */
      var hearts = [];
      var hRand = H.rng(131);
      for (var h = 0; h < 18; h++) {
        var hx = 160 + hRand() * 1280;
        var hgrp = H.make('g', { opacity: 0 }, world);
        var hs = 4 + hRand() * 7;
        H.make('path', {
          d: A.heartPath(0, 0, hs), fill: hRand() > 0.35 ? pal.accent2 : A.C.magenta,
          opacity: 0.75, filter: 'url(#' + glowF + ')'
        }, hgrp);
        hearts.push({
          g: hgrp, x: hx, base: hRand(), sp: 26 + hRand() * 46,
          ph: hRand() * 6.283, amp: 10 + hRand() * 34, sc: 0.7 + hRand() * 0.7
        });
      }

      /* ================= 更新 ================= */
      var dStr = '';
      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var enter = A.enter(t, dur, 0.3, 0.26);
          var e = H.clamp(t / dur, 0, 1);
          root.setAttribute('opacity', (0.25 + 0.75 * enter).toFixed(3));

          // 推镜
          var cam = 1.0 + 0.03 * H.E.inOutCubic(e) + 0.008 * pulse;
          world.setAttribute('transform',
            'translate(800 440) scale(' + cam.toFixed(4) + ') translate(-800 -440)');

          // 唱片缓慢转动（虚线图层旋转就能读出来）
          vinyl.setAttribute('transform', 'rotate(' + (t * 9).toFixed(2) + ' 800 430)');

          // 耳机灯随鼓点呼吸
          hpBand.setAttribute('opacity', (0.75 + 0.25 * pulse).toFixed(3));

          // 声波：一圈圈往外推
          for (var w = 0; w < waves.length; w++) {
            var wv2 = waves[w];
            var ph = H.fract(t * 0.85 + wv2.i * 0.26);
            var r = wv2.base + ph * 120 + pulse * 16;
            dStr = wv2.dir > 0
              ? 'M ' + CX + ' ' + (CY - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + CX + ' ' + (CY + r)
              : 'M ' + CX + ' ' + (CY - r) + ' A ' + r + ' ' + r + ' 0 0 0 ' + CX + ' ' + (CY + r);
            wv2.el.setAttribute('d', dStr);
            wv2.el.setAttribute('opacity', ((1 - ph) * 0.55 * (0.6 + 0.6 * pulse)).toFixed(3));
          }

          // 气泡：错峰浮出 + 轻微漂浮 + 鼓点放大
          for (var i = 0; i < bubbleNodes.length; i++) {
            var bn = bubbleNodes[i];
            var b = bn.b;
            var app = H.clamp((t - b.t0) / 0.34, 0, 1);
            if (app <= 0) { bn.grp.setAttribute('opacity', '0'); continue; }
            var pop = H.E.outBack(app);
            var bobY = Math.sin(t * 1.6 + b.ph) * 7;
            var bobX = Math.cos(t * 1.1 + b.ph) * 5;
            var rot = Math.sin(t * 0.9 + b.ph) * 2.4;
            var sc = (0.7 + 0.3 * pop) * (1 + 0.045 * pulse);
            bn.grp.setAttribute('transform',
              'translate(' + (b.x + bobX).toFixed(1) + ' ' + (b.y + bobY).toFixed(1) + ') ' +
              'rotate(' + rot.toFixed(2) + ') scale(' + sc.toFixed(3) + ')');
            bn.grp.setAttribute('opacity', (app * (0.82 + 0.18 * pulse)).toFixed(3));
          }

          // 均衡器随拍点跳动
          for (var q = 0; q < eqBars.length; q++) {
            var eq = eqBars[q];
            var hgt = 18 + Math.abs(Math.sin(t * 3.1 + q * 0.7)) * 46 + pulse * 58 * (0.4 + (q % 3) * 0.3);
            eq.el.setAttribute('height', hgt.toFixed(1));
            eq.el.setAttribute('y', (FEET - hgt).toFixed(1));
            eq.el.setAttribute('opacity', (0.24 + 0.3 * pulse).toFixed(3));
          }
          eqG.setAttribute('opacity', (0.35 + 0.4 * pulse).toFixed(3));

          person.update(t, pulse * 0.8);

          // 上升爱心
          for (var h2 = 0; h2 < hearts.length; h2++) {
            var ht = hearts[h2];
            var hp2 = H.fract(ht.base + t * ht.sp / 520);
            var hy = 700 - hp2 * 560;
            var hx2 = ht.x + Math.sin(t * 0.9 + ht.ph) * ht.amp;
            ht.g.setAttribute('transform',
              'translate(' + hx2.toFixed(1) + ' ' + hy.toFixed(1) + ') rotate(' + (Math.sin(t + ht.ph) * 18).toFixed(1) + ') scale(' + ht.sc.toFixed(2) + ')');
            ht.g.setAttribute('opacity', (Math.sin(Math.PI * hp2) * (0.5 + 0.5 * pulse)).toFixed(3));
          }

          dust.update(t, info.energy);
          bokeh.update(t, pulse);
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
