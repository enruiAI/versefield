/* =========================================================================
 * MOTIF m10 — 城市烟花
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：烟花/短暂/绚烂/夜空/绽放
 * ========================================================================= */
/* =========================================================================
 * s10 — 像转瞬即逝的烟花  (30.00 – 33.00s)
 * 情绪：城市夜色上方，烟花在鼓点上依次炸开，最后一束最大；
 *      火星下落、余光散尽——转瞬即逝。热闹、高对比，底部留给歌词。
 * 画面：暖色夜空 + 城市天际线剪影 + 前景屋顶 + 3 束烟花（上升轨迹 / 放射光针 /
 *      扩散光环 / 下落火星 / 烟）+ 全屏爆闪
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[9].palette;
      var dur = (scene && scene.dur) || TL.scenes[9].dur;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);
      var glowF = A.glowF(defs, 9);

      A.tag(root, ((scene && scene.tag) || '10 — FIREWORK'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.55 });

      /* ================= 夜空：星 + 城市上空的暖雾 ================= */
      var skyStars = [];
      var sRand = H.rng(31);
      for (var s = 0; s < 22; s++) {
        skyStars.push(H.make('circle', {
          cx: (sRand() * W).toFixed(1), cy: (40 + sRand() * 380).toFixed(1),
          r: (0.6 + sRand() * 1.6).toFixed(2), fill: '#ffe6c8',
          opacity: (0.15 + sRand() * 0.4).toFixed(2)
        }, world));
      }
      var cityHaze = A.rad(defs, pal.accent, [[0, 0.34], [0.5, 0.12], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: 640, rx: 860, ry: 190, fill: 'url(#' + cityHaze + ')' }, world);
      // 两束城市探照灯
      A.beam(world, defs, 420, 660, 130, 560, pal.accent, 0.16, 18);
      A.beam(world, defs, 1180, 660, 150, 600, pal.accent2, 0.13, -16);
      var bokeh = A.bokeh(world, defs, {
        count: 8, seed: 8, x: [120, 1480], y: [420, 620], r: [20, 54],
        colors: [pal.accent, pal.accent2, A.C.orange], opacity: 0.22, blur: 16
      });

      /* ================= 烟花 ================= */
      var BURSTS = [
        { x: 452, y: 262, t0: 0.46, R: 168, color: pal.accent2, n: 15, rise: 26 },
        { x: 1124, y: 214, t0: 1.16, R: 150, color: pal.accent, n: 13, rise: 30 },
        { x: 792, y: 296, t0: 1.85, R: 272, color: '#fff2cc', n: 20, rise: 42 }
      ];
      var bursts = BURSTS.map(function (b, bi) {
        var bRand = H.rng(501 + bi * 37);
        // 爆点余光（大半径柔光，画在世界坐标）
        var haloGrad = A.rad(defs, b.color, [[0, 0.6], [0.35, 0.22], [1, 0]]);
        var halo = H.make('circle', { cx: b.x, cy: b.y, r: 330, fill: 'url(#' + haloGrad + ')', opacity: 0 }, world);

        // 上升轨迹（从地面升到爆点）
        var trailGlow = H.make('line', {
          x1: b.x - 26, y1: 700, x2: b.x, y2: 700,
          stroke: b.color, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0,
          filter: 'url(#' + glowF + ')'
        }, world);
        var trail = H.make('line', {
          x1: b.x - 22, y1: 700, x2: b.x, y2: 700,
          stroke: '#fff8e8', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0
        }, world);
        var trailHead = H.make('circle', { cx: b.x, cy: 700, r: 4.5, fill: '#ffffff', opacity: 0, filter: 'url(#' + glowF + ')' }, world);

        var grp = H.make('g', { transform: 'translate(' + b.x + ' ' + b.y + ')', opacity: 0 }, world);
        var linesG = H.make('g', { opacity: 0 }, grp);
        var rays = [];
        for (var i = 0; i < b.n; i++) {
          var ang = i / b.n * Math.PI * 2 + bRand() * 0.22;
          var len = b.R * (0.55 + bRand() * 0.55);
          rays.push(H.make('line', {
            x1: 0, y1: 0, x2: (Math.cos(ang) * len).toFixed(1), y2: (Math.sin(ang) * len).toFixed(1),
            stroke: i % 4 === 0 ? '#ffffff' : b.color,
            'stroke-width': 1.2 + bRand() * 1.4, 'stroke-linecap': 'round',
            opacity: (0.35 + bRand() * 0.55).toFixed(2)
          }, linesG));
        }
        // 火星
        var sparks = [];
        for (var k = 0; k < 11; k++) {
          var sa = bRand() * Math.PI * 2;
          sparks.push({
            el: H.make('circle', {
              cx: 0, cy: 0, r: (1.6 + bRand() * 2.6).toFixed(2),
              fill: bRand() > 0.45 ? b.color : '#fff8e8', opacity: 0
            }, grp),
            dir: [Math.cos(sa), Math.sin(sa)],
            sp: 0.4 + bRand() * 0.75,
            fall: 90 + bRand() * 160
          });
        }
        var ring = H.make('circle', {
          cx: 0, cy: 0, r: 10, fill: 'none', stroke: b.color, 'stroke-width': 2.2,
          opacity: 0, filter: 'url(#' + glowF + ')'
        }, grp);
        var core = A.orb(grp, defs, 0, 0, b.R * 0.14, '#ffffff', { opacity: 0 });
        var crossH = H.make('rect', { x: -b.R * 0.9, y: -1, width: b.R * 1.8, height: 2, fill: '#fff8e8', opacity: 0 }, grp);
        var crossV = H.make('rect', { x: -1, y: -b.R * 0.9, width: 2, height: b.R * 1.8, fill: '#fff8e8', opacity: 0 }, grp);
        // 烟（两团暗暖色）
        var smoke = [];
        for (var m = 0; m < 2; m++) {
          var smGrad = A.rad(defs, '#6a3a24', [[0, 0.35], [0.6, 0.12], [1, 0]]);
          smoke.push(H.make('circle', {
            cx: (bRand() - 0.5) * 80, cy: (bRand() - 0.5) * 60,
            r: 60, fill: 'url(#' + smGrad + ')', opacity: 0
          }, grp));
        }
        return {
          b: b, halo: halo, grp: grp, linesG: linesG, rays: rays, sparks: sparks,
          ring: ring, core: core, crossH: crossH, crossV: crossV, smoke: smoke,
          trail: trail, trailGlow: trailGlow, trailHead: trailHead
        };
      });

      // 全屏爆闪（每次爆炸短暂提亮）
      var flashId = H.radial(defs, [[0, '#fff2cc', 0.5], [0.5, pal.accent, 0.18], [1, pal.accent, 0]], { cx: 0.5, cy: 0.4, r: 0.7 });
      var flash = H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + flashId + ')', opacity: 0 }, world);

      /* ================= 城市天际线 ================= */
      var cityG = H.make('g', {}, world);
      var cRand = H.rng(53);
      var bx = -30;
      while (bx < W + 40) {
        var bw = 54 + cRand() * 110;
        var bh = 70 + cRand() * 160;
        var btop = 650 - bh;
        H.make('rect', { x: bx, y: btop, width: bw, height: bh + 30, fill: '#080509', opacity: 0.96 }, cityG);
        H.make('rect', { x: bx, y: btop, width: bw, height: 1.5, fill: pal.accent, opacity: 0.3 + cRand() * 0.3 }, cityG);
        // 窗户
        var cols = Math.max(1, Math.floor(bw / 22));
        var rows = Math.max(1, Math.floor(bh / 26));
        for (var c = 0; c < cols; c++) {
          for (var r = 0; r < rows; r++) {
            if (cRand() > 0.5) continue;
            H.make('rect', {
              x: bx + 7 + c * (bw - 12) / cols, y: btop + 10 + r * (bh - 12) / rows,
              width: 2.6, height: 4.2,
              fill: cRand() > 0.4 ? pal.accent2 : pal.accent,
              opacity: 0.25 + cRand() * 0.5
            }, cityG);
          }
        }
        bx += bw + 6 + cRand() * 20;
      }
      // 远处一栋高楼的红色航空灯
      var aviation = H.make('circle', { cx: 1240, cy: 512, r: 3, fill: A.C.red, opacity: 0.8, filter: 'url(#' + glowF + ')' }, cityG);

      /* ================= 前景屋顶（压住底部） ================= */
      var fg = H.make('g', {}, world);
      H.make('path', {
        d: 'M0 716 L0 692 L150 692 L168 676 L300 676 L318 700 L520 700 L540 686 L760 686 ' +
           'L780 704 L1010 704 L1028 678 L1240 678 L1258 698 L1440 698 L1460 682 L1600 682 L1600 780 Z',
        fill: '#040206', opacity: 0.98
      }, fg);
      // 屋顶边缘的一点城市反光
      H.make('rect', { x: 0, y: 690, width: W, height: 1.4, fill: pal.accent, opacity: 0.25 }, fg);
      // 屋顶上的天线
      [210, 690, 1150, 1480].forEach(function (ax) {
        H.make('path', { d: 'M' + ax + ' 700 L' + ax + ' ' + (660 + (ax % 3) * 8), stroke: '#040206', 'stroke-width': 2 }, fg);
        H.make('circle', { cx: ax, cy: 658 + (ax % 3) * 8, r: 2, fill: A.C.red, opacity: 0.7 }, fg);
      });

      var dust = A.dust(world, {
        count: 20, seed: 17, x: [120, 1480], y: [300, 640], r: [0.8, 2.2],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.4
      });

      /* ================= 更新 ================= */
      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var enter = A.enter(t, dur, 0.26, 0.2);
          root.setAttribute('opacity', (0.3 + 0.7 * enter).toFixed(3));

          // 镜头：轻微推近 + 爆点震屏
          var shakeX = 0, shakeY = 0, flashSum = 0;
          for (var bi2 = 0; bi2 < bursts.length; bi2++) {
            var bt = t - BURSTS[bi2].t0;
            if (bt > 0 && bt < 0.7) {
              var dmp = Math.exp(-bt * 11);
              shakeX += Math.sin(bt * 90 + bi2) * (bi2 === 2 ? 9 : 5) * dmp;
              shakeY += Math.cos(bt * 74 + bi2) * (bi2 === 2 ? 7 : 4) * dmp;
              flashSum += Math.exp(-bt * 9) * (bi2 === 2 ? 1 : 0.6);
            }
          }
          var cam = 1.0 + 0.02 * H.clamp(t / dur, 0, 1) + 0.004 * pulse;
          world.setAttribute('transform',
            'translate(' + shakeX.toFixed(2) + ' ' + shakeY.toFixed(2) + ') ' +
            'translate(800 440) scale(' + cam.toFixed(4) + ') translate(-800 -440)');
          flash.setAttribute('opacity', (H.clamp(flashSum, 0, 1.4) * 0.16).toFixed(3));

          // 星空呼吸 / bokeh / 光尘
          for (var st = 0; st < skyStars.length; st++) {
            skyStars[st].setAttribute('opacity', (0.25 + 0.55 * Math.abs(Math.sin(t * 1.7 + st * 1.3))).toFixed(3));
          }
          bokeh.update(t, pulse);
          dust.update(t, info.energy);
          aviation.setAttribute('opacity', (0.35 + 0.5 * Math.abs(Math.sin(t * 2.2))).toFixed(3));

          // 烟花逐束更新
          for (var i = 0; i < bursts.length; i++) {
            var B = bursts[i];
            var b = B.b;
            var dt = t - b.t0;
            var isLast = i === bursts.length - 1;

            // —— 上升 ——
            if (dt < 0 && dt > -0.4) {
              var rp = 1 + dt / 0.4;             // 0..1
              var ry = H.lerp(700, b.y + 10, H.E.inCubic(rp));
              var rx = H.lerp(b.x - 34, b.x, H.E.outCubic(rp));
              B.trail.setAttribute('x2', rx.toFixed(1));
              B.trail.setAttribute('y2', ry.toFixed(1));
              B.trailGlow.setAttribute('x2', rx.toFixed(1));
              B.trailGlow.setAttribute('y2', ry.toFixed(1));
              B.trailHead.setAttribute('cx', rx.toFixed(1));
              B.trailHead.setAttribute('cy', ry.toFixed(1));
              B.trail.setAttribute('opacity', (0.75 * rp).toFixed(3));
              B.trailGlow.setAttribute('opacity', (0.45 * rp).toFixed(3));
              B.trailHead.setAttribute('opacity', (0.9 * rp).toFixed(3));
              B.grp.setAttribute('opacity', '0');
              B.halo.setAttribute('opacity', (0.12 * rp).toFixed(3));
              continue;
            }
            B.trail.setAttribute('opacity', '0');
            B.trailGlow.setAttribute('opacity', '0');
            B.trailHead.setAttribute('opacity', '0');
            if (dt < 0 || dt > 2.4) {
              B.grp.setAttribute('opacity', '0');
              B.halo.setAttribute('opacity', '0');
              continue;
            }

            // —— 爆炸 ——
            var e = H.E.outCubic(H.clamp(dt / 0.46, 0, 1));
            var fade = 1 - H.clamp((dt - 0.35) / (isLast ? 1.9 : 1.45), 0, 1);
            B.grp.setAttribute('opacity', (0.35 + 0.65 * fade).toFixed(3));
            B.linesG.setAttribute('transform', 'scale(' + (0.08 + 0.92 * e).toFixed(4) + ')');
            B.linesG.setAttribute('opacity', (fade * 0.9).toFixed(3));
            for (var r2 = 0; r2 < B.rays.length; r2++) {
              B.rays[r2].setAttribute('opacity', (fade * (0.35 + 0.55 * Math.abs(Math.sin(r2 * 2.7)))).toFixed(3));
            }
            B.ring.setAttribute('r', (16 + (b.R * 1.25) * e).toFixed(1));
            B.ring.setAttribute('opacity', ((1 - e) * 0.55 * fade).toFixed(3));
            B.core.setAttribute('r', (b.R * 0.14 * (0.6 + 0.8 * fade)).toFixed(1));
            B.core.setAttribute('opacity', (H.clamp(1 - dt / 0.42, 0, 1) * 0.95).toFixed(3));
            B.crossH.setAttribute('opacity', ((1 - H.clamp(dt / 0.5, 0, 1)) * 0.7).toFixed(3));
            B.crossV.setAttribute('opacity', ((1 - H.clamp(dt / 0.5, 0, 1)) * 0.7).toFixed(3));
            var cs = 0.3 + 0.7 * e;
            B.crossH.setAttribute('transform', 'scale(' + cs.toFixed(3) + ')');
            B.crossV.setAttribute('transform', 'scale(' + cs.toFixed(3) + ')');

            // 火星：先炸开，再受重力下落
            for (var k2 = 0; k2 < B.sparks.length; k2++) {
              var sp = B.sparks[k2];
              var dist = b.R * sp.sp * (0.25 + 0.75 * e);
              var sx = sp.dir[0] * dist;
              var sy = sp.dir[1] * dist + sp.fall * dt * dt * 0.85;
              sp.el.setAttribute('cx', sx.toFixed(1));
              sp.el.setAttribute('cy', sy.toFixed(1));
              sp.el.setAttribute('opacity', (H.clamp(1 - dt / (isLast ? 1.6 : 1.2), 0, 1) * 0.9).toFixed(3));
            }
            // 烟
            for (var m2 = 0; m2 < B.smoke.length; m2++) {
              var sm = B.smoke[m2];
              sm.setAttribute('r', (50 + dt * 70).toFixed(1));
              sm.setAttribute('opacity', (H.clamp(dt / 0.4, 0, 1) * H.clamp(1 - dt / 1.7, 0, 1) * 0.6).toFixed(3));
            }
            B.halo.setAttribute('opacity', (Math.exp(-dt * 2.4) * 0.9 + 0.18 * fade).toFixed(3));
          }

          // 低频时城市窗光整体亮一点
          cityG.setAttribute('opacity', (0.92 + 0.08 * pulse).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
