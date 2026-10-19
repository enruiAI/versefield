/* =========================================================================
 * MOTIF m11 — 冻结的烟花
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：一刹那/定格/冻结/瞬间/停住
 * ========================================================================= */
/* =========================================================================
 * s11 — 只停在绽放一刹那  (33.00 – 37.00s / 4.0s)
 * 情绪：上一镜的烟花被整帧冻结。巨大的放射光针定格在半空，火星悬停，
 *      背景冷到发蓝，时不时闪出几道故障切片与色散双影，底部冰裂向上蔓延。
 * 画面：冷蓝夜空 + 冻结烟花（光针 / 冰环 / 火星）+ 故障切片 + 冰裂。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A, TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[10].palette;
      var dur = (scene && scene.dur) || TL.scenes[10].dur;
      var C = A.C;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);
      var cx = 800, cy = 344;
      var glowF = A.glowF(defs, 9);

      /* ---------------- 冻结的冷光氛围 ---------------- */
      var cold = A.rad(defs, pal.accent, [[0, 0.40], [0.42, 0.14], [1, 0]]);
      H.make('circle', { cx: cx, cy: cy, r: 660, fill: 'url(#' + cold + ')' }, world);
      var pinkGlow = A.rad(defs, pal.accent2, [[0, 0.22], [0.5, 0.06], [1, 0]]);
      H.make('ellipse', { cx: cx, cy: cy + 100, rx: 470, ry: 330, fill: 'url(#' + pinkGlow + ')' }, world);

      // 冷雾横带（像镜头前结了一层霜）
      var haze = A.vgrad(defs, [[0, pal.accent, 0], [0.5, pal.accent, 0.14], [1, pal.accent, 0]], 'frz');
      H.make('rect', { x: 0, y: 400, width: W, height: 250, fill: 'url(#' + haze + ')' }, world);
      var haze2 = A.vgrad(defs, [[0, pal.accent2, 0], [0.5, pal.accent2, 0.08], [1, pal.accent2, 0]], 'frz2');
      H.make('rect', { x: 0, y: 170, width: W, height: 160, fill: 'url(#' + haze2 + ')' }, world);

      /* ---------------- 星点（冻结的夜空） ---------------- */
      var srand = H.rng(1403);
      var stars = [];
      for (var i = 0; i < 62; i++) {
        var sx = srand() * W;
        var sy = srand() * 520;
        var sr = 0.5 + srand() * 1.9;
        var base = 0.12 + srand() * 0.6;
        var el = H.make('circle', {
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: sr.toFixed(2),
          fill: i % 5 === 0 ? pal.accent : (i % 7 === 0 ? pal.accent2 : '#ffffff'),
          opacity: base.toFixed(3)
        }, world);
        stars.push({ el: el, base: base, sp: 0.5 + srand() * 1.6, ph: srand() * 6.283 });
      }

      /* ---------------- 远景冷光斑 ---------------- */
      A.bokeh(world, defs, {
        count: 9, seed: 23, x: [120, 1480], y: [60, 460], r: [40, 120],
        colors: [pal.accent, pal.accent2, C.white], opacity: 0.16, blur: 22
      });

      /* ---------------- 冻结的烟花 ---------------- */
      var burst = H.make('g', {}, world);
      // 烟花核心光晕
      var coreHalo = A.rad(defs, pal.accent, [[0, 0.55], [0.4, 0.18], [1, 0]]);
      H.make('circle', { cx: cx, cy: cy, r: 300, fill: 'url(#' + coreHalo + ')' }, burst);

      // 冻结的冰环
      var iceRings = [];
      for (var r = 0; r < 3; r++) {
        var ring = H.make('circle', {
          cx: cx, cy: cy, r: 118 + r * 92, fill: 'none',
          stroke: r === 1 ? pal.accent2 : pal.accent,
          'stroke-width': 1.4 - r * 0.25, 'stroke-dasharray': (r === 0 ? '2 9' : '10 16'),
          opacity: 0.30 - r * 0.07
        }, burst);
        iceRings.push(ring);
      }

      // 放射光针（主体）
      var nrand = H.rng(9021);
      var needles = [];
      for (var n = 0; n < 24; n++) {
        var ang = (n / 24) * Math.PI * 2 + (nrand() - 0.5) * 0.16;
        var r0 = 26 + nrand() * 12;
        var len = 150 + nrand() * 250 + (n % 6 === 0 ? 130 : 0);
        needles.push({
          ang: ang, r0: r0, r1: r0 + len,
          color: n % 5 === 0 ? C.white : (n % 4 === 0 ? pal.accent2 : pal.accent),
          w: 1.0 + nrand() * 1.8 + (n % 6 === 0 ? 0.9 : 0)
        });
      }
      var burstRot = H.make('g', {}, burst);
      var needleGlow = H.make('g', { filter: 'url(#' + glowF + ')', opacity: 0.5 }, burstRot);
      var mainNeedles = H.make('g', {}, burstRot);
      function drawNeedle(parent, nd, wMul, op) {
        var x1 = cx + Math.cos(nd.ang) * nd.r0;
        var y1 = cy + Math.sin(nd.ang) * nd.r0;
        var x2 = cx + Math.cos(nd.ang) * nd.r1;
        var y2 = cy + Math.sin(nd.ang) * nd.r1;
        return H.make('line', {
          x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1),
          stroke: nd.color, 'stroke-width': (nd.w * wMul).toFixed(2),
          'stroke-linecap': 'round', opacity: op
        }, parent);
      }
      for (var m = 0; m < needles.length; m++) {
        drawNeedle(needleGlow, needles[m], 2.6, 0.5);
        drawNeedle(mainNeedles, needles[m], 1, 0.85);
      }
      // 长针的白色内芯
      var coreNeedles = H.make('g', {}, burstRot);
      for (var m2 = 0; m2 < needles.length; m2++) {
        if (needles[m2].r1 - needles[m2].r0 < 300) continue;
        drawNeedle(coreNeedles, needles[m2], 0.32, 0.9);
      }
      // 色散双影（只拷贝最亮的长针）
      var ghostPink = H.make('g', { opacity: 0.34 }, burstRot);
      var ghostCyan = H.make('g', { opacity: 0.30 }, burstRot);
      for (var m3 = 0; m3 < needles.length; m3++) {
        if (needles[m3].r1 - needles[m3].r0 < 280) continue;
        var gl = drawNeedle(ghostPink, needles[m3], 0.8, 0.8);
        gl.setAttribute('stroke', pal.accent2);
        var gl2 = drawNeedle(ghostCyan, needles[m3], 0.8, 0.8);
        gl2.setAttribute('stroke', pal.accent);
      }

      // 冻结的火星颗粒
      var frozenSparks = [];
      var sparkRnd = H.rng(3311);
      for (var s = 0; s < 52; s++) {
        var nd2 = needles[Math.floor(sparkRnd() * needles.length)];
        var dist = 40 + sparkRnd() * (nd2.r1 - nd2.r0 + 90);
        var px = cx + Math.cos(nd2.ang) * dist + (sparkRnd() - 0.5) * 20;
        var py = cy + Math.sin(nd2.ang) * dist + (sparkRnd() - 0.5) * 20;
        var col = sparkRnd() > 0.72 ? pal.accent2 : (sparkRnd() > 0.45 ? pal.accent : C.white);
        var el2 = H.make('circle', {
          cx: px.toFixed(1), cy: py.toFixed(1), r: (1.1 + sparkRnd() * 2.8).toFixed(2),
          fill: col, opacity: 0.6 + sparkRnd() * 0.4
        }, burstRot);
        frozenSparks.push({ el: el2, base: 0.6 + sparkRnd() * 0.4, ph: sparkRnd() * 6.283, sp: 0.6 + sparkRnd() * 1.5 });
      }
      // 8 片很淡的光瓣，让爆点有体积
      for (var p = 0; p < 8; p++) {
        var pa = (p / 8) * Math.PI * 2 + 0.2;
        var plen = 210 + (p % 3) * 90;
        var pw = 26 + (p % 4) * 12;
        H.make('polygon', {
          points: (cx + Math.cos(pa) * 40) + ',' + (cy + Math.sin(pa) * 40) + ' ' +
            (cx + Math.cos(pa) * plen + Math.cos(pa + 1.57) * pw) + ',' + (cy + Math.sin(pa) * plen + Math.sin(pa + 1.57) * pw) + ' ' +
            (cx + Math.cos(pa) * plen - Math.cos(pa + 1.57) * pw) + ',' + (cy + Math.sin(pa) * plen - Math.sin(pa + 1.57) * pw),
          fill: pal.accent2, opacity: 0.05
        }, burstRot);
      }

      // 核心（白色光核 + 四芒星）
      var coreG = H.make('g', {}, burst);
      A.orb(coreG, defs, cx, cy, 66, pal.accent, { opacity: 0.9 });
      A.orb(coreG, defs, cx, cy, 30, C.white, { opacity: 1 });
      A.flare(coreG, defs, cx, cy, 15, C.white, { opacity: 0.85 });

      // 冻结的升空尾迹
      A.beam(world, defs, cx, 660, 40, 300, pal.accent, 0.22, 0);
      A.beam(world, defs, cx + 3, 660, 14, 230, C.white, 0.20, 0);
      var trailDots = [];
      for (var td = 0; td < 10; td++) {
        trailDots.push(H.make('circle', {
          cx: (cx + (td % 2 ? 8 : -8)).toFixed(1), cy: (620 - td * 22).toFixed(1),
          r: (0.8 + (td % 3) * 0.5).toFixed(2), fill: pal.accent, opacity: 0.18 + (td % 4) * 0.05
        }, world));
      }

      /* ---------------- 底部冰裂（向外蔓延后冻结） ---------------- */
      var crackG = H.make('g', {}, world);
      var cracks = [];
      var crand = H.rng(5501);
      for (var c = 0; c < 9; c++) {
        var startX = cx + (c - 4) * 62 + (crand() - 0.5) * 40;
        var d = 'M' + startX.toFixed(1) + ' 900';
        var px2 = startX, py2 = 900;
        var steps = 4 + Math.floor(crand() * 3);
        for (var st = 0; st < steps; st++) {
          px2 += (crand() - 0.5) * 90 + (c - 4) * 8;
          py2 -= 40 + crand() * 44;
          d += ' L' + px2.toFixed(1) + ' ' + py2.toFixed(1);
        }
        var ce = H.make('path', {
          d: d, fill: 'none', stroke: c % 3 === 0 ? C.white : pal.accent,
          'stroke-width': (0.9 + (c % 3) * 0.5).toFixed(2), 'stroke-linecap': 'round',
          'stroke-dasharray': 900, 'stroke-dashoffset': 900, opacity: 0.32
        }, crackG);
        cracks.push(ce);
      }
      // 冰晶碎片（细小的菱形）
      var shards = [];
      for (var sh = 0; sh < 12; sh++) {
        var shx = cx + (crand() - 0.5) * 900;
        var shy = 700 + crand() * 160;
        var sz = 4 + crand() * 9;
        var sg = H.make('g', {
          transform: 'translate(' + shx.toFixed(1) + ' ' + shy.toFixed(1) + ') rotate(' + (crand() * 180).toFixed(0) + ')',
          opacity: 0
        }, world);
        H.make('path', {
          d: 'M0 ' + (-sz) + ' L' + (sz * 0.6) + ' 0 L0 ' + sz + ' L' + (-sz * 0.6) + ' 0 Z',
          fill: 'none', stroke: pal.accent, 'stroke-width': 0.9, opacity: 0.5
        }, sg);
        shards.push(sg);
      }

      /* ---------------- 故障切片 ---------------- */
      var bars = [];
      var brand = H.rng(8801);
      for (var b = 0; b < 9; b++) {
        var bar = H.make('rect', {
          x: 0, y: 0, width: 0, height: 0,
          fill: b % 2 ? pal.accent2 : pal.accent, opacity: 0
        }, world);
        bars.push({
          el: bar, y: 158 + b * 56 + (b % 3) * 12,
          h: 2 + (b % 2) * 4, ph: brand() * 6.283, sp: 0.8 + brand() * 1.6,
          w: 520 + brand() * 700, x0: 60 + brand() * 220
        });
      }
      // 故障时的细碎噪点
      var noise = [];
      var nrnd = H.rng(6611);
      for (var nz = 0; nz < 26; nz++) {
        noise.push(H.make('rect', {
          x: 0, y: 0, width: 2 + nrnd() * 22, height: 1.5 + nrnd() * 3,
          fill: nrnd() > 0.6 ? pal.accent2 : pal.accent, opacity: 0
        }, world));
      }

      /* ---------------- 前景光尘 ---------------- */
      var dust = A.dust(world, {
        count: 34, seed: 47, x: [-40, 1640], y: [90, 830], r: [1, 2.8],
        colors: ['#ffffff', pal.accent, pal.accent2], opacity: 0.5
      });

      // 中心呼吸光环（很慢，像冻结的空气在微动）
      var ripple = A.ripple(world, defs, cx, cy, pal.accent, {
        count: 3, r0: 90, r1: 330, width: 1.2, alpha: 0.55, period: 2.6
      });

      /* ---------------- HUD ---------------- */
      var hud = H.make('g', {}, root);
      var tag = A.tag(hud, ((scene && scene.tag) || '11 — FREEZE'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.6 });
      var sub = A.tag(hud, 'T = 33.00  /  SHUTTER  1/8000', 1536, 196, pal.accent, { size: 10, spacing: 5, opacity: 0.5, anchor: 'end' });
      // 左侧竖向刻度，强化“定格测量”的感觉
      for (var tk = 0; tk < 7; tk++) {
        H.make('rect', {
          x: 64, y: 250 + tk * 30, width: tk % 2 ? 10 : 18, height: 1,
          fill: pal.accent, opacity: 0.18
        }, hud);
      }

      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var energy = info.energy != null ? info.energy : 0.5;
          var enter = A.enter(t, dur, 0.35, 0.55);
          var e = H.clamp(t / 2.6, 0, 1);
          // 镜头缓慢推近后冻结
          var cam = 1.075 - 0.045 * H.E.outCubic(e);
          world.setAttribute('transform',
            'translate(' + cx + ' ' + cy + ') scale(' + cam.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
          root.setAttribute('opacity', (0.32 + 0.68 * enter).toFixed(3));

          // 星光微闪
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.el.setAttribute('opacity', (s.base * (0.7 + 0.3 * Math.sin(t * s.sp + s.ph))).toFixed(3));
          }

          // 光针极缓慢地转（冻结中几乎察觉不到）
          burstRot.setAttribute('transform', 'rotate(' + (t * 0.55).toFixed(2) + ' ' + cx + ' ' + cy + ')');
          // 色散双影左右浮动
          var ch = 5 + Math.sin(t * 2.4) * 2.4;
          ghostPink.setAttribute('transform', 'translate(' + ch.toFixed(2) + ' 0)');
          ghostCyan.setAttribute('transform', 'translate(' + (-ch).toFixed(2) + ' 0)');
          ghostPink.setAttribute('opacity', (0.22 + pulse * 0.3).toFixed(3));
          ghostCyan.setAttribute('opacity', (0.2 + pulse * 0.28).toFixed(3));

          // 核心：鼓点时亮一下，其余保持冻结
          var cs = 1 + pulse * 0.05;
          coreG.setAttribute('transform',
            'translate(' + cx + ' ' + cy + ') scale(' + cs.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
          coreG.setAttribute('opacity', (0.88 + pulse * 0.12).toFixed(3));
          needleGlow.setAttribute('opacity', (0.42 + pulse * 0.3).toFixed(3));
          mainNeedles.setAttribute('opacity', (0.9 + pulse * 0.1).toFixed(3));

          // 冰环随鼓点微微发亮
          for (var r = 0; r < iceRings.length; r++) {
            iceRings[r].setAttribute('opacity', (0.26 - r * 0.06 + pulse * 0.16).toFixed(3));
          }

          // 冻结火星（只闪，不动）
          for (var s2 = 0; s2 < frozenSparks.length; s2++) {
            var fs = frozenSparks[s2];
            fs.el.setAttribute('opacity', (fs.base * (0.7 + 0.3 * Math.sin(t * fs.sp + fs.ph))).toFixed(3));
          }

          // 冰裂生长然后定格
          var cp = H.E.outCubic(H.clamp(t / 1.7, 0, 1));
          for (var c2 = 0; c2 < cracks.length; c2++) {
            cracks[c2].setAttribute('stroke-dashoffset', (900 * (1 - cp)).toFixed(1));
            cracks[c2].setAttribute('opacity', (0.16 + cp * 0.26 + pulse * 0.08).toFixed(3));
          }
          for (var s3 = 0; s3 < shards.length; s3++) {
            shards[s3].setAttribute('opacity', (cp * (0.25 + 0.15 * Math.sin(t * 1.7 + s3))).toFixed(3));
          }

          // 故障切片：大部分时间静默，偶尔横向错位闪一下；结尾几乎停止
          var glitchDamp = 1 - H.ramp(t, dur - 0.55, dur, H.E.inOutSine);
          for (var b2 = 0; b2 < bars.length; b2++) {
            var bar = bars[b2];
            var on = H.fract(t * bar.sp + bar.ph);
            var flash = (on > 0.82 && on < 0.9) ? (0.28 + pulse * 0.3) : 0;
            bar.el.setAttribute('opacity', (flash * glitchDamp).toFixed(3));
            if (flash > 0) {
              bar.el.setAttribute('x', (bar.x0 + Math.sin(t * 31 + b2 * 2.1) * 90).toFixed(1));
              bar.el.setAttribute('y', bar.y);
              bar.el.setAttribute('width', bar.w.toFixed(1));
              bar.el.setAttribute('height', bar.h.toFixed(1));
            }
          }
          for (var n2 = 0; n2 < noise.length; n2++) {
            var on2 = H.fract(t * 2.7 + n2 * 0.37);
            var f2 = (on2 > 0.9) ? (0.3 * glitchDamp) : 0;
            noise[n2].setAttribute('opacity', f2.toFixed(3));
            if (f2 > 0) {
              noise[n2].setAttribute('x', (n2 * 58 + Math.sin(t * 23 + n2) * 40).toFixed(1));
              noise[n2].setAttribute('y', (170 + (n2 % 12) * 38).toFixed(1));
            }
          }

          // 冻结空气里极慢的光环
          ripple.update(t * 0.55, pulse);
          dust.update(t, energy * 0.9);
          tag.setAttribute('opacity', (0.3 + 0.14 * Math.sin(t * 1.4) + pulse * 0.1).toFixed(3));
          sub.setAttribute('opacity', (0.28 + pulse * 0.12).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
