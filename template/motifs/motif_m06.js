/* =========================================================================
 * MOTIF m06 — 雨夜窗边
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：雨/窗/发呆/陪伴/夜晚/灰暗
 * ========================================================================= */
/* =========================================================================
 * s06 — 在最灰暗的日子你陪着我发呆  (17.00 – 21.00s)
 * 情绪：雨夜、安静的陪伴。镜头在室内，透过一扇布满雨滴的窗看模糊的蓝紫霓虹街景；
 *      窗内两个人并肩坐在地上，中间一台小电视发出蓝光，照亮他们的侧脸轮廓。
 * 画面：窗外 bokeh 霓虹 + 雨丝 + 玻璃雨滴/水痕 + 窗框 + 室内剪影 + 电视扫描线。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[5].palette;
      var dur = (scene && scene.dur) || TL.scenes[5].dur;

      var root = H.make('g', {}, g);
      var glowF = A.glowF(defs, 8);
      var softF = A.glowF(defs, 16);
      var blurF = A.blurF(defs, 14);

      A.tag(root, ((scene && scene.tag) || '06 — THE QUIET'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.55 });

      /* ================= 窗外的霓虹街景（裁进窗内） ================= */
      var winX = 160, winY = 150, winW = 1280, winH = 470;
      var clipId = H.uid('winclip');
      var cp = H.make('clipPath', { id: clipId }, defs);
      H.make('rect', { x: winX, y: winY, width: winW, height: winH, rx: 4 }, cp);
      var outside = H.make('g', { 'clip-path': 'url(#' + clipId + ')' }, root);

      // 夜空（比统一底色更深一点，压住情绪）
      var sky = H.grad(defs, [
        [0, '#050817'], [0.4, '#0b1430'], [0.75, '#1a2450'], [1, '#2a3560']
      ], { y1: 0, y2: 1 });
      H.make('rect', { x: winX, y: winY, width: winW, height: winH, fill: 'url(#' + sky + ')' }, outside);

      // 远处雨雾里的楼影
      var bRand = H.rng(71);
      var bx = winX - 25;
      while (bx < winX + winW + 30) {
        var bw = 50 + bRand() * 110;
        var bh = 90 + bRand() * 190;
        H.make('rect', {
          x: bx, y: winY + winH - bh, width: bw, height: bh + 30,
          fill: '#070a18', opacity: 0.78
        }, outside);
        // 零星窗灯（被雨雾糊开，很小）
        var cols = Math.floor(bw / 26);
        var rows = Math.floor(bh / 30);
        for (var c = 0; c < cols; c++) {
          for (var r = 0; r < rows; r++) {
            if (bRand() > 0.34) continue;
            H.make('rect', {
              x: bx + 8 + c * (bw - 12) / Math.max(1, cols),
              y: winY + winH - bh + 12 + r * (bh - 16) / Math.max(1, rows),
              width: 3, height: 5,
              fill: bRand() > 0.55 ? pal.accent2 : pal.accent,
              opacity: 0.25 + bRand() * 0.55
            }, outside);
          }
        }
        bx += bw + 8 + bRand() * 22;
      }

      // 模糊的霓虹招牌（窗外发光色块，是这幅画的主光来源）
      var signs = [
        { x: 320, y: 250, w: 120, h: 54, c: pal.accent2, o: 0.65 },
        { x: 1120, y: 218, w: 150, h: 40, c: A.C.magenta, o: 0.55 },
        { x: 690, y: 330, w: 210, h: 26, c: A.C.cyan, o: 0.45 },
        { x: 1380, y: 330, w: 60, h: 120, c: pal.accent, o: 0.52 }
      ];
      signs.forEach(function (s) {
        H.make('rect', {
          x: s.x, y: s.y, width: s.w, height: s.h, rx: 6,
          fill: s.c, opacity: s.o, filter: 'url(#' + blurF + ')'
        }, outside);
      });
      // 窗外更清晰的霓虹管（让画面“够霓虹”）
      H.make('circle', {
        cx: 1014, cy: 296, r: 34, fill: 'none', stroke: A.C.magenta, 'stroke-width': 3,
        opacity: 0.8, filter: 'url(#' + glowF + ')'
      }, outside);
      H.make('circle', { cx: 1014, cy: 296, r: 34, fill: 'none', stroke: '#ffd6f2', 'stroke-width': 0.9, opacity: 0.85 }, outside);
      H.make('path', {
        d: 'M 430 322 L 430 470', fill: 'none', stroke: A.C.cyan, 'stroke-width': 3,
        'stroke-linecap': 'round', opacity: 0.7, filter: 'url(#' + glowF + ')'
      }, outside);
      H.make('path', {
        d: 'M 1216 392 L 1330 392', fill: 'none', stroke: pal.accent2, 'stroke-width': 2.6,
        'stroke-linecap': 'round', opacity: 0.7, filter: 'url(#' + glowF + ')'
      }, outside);

      // 窗外 bokeh 光斑
      var bokeh = A.bokeh(outside, defs, {
        count: 18, seed: 12,
        x: [winX + 20, winX + winW - 20], y: [winY + 40, winY + winH - 120],
        r: [16, 64],
        colors: [pal.accent, pal.accent2, A.C.magenta, A.C.cyan],
        opacity: 0.48, blur: 18
      });

      // 雨丝（在窗玻璃外）
      var rain = A.rain(outside, { count: 66, seed: 33, color: '#a8c4ff', opacity: 0.26, width: 1.1 });

      /* ================= 玻璃上的雨滴与水痕 ================= */
      var glass = H.make('g', { 'clip-path': 'url(#' + clipId + ')' }, root);
      // 水滴（透明珠：外圈折射 + 一点高光）
      var dropRand = H.rng(97);
      var drops = [];
      for (var d = 0; d < 22; d++) {
        var dx = winX + 30 + dropRand() * (winW - 60);
        var dy = winY + 20 + dropRand() * (winH - 70);
        var dr = 2.2 + dropRand() * 7.5;
        var rim = H.make('circle', {
          cx: dx, cy: dy, r: dr, fill: 'none',
          stroke: dropRand() > 0.5 ? H.rgba(pal.accent2, 0.55) : H.rgba('#bfd4ff', 0.4),
          'stroke-width': 1, opacity: 0.5
        }, glass);
        var hi = H.make('circle', {
          cx: dx - dr * 0.3, cy: dy - dr * 0.35, r: dr * 0.28,
          fill: '#eaf4ff', opacity: 0.5
        }, glass);
        drops.push({ rim: rim, hi: hi, base: 0.35 + dropRand() * 0.4, ph: dropRand() * 6.283, sp: 0.8 + dropRand() * 2.2 });
      }
      // 往下流的水痕（细波浪线，缓慢下移）
      var streaks = [];
      for (var st = 0; st < 9; st++) {
        var sx2 = winX + 50 + (st / 9) * (winW - 100) + (dropRand() - 0.5) * 60;
        var len = 90 + dropRand() * 200;
        var wav = 'M' + sx2 + ' 0 C' + (sx2 + 6) + ' ' + (len * 0.3) + ' ' + (sx2 - 6) + ' ' + (len * 0.6) + ' ' + (sx2 + 2) + ' ' + len;
        var path = H.make('path', {
          d: wav, fill: 'none', stroke: H.rgba('#cfe0ff', 0.35), 'stroke-width': 1.1,
          opacity: 0.3, transform: 'translate(0 ' + (winY + 10) + ')'
        }, glass);
        H.make('circle', { cx: sx2 + 2, cy: len, r: 2.4, fill: '#dceaff', opacity: 0.35, transform: 'translate(0 ' + (winY + 10) + ')' }, glass);
        streaks.push({ el: path, x: sx2, len: len, sp: 4 + dropRand() * 10, off: dropRand() * 260 });
      }
      // 玻璃整体的一层冷色反光
      var sheen = H.grad(defs, [[0, '#9fc4ff', 0.10], [0.5, '#9fc4ff', 0], [1, '#9fc4ff', 0.06]], { x1: 0, y1: 0, x2: 1, y2: 1 });
      H.make('rect', { x: winX, y: winY, width: winW, height: winH, fill: 'url(#' + sheen + ')' }, glass);

      /* ================= 窗框 ================= */
      var frame = H.make('g', {}, root);
      var frameCol = '#0a0e1c';
      H.make('rect', { x: winX - 14, y: winY - 14, width: winW + 28, height: 14, fill: frameCol }, frame);
      H.make('rect', { x: winX - 14, y: winY + winH, width: winW + 28, height: 14, fill: frameCol }, frame);
      H.make('rect', { x: winX - 14, y: winY - 14, width: 14, height: winH + 28, fill: frameCol }, frame);
      H.make('rect', { x: winX + winW, y: winY - 14, width: 14, height: winH + 28, fill: frameCol }, frame);
      [0.34, 0.665].forEach(function (u) {
        H.make('rect', { x: winX + winW * u - 5, y: winY, width: 10, height: winH, fill: frameCol }, frame);
      });
      H.make('rect', { x: winX, y: winY + winH * 0.52 - 5, width: winW, height: 10, fill: frameCol }, frame);
      // 窗框上沿的冷光
      H.make('rect', { x: winX - 14, y: winY - 14, width: winW + 28, height: 2, fill: H.rgba(pal.accent2, 0.35) }, frame);

      /* ================= 室内：地面 / 电视 / 两个人 ================= */
      var room = H.make('g', { transform: 'translate(0 -16)' }, root);
      // 左右两侧室内暗墙
      var roomSide = H.grad(defs, [[0, '#03040d', 0.98], [1, '#03040d', 0.55]], { x1: 0, y1: 0, x2: 1, y2: 0 });
      H.make('rect', { x: 0, y: 130, width: winX - 10, height: 700, fill: 'url(#' + roomSide + ')' }, room);
      H.make('rect', { x: winX + winW + 10, y: 130, width: W - (winX + winW + 10), height: 700, fill: 'url(#' + roomSide + ')' }, room);
      // 地板（窗底以下的近景暗面）
      var floorId = H.grad(defs, [[0, '#040611', 0.55], [0.4, '#02030a', 0.95], [1, '#000000', 1]], { y1: 0, y2: 1 });
      H.make('rect', { x: 0, y: winY + winH - 6, width: W, height: HGT - (winY + winH - 6), fill: 'url(#' + floorId + ')' }, room);
      // 地板上的窗光（一块被雨打散的反光）
      var floorLight = A.rad(defs, pal.accent, [[0, 0.20], [0.6, 0.06], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: 650, rx: 560, ry: 90, fill: 'url(#' + floorLight + ')' }, room);

      // ---- 小电视 ----
      var tvX = 800, tvY = 654;
      var tvG = H.make('g', {}, room);
      // 电视光晕（先画在电视后面）
      var tvHalo = A.rad(defs, pal.accent2, [[0, 0.34], [0.45, 0.12], [1, 0]]);
      var tvHaloEl = H.make('circle', { cx: tvX, cy: tvY - 46, r: 210, fill: 'url(#' + tvHalo + ')' }, tvG);
      // 电视外壳
      H.make('rect', { x: tvX - 82, y: tvY - 96, width: 164, height: 96, rx: 10, fill: '#060912', stroke: H.rgba(pal.accent2, 0.35), 'stroke-width': 1.2 }, tvG);
      // 屏幕
      var tvScreenId = H.grad(defs, [
        [0, '#dceaff', 0.95], [0.45, pal.accent2, 0.85], [1, pal.accent, 0.55]
      ], { x1: 0, y1: 0, x2: 1, y2: 1 });
      var tvScreen = H.make('rect', { x: tvX - 64, y: tvY - 82, width: 128, height: 66, rx: 4, fill: 'url(#' + tvScreenId + ')', opacity: 0.85 }, tvG);
      var scan = H.make('g', {}, tvG);
      var scanLines = [];
      for (var sl = 0; sl < 5; sl++) {
        scanLines.push(H.make('rect', {
          x: tvX - 64, y: tvY - 82 + sl * 13, width: 128, height: 2,
          fill: '#dceaff', opacity: 0.18
        }, scan));
      }
      // 电视屏幕里的画面（抽象的两团光）
      H.make('circle', { cx: tvX - 18, cy: tvY - 52, r: 18, fill: '#ffffff', opacity: 0.35, filter: 'url(#' + softF + ')' }, tvG);
      H.make('circle', { cx: tvX + 24, cy: tvY - 42, r: 12, fill: '#eaf4ff', opacity: 0.3 }, tvG);
      // 天线 + 底座
      H.make('path', { d: 'M' + (tvX - 20) + ' ' + (tvY - 96) + ' L' + (tvX - 52) + ' ' + (tvY - 148), fill: 'none', stroke: H.rgba(pal.accent2, 0.5), 'stroke-width': 1.6 }, tvG);
      H.make('path', { d: 'M' + (tvX + 20) + ' ' + (tvY - 96) + ' L' + (tvX + 58) + ' ' + (tvY - 146), fill: 'none', stroke: H.rgba(pal.accent2, 0.5), 'stroke-width': 1.6 }, tvG);
      H.make('rect', { x: tvX - 92, y: tvY - 6, width: 184, height: 8, rx: 4, fill: '#05070f' }, tvG);
      // 电视光在地板上的倒影
      var tvPool = A.rad(defs, pal.accent2, [[0, 0.34], [0.5, 0.12], [1, 0]]);
      var tvPoolEl = H.make('ellipse', { cx: tvX, cy: tvY + 16, rx: 300, ry: 42, fill: 'url(#' + tvPool + ')' }, tvG);

      // ---- 两个人（坐在地上，侧影被电视照亮）----
      var leftP = A.person(room, {
        x: 566, y: 660, s: 2.05, pose: 'sit', rim: pal.accent2, color: '#04040c',
        rimOpacity: 0.8, flip: false, bob: 0.7
      });
      var rightP = A.person(room, {
        x: 1036, y: 660, s: 2.05, pose: 'sit', rim: pal.accent, color: '#04040c',
        rimOpacity: 0.75, flip: true, bob: 0.6
      });
      // 电视打在他们侧脸上的暖光
      var faceL = A.rad(defs, '#dceaff', [[0, 0.5], [1, 0]]);
      H.make('circle', { cx: 640, cy: 612, r: 60, fill: 'url(#' + faceL + ')' }, room);
      H.make('circle', { cx: 962, cy: 612, r: 60, fill: 'url(#' + faceL + ')' }, room);

      /* ================= 前景：更大的失焦雨滴 / 光尘 ================= */
      var front = H.make('g', {}, root);
      var fRand = H.rng(123);
      for (var f = 0; f < 7; f++) {
        var fx = 120 + fRand() * 1360;
        var fy = 200 + fRand() * 380;
        var fr = 12 + fRand() * 26;
        H.make('circle', {
          cx: fx, cy: fy, r: fr, fill: H.rgba(pal.accent2, 0.05),
          stroke: H.rgba(pal.accent2, 0.12), 'stroke-width': 2
        }, front);
        H.make('circle', { cx: fx - fr * 0.3, cy: fy - fr * 0.3, r: fr * 0.12, fill: '#eaf4ff', opacity: 0.12 }, front);
      }
      var dust = A.dust(root, {
        count: 28, seed: 55, x: [80, 1520], y: [160, 860], r: [0.8, 2.2],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.4
      });

      /* ================= 更新 ================= */
      var tvPulse = 0;
      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var enter = A.enter(t, dur, 0.34, 0.3);
          var e = H.clamp(t / dur, 0, 1);

          // 轻微推镜，越看越靠近
          var cam = 1.0 + 0.025 * H.E.inOutCubic(e);
          root.setAttribute('transform',
            'translate(800 430) scale(' + cam.toFixed(4) + ') translate(-800 -430)');
          root.setAttribute('opacity', (0.25 + 0.75 * enter).toFixed(3));

          // 窗外：雨 + bokeh（电视的呼吸带一点到窗外）
          rain.update(t);
          bokeh.update(t, pulse * 0.5);
          tvPulse = pulse;

          // 玻璃雨滴：缓慢明灭，偶尔一颗往下滑
          for (var i = 0; i < drops.length; i++) {
            var dp = drops[i];
            var tw = 0.55 + 0.45 * Math.sin(t * dp.sp + dp.ph);
            dp.rim.setAttribute('opacity', (dp.base * tw * (0.75 + 0.35 * pulse)).toFixed(3));
            dp.hi.setAttribute('opacity', (dp.base * tw * 0.9).toFixed(3));
          }
          for (var s = 0; s < streaks.length; s++) {
            var sk = streaks[s];
            var y = H.mod(t * sk.sp + sk.off, winH + 120) - 60;
            sk.el.setAttribute('transform', 'translate(0 ' + (winY + y).toFixed(1) + ')');
            sk.el.setAttribute('opacity', (0.22 + 0.2 * Math.abs(Math.sin(t * 0.7 + s))).toFixed(3));
          }

          // 电视的闪烁（安静场景里唯一的“亮”）
          var flick = 0.72 + 0.16 * Math.sin(t * 17.0) + 0.1 * Math.sin(t * 5.3) + 0.24 * pulse;
          tvScreen.setAttribute('opacity', H.clamp(flick, 0.45, 1).toFixed(3));
          tvHaloEl.setAttribute('opacity', (0.28 + 0.34 * pulse + 0.08 * Math.sin(t * 3.1)).toFixed(3));
          tvPoolEl.setAttribute('opacity', (0.2 + 0.3 * pulse).toFixed(3));
          var scanOff = H.mod(t * 46, 66);
          scan.setAttribute('transform', 'translate(0 ' + scanOff.toFixed(1) + ')');
          for (var sl2 = 0; sl2 < scanLines.length; sl2++) {
            scanLines[sl2].setAttribute('opacity', (0.05 + 0.16 * pulse).toFixed(3));
          }

          leftP.update(t, pulse * 0.7);
          rightP.update(t + 0.7, pulse * 0.7);

          dust.update(t, info.energy);
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
