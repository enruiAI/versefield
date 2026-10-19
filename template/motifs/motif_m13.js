/* =========================================================================
 * MOTIF m13 — 错位的两只钟
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：时差/时钟/错位/距离/晚/早
 * ========================================================================= */
/* =========================================================================
 * s13 — 我们的爱总有时差  (40.00 – 43.00s / 3.0s)
 * 情绪：同一段感情被劈成两半，一半还在深夜，一半已经天亮。
 * 画面：故障裂缝把画面分成左右：左边青色慢钟（23:59）与深夜城市，
 *      右边品红快钟（00:00）与清晨城市；裂缝有错位切片和噪点。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A, TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[12].palette;
      var dur = (scene && scene.dur) || TL.scenes[12].dur;
      var C = A.C;
      var cyan = pal.accent, pink = pal.accent2;
      var crackX = 800;

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);

      /* ---------------- 左右裁切 ---------------- */
      var lcId = H.uid('lclip');
      var lcp = H.make('clipPath', { id: lcId }, defs);
      H.make('rect', { x: 0, y: 0, width: crackX, height: HGT }, lcp);
      var rcId = H.uid('rclip');
      var rcp = H.make('clipPath', { id: rcId }, defs);
      H.make('rect', { x: crackX, y: 0, width: W - crackX, height: HGT }, rcp);

      var leftG = H.make('g', { 'clip-path': 'url(#' + lcId + ')' }, world);
      var rightG = H.make('g', { 'clip-path': 'url(#' + rcId + ')' }, world);

      /* ---------------- 左：深夜 ---------------- */
      var lsky = H.grad(defs, [
        [0, '#01060b'], [0.45, '#04202e'], [0.78, '#063444'], [1, '#041c26']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: 0, width: crackX, height: HGT, fill: 'url(#' + lsky + ')' }, leftG);
      var lglow = A.rad(defs, cyan, [[0, 0.32], [0.5, 0.10], [1, 0]]);
      H.make('circle', { cx: 400, cy: 350, r: 520, fill: 'url(#' + lglow + ')' }, leftG);
      // 月/冷光点
      H.make('circle', { cx: 250, cy: 150, r: 2.2, fill: '#ffffff', opacity: 0.8 }, leftG);
      H.make('circle', { cx: 328, cy: 108, r: 1.4, fill: cyan, opacity: 0.7 }, leftG);
      var lrand = H.rng(1301);
      for (var ls = 0; ls < 18; ls++) {
        H.make('circle', {
          cx: (30 + lrand() * 740).toFixed(1), cy: (40 + lrand() * 260).toFixed(1),
          r: (0.6 + lrand() * 1.4).toFixed(2), fill: ls % 4 === 0 ? cyan : '#ffffff',
          opacity: (0.2 + lrand() * 0.5).toFixed(2)
        }, leftG);
      }
      // 左城市剪影
      var lbase = 660;
      var lb = -30;
      while (lb < crackX + 40) {
        var lbw = 46 + lrand() * 78;
        var lbh = 60 + lrand() * 190;
        H.make('rect', { x: lb.toFixed(1), y: (lbase - lbh).toFixed(1), width: lbw.toFixed(1), height: (lbh + 260).toFixed(1), fill: '#02070c', opacity: 0.95 }, leftG);
        H.make('rect', { x: lb.toFixed(1), y: (lbase - lbh).toFixed(1), width: lbw.toFixed(1), height: 1.4, fill: cyan, opacity: 0.35 }, leftG);
        // 窗灯
        var lcN = 1 + Math.floor(lrand() * 3);
        for (var lw = 0; lw < lcN; lw++) {
          if (lrand() > 0.6) continue;
          H.make('rect', {
            x: (lb + 6 + lrand() * (lbw - 12)).toFixed(1),
            y: (lbase - lbh + 10 + lrand() * (lbh - 20)).toFixed(1),
            width: 2.2, height: 4, fill: cyan, opacity: 0.25 + lrand() * 0.4
          }, leftG);
        }
        lb += lbw + 6 + lrand() * 20;
      }
      H.make('ellipse', { cx: 400, cy: lbase, rx: 420, ry: 90, fill: 'url(#' + lglow + ')' }, leftG);

      /* ---------------- 右：清晨 ---------------- */
      var rsky = H.grad(defs, [
        [0, '#12040e'], [0.4, '#3a0a24'], [0.72, '#6a1440'], [1, '#2a0818']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: crackX, y: 0, width: W - crackX, height: HGT, fill: 'url(#' + rsky + ')' }, rightG);
      var rglow = A.rad(defs, pink, [[0, 0.36], [0.5, 0.12], [1, 0]]);
      H.make('circle', { cx: 1200, cy: 340, r: 540, fill: 'url(#' + rglow + ')' }, rightG);
      // 朝阳暖核（放在右上，避开钟面）
      var sunGlow = A.rad(defs, C.ember, [[0, 0.55], [0.4, 0.18], [1, 0]]);
      H.make('circle', { cx: 1320, cy: 178, r: 200, fill: 'url(#' + sunGlow + ')' }, rightG);
      H.make('circle', { cx: 1320, cy: 178, r: 44, fill: H.rgba('#fff0c8', 0.5) }, rightG);
      var rrand = H.rng(2707);
      var rbase = 660;
      var rb = crackX - 20;
      while (rb < W + 40) {
        var rbw = 44 + rrand() * 86;
        var rbh = 50 + rrand() * 200;
        H.make('rect', { x: rb.toFixed(1), y: (rbase - rbh).toFixed(1), width: rbw.toFixed(1), height: (rbh + 260).toFixed(1), fill: '#170610', opacity: 0.96 }, rightG);
        H.make('rect', { x: rb.toFixed(1), y: (rbase - rbh).toFixed(1), width: rbw.toFixed(1), height: 1.4, fill: pink, opacity: 0.4 }, rightG);
        var rcN = 1 + Math.floor(rrand() * 3);
        for (var rw = 0; rw < rcN; rw++) {
          if (rrand() > 0.55) continue;
          H.make('rect', {
            x: (rb + 6 + rrand() * (rbw - 12)).toFixed(1),
            y: (rbase - rbh + 10 + rrand() * (rbh - 20)).toFixed(1),
            width: 2.4, height: 4, fill: rrand() > 0.5 ? C.ember : pink, opacity: 0.3 + rrand() * 0.45
          }, rightG);
        }
        rb += rbw + 6 + rrand() * 20;
      }
      H.make('ellipse', { cx: 1200, cy: rbase, rx: 430, ry: 90, fill: 'url(#' + rglow + ')' }, rightG);

      /* ---------------- 钟表 ---------------- */
      function drawClock(parent, x, y, r, col, isFast) {
        H.make('circle', { cx: x, cy: y, r: r, fill: H.rgba('#02060b', 0.72) }, parent);
        var ring = A.ringEl(parent, defs, col, r, { width: 2.6, glowOpacity: 0.6, blur: 9, opacity: 0.95 });
        H.make('circle', { cx: x, cy: y, r: r - 12, fill: 'none', stroke: col, 'stroke-width': 0.8, opacity: 0.22 }, parent);
        // 刻度
        var dMin = '', dMaj = '';
        for (var i = 0; i < 60; i++) {
          var a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          var r1 = r - 6, r2 = i % 5 === 0 ? r - 24 : r - 12;
          dMin += 'M' + (x + Math.cos(a) * r1).toFixed(1) + ' ' + (y + Math.sin(a) * r1).toFixed(1) +
            ' L' + (x + Math.cos(a) * r2).toFixed(1) + ' ' + (y + Math.sin(a) * r2).toFixed(1) + ' ';
          if (i % 5 === 0) {
            dMaj += 'M' + (x + Math.cos(a) * (r - 4)).toFixed(1) + ' ' + (y + Math.sin(a) * (r - 4)).toFixed(1) +
              ' L' + (x + Math.cos(a) * (r - 30)).toFixed(1) + ' ' + (y + Math.sin(a) * (r - 30)).toFixed(1) + ' ';
          }
        }
        H.make('path', { d: dMin, fill: 'none', stroke: col, 'stroke-width': 0.8, opacity: 0.28 }, parent);
        H.make('path', { d: dMaj, fill: 'none', stroke: col, 'stroke-width': 1.8, opacity: 0.6 }, parent);

        var hour = H.make('line', {
          x1: x, y1: y, x2: x, y2: y - r * 0.46, stroke: col,
          'stroke-width': 5.4, 'stroke-linecap': 'round', opacity: 0.9
        }, parent);
        var minute = H.make('line', {
          x1: x, y1: y, x2: x, y2: y - r * 0.7, stroke: col,
          'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: 0.95
        }, parent);
        var second = H.make('line', {
          x1: x, y1: y - r * 0.1, x2: x, y2: y - r * 0.82, stroke: C.white,
          'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.8
        }, parent);
        // 时差残影（慢钟落后 / 快钟超前）
        var ghost = H.make('line', {
          x1: x, y1: y, x2: x, y2: y - r * 0.7, stroke: col,
          'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.22
        }, parent);
        H.make('circle', { cx: x, cy: y, r: 6, fill: col, opacity: 0.95 }, parent);
        H.make('circle', { cx: x, cy: y, r: 2.4, fill: '#ffffff' }, parent);
        return { hour: hour, minute: minute, second: second, ghost: ghost, x: x, y: y, r: r, fast: isFast };
      }
      var lclock = drawClock(leftG, 400, 360, 172, cyan, false);
      var rclock = drawClock(rightG, 1200, 360, 154, pink, true);

      // 表盘数字（12/3/6/9 用短文本）
      var lnums = H.make('g', {}, leftG);
      A.num(lnums, 12, 400, 218, cyan, { size: 15, opacity: 0.7 });
      A.num(lnums, 3, 534, 366, cyan, { size: 15, opacity: 0.7 });
      A.num(lnums, 6, 400, 514, cyan, { size: 15, opacity: 0.7 });
      A.num(lnums, 9, 266, 366, cyan, { size: 15, opacity: 0.7 });
      var rnums = H.make('g', {}, rightG);
      A.num(rnums, 12, 1200, 230, pink, { size: 14, opacity: 0.7 });
      A.num(rnums, 3, 1320, 366, pink, { size: 14, opacity: 0.7 });
      A.num(rnums, 6, 1200, 502, pink, { size: 14, opacity: 0.7 });
      A.num(rnums, 9, 1080, 366, pink, { size: 14, opacity: 0.7 });

      // 数字时间
      var ltime = A.tag(leftG, '23:59', 400, 592, cyan, { size: 34, spacing: 8, anchor: 'middle', weight: 700, opacity: 0.85 });
      var rtime = A.tag(rightG, '00:00', 1200, 580, pink, { size: 30, spacing: 8, anchor: 'middle', weight: 700, opacity: 0.85 });
      var llabel = A.tag(leftG, 'STILL LAST NIGHT', 400, 620, cyan, { size: 9.5, spacing: 5, anchor: 'middle', opacity: 0.4 });
      var rlabel = A.tag(rightG, 'ALREADY TOMORROW', 1200, 608, pink, { size: 9.5, spacing: 5, anchor: 'middle', opacity: 0.42 });

      /* ---------------- 中间的故障裂缝 ---------------- */
      var crand = H.rng(4103);
      var cd = 'M' + crackX + ' 60';
      var cy2 = 60, cxx = crackX;
      while (cy2 < 900) {
        cy2 += 34 + crand() * 46;
        cxx = crackX + (crand() - 0.5) * 34;
        cd += ' L' + cxx.toFixed(1) + ' ' + cy2.toFixed(1);
      }
      var crackGlow = H.make('path', {
        d: cd, fill: 'none', stroke: C.white, 'stroke-width': 7,
        opacity: 0.5, filter: 'url(#' + A.glowF(defs, 8) + ')'
      }, world);
      var crackCore = H.make('path', {
        d: cd, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.8, opacity: 0.85
      }, world);
      // 裂缝两侧的错位色边
      var edgeL = H.make('rect', { x: 0, y: 0, width: 3, height: HGT, fill: cyan, opacity: 0.5 }, world);
      var edgeR = H.make('rect', { x: 0, y: 0, width: 3, height: HGT, fill: pink, opacity: 0.5 }, world);

      /* ---------------- 故障切片 ---------------- */
      var slices = [];
      var slrand = H.rng(6619);
      for (var s = 0; s < 9; s++) {
        slices.push({
          el: H.make('rect', {
            x: 0, y: 0, width: 0, height: 0,
            fill: s % 2 ? pink : cyan, opacity: 0
          }, world),
          y: 130 + s * 58 + (s % 3) * 16,
          h: 2 + (s % 3) * 3,
          w: 260 + slrand() * 620,
          ph: slrand() * 6.283,
          sp: 0.9 + slrand() * 1.5
        });
      }
      var noises = [];
      var nrand2 = H.rng(7123);
      for (var n = 0; n < 22; n++) {
        noises.push(H.make('rect', {
          x: 0, y: 0, width: 2 + nrand2() * 30, height: 1.5 + nrand2() * 3,
          fill: nrand2() > 0.5 ? pink : cyan, opacity: 0
        }, world));
      }

      /* ---------------- 氛围 ---------------- */
      var dustL = A.dust(leftG, { count: 16, seed: 91, x: [40, 780], y: [120, 660], r: [0.8, 2], colors: ['#ffffff', cyan], opacity: 0.4 });
      var dustR = A.dust(rightG, { count: 16, seed: 17, x: [820, 1560], y: [120, 660], r: [0.8, 2], colors: ['#ffffff', pink, C.ember], opacity: 0.4 });
      A.bokeh(world, defs, {
        count: 6, seed: 55, x: [80, 1520], y: [150, 500], r: [40, 110],
        colors: [cyan, pink], opacity: 0.14, blur: 20
      });
      var rippleL = A.ripple(leftG, defs, 400, 360, cyan, { count: 2, r0: 180, r1: 300, width: 1.2, alpha: 0.4, period: 1.2 });
      var rippleR = A.ripple(rightG, defs, 1200, 360, pink, { count: 2, r0: 160, r1: 280, width: 1.2, alpha: 0.4, period: 0.8 });

      /* ---------------- HUD ---------------- */
      var hud = H.make('g', {}, root);
      var tag = A.tag(hud, ((scene && scene.tag) || '13 — OUT OF SYNC'), 64, 196, cyan, { size: 11, spacing: 7, opacity: 0.45 });
      var tagR = A.tag(hud, 'ΔT  =  00 : 00 : 01', 1536, 196, pink, { size: 10, spacing: 4, opacity: 0.42, anchor: 'end' });

      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var energy = info.energy != null ? info.energy : 0.5;
          var enter = A.enter(t, dur, 0.3, 0.3);
          var e = H.clamp(t / dur, 0, 1);
          world.setAttribute('opacity', (0.35 + 0.65 * enter).toFixed(3));
          // 极其轻微的镜头推近
          var cam = 1 + 0.02 * H.E.inOutCubic(e);
          world.setAttribute('transform',
            'translate(' + crackX + ' ' + 400 + ') scale(' + cam.toFixed(4) + ') translate(' + (-crackX) + ' -400)');

          // 钟表指针：左边慢、右边快（时差）
          var lh = 350 + t * 8;          // 慢钟：时针几乎不动
          var lm = 354 + t * 14;         // 分针慢
          var ls = t * 24;               // 秒针慢
          lclock.hour.setAttribute('transform', 'rotate(' + lh.toFixed(2) + ' ' + lclock.x + ' ' + lclock.y + ')');
          lclock.minute.setAttribute('transform', 'rotate(' + lm.toFixed(2) + ' ' + lclock.x + ' ' + lclock.y + ')');
          lclock.second.setAttribute('transform', 'rotate(' + ls.toFixed(2) + ' ' + lclock.x + ' ' + lclock.y + ')');
          lclock.ghost.setAttribute('transform', 'rotate(' + (lm - 9).toFixed(2) + ' ' + lclock.x + ' ' + lclock.y + ')');

          var rh = t * 46;               // 快钟：时针飞转
          var rm = t * 320;
          var rs = t * 780;
          rclock.hour.setAttribute('transform', 'rotate(' + rh.toFixed(2) + ' ' + rclock.x + ' ' + rclock.y + ')');
          rclock.minute.setAttribute('transform', 'rotate(' + rm.toFixed(2) + ' ' + rclock.x + ' ' + rclock.y + ')');
          rclock.second.setAttribute('transform', 'rotate(' + rs.toFixed(2) + ' ' + rclock.x + ' ' + rclock.y + ')');
          rclock.ghost.setAttribute('transform', 'rotate(' + (rm + 14).toFixed(2) + ' ' + rclock.x + ' ' + rclock.y + ')');

          // 钟面呼吸
          lclock.hour.setAttribute('opacity', (0.75 + pulse * 0.25).toFixed(2));
          rclock.hour.setAttribute('opacity', (0.75 + pulse * 0.25).toFixed(2));
          rippleL.update(t, pulse);
          rippleR.update(t + 0.3, pulse);

          // 裂缝抖动 + 色边错位
          var jit = Math.sin(t * 7.3) * 2.2 + pulse * 2;
          crackCore.setAttribute('transform', 'translate(' + jit.toFixed(2) + ' 0)');
          crackGlow.setAttribute('transform', 'translate(' + (jit * 1.6).toFixed(2) + ' 0)');
          crackGlow.setAttribute('opacity', (0.32 + pulse * 0.35).toFixed(3));
          edgeL.setAttribute('x', (crackX - 5 + Math.sin(t * 5.1) * 3).toFixed(1));
          edgeR.setAttribute('x', (crackX + 2 + Math.cos(t * 4.7) * 3).toFixed(1));
          edgeL.setAttribute('opacity', (0.35 + pulse * 0.3).toFixed(2));
          edgeR.setAttribute('opacity', (0.35 + pulse * 0.3).toFixed(2));

          // 故障切片：偶发横向错位条
          for (var s = 0; s < slices.length; s++) {
            var sl = slices[s];
            var on = H.fract(t * sl.sp + sl.ph);
            var flash = (on > 0.84) ? (0.22 + pulse * 0.3) : 0;
            sl.el.setAttribute('opacity', flash.toFixed(3));
            if (flash > 0) {
              sl.el.setAttribute('x', (crackX - sl.w / 2 + Math.sin(t * 27 + s * 1.9) * 140).toFixed(1));
              sl.el.setAttribute('y', sl.y);
              sl.el.setAttribute('width', sl.w.toFixed(1));
              sl.el.setAttribute('height', sl.h.toFixed(1));
            }
          }
          for (var n2 = 0; n2 < noises.length; n2++) {
            var on2 = H.fract(t * 3.1 + n2 * 0.29);
            var f2 = (on2 > 0.9) ? 0.3 : 0;
            noises[n2].setAttribute('opacity', f2.toFixed(2));
            if (f2 > 0) {
              noises[n2].setAttribute('x', (crackX - 80 + Math.sin(t * 31 + n2 * 2.3) * 120).toFixed(1));
              noises[n2].setAttribute('y', (150 + (n2 % 14) * 36).toFixed(1));
            }
          }

          dustL.update(t, energy);
          dustR.update(t, energy);
          tag.setAttribute('opacity', (0.32 + pulse * 0.12).toFixed(2));
          tagR.setAttribute('opacity', (0.3 + pulse * 0.14).toFixed(2));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
