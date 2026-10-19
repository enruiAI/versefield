/* =========================================================================
 * MOTIF m08 — 收集与淘汰的机器
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：收集/淘汰/快乐/删掉/整理/分类
 * ========================================================================= */
/* =========================================================================
 * s08 — 将快乐全都收集将不开心全都淘汰  (24.00 – 27.00s)
 * 情绪：DJ 版的“清空回收站”。左边把发光的小快乐一颗颗收进玻璃罐，
 *      右边把灰蓝色的不开心丢进霓虹黑洞里删掉。
 * 画面：收集漏斗 + 玻璃罐（液面上升 / 计数）+ 淘汰黑洞（旋转光轮 / 故障切片）。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[7].palette;
      var dur = (scene && scene.dur) || TL.scenes[7].dur;

      var root = H.make('g', {}, g);
      var glowF = A.glowF(defs, 8);

      /* ---------------- 两边的“机器”底座 ---------------- */
      H.make('rect', { x: 120, y: 780, width: 420, height: 3, fill: pal.accent, opacity: 0.35, filter: 'url(#' + glowF + ')' }, root);
      H.make('rect', { x: 1060, y: 780, width: 420, height: 3, fill: pal.accent2, opacity: 0.3, filter: 'url(#' + glowF + ')' }, root);

      /* ---------------- HUD 文字 ---------------- */
      var tagCollect = A.tag(root, 'COLLECT', 150, 232, pal.accent, { size: 14, spacing: 8, opacity: 0.8, weight: 700 });
      var tagDelete = A.tag(root, 'DELETE', 1460, 232, pal.accent2, { size: 14, spacing: 8, opacity: 0.8, weight: 700, anchor: 'end' });
      var numJoy = A.tag(root, '×0', 150, 262, pal.accent, { size: 20, spacing: 2, opacity: 0.9, weight: 700 });
      var numSad = A.tag(root, '×0', 1460, 262, pal.accent2, { size: 20, spacing: 2, opacity: 0.9, weight: 700, anchor: 'end' });

      /* ---------------- 左侧：漏斗 ---------------- */
      var funnelD = 'M150 300 L430 300 L392 348 L188 348 Z';
      A.neon(root, defs, pal.accent, { d: funnelD, width: 2.2, glowOpacity: 0.5 });
      H.make('rect', { x: 182, y: 348, width: 214, height: 2, fill: pal.accent, opacity: 0.5 }, root);
      H.make('path', {
        d: 'M188 348 L392 348 L340 430 L240 430 Z',
        fill: H.rgba(pal.accent, 0.06), stroke: H.rgba(pal.accent, 0.25), 'stroke-width': 1
      }, root);
      H.make('rect', { x: 262, y: 430, width: 116, height: 3, fill: pal.accent, opacity: 0.55 }, root);

      /* ---------------- 玻璃罐 ---------------- */
      var jarX = 226, jarY = 600, jarW = 200, jarH = 228;
      var jarInner = { x: jarX + 8, y: jarY + 8, w: jarW - 16, h: jarH - 18 };
      var clipId = H.uid('jarclip');
      var cp = H.make('clipPath', { id: clipId }, defs);
      H.make('rect', { x: jarInner.x, y: jarInner.y, width: jarInner.w, height: jarInner.h, rx: 18 }, cp);

      H.make('rect', {
        x: jarX, y: jarY, width: jarW, height: jarH, rx: 26,
        fill: H.rgba('#9ff3ff', 0.035), stroke: H.rgba(pal.accent2, 0.45), 'stroke-width': 1.6
      }, root);
      var liquidWrap = H.make('g', { 'clip-path': 'url(#' + clipId + ')' }, root);
      var liqGrad = H.grad(defs, [[0, pal.accent2, 0.95], [0.55, pal.accent, 0.85], [1, H.mix(pal.accent, '#ffffff', 0.2), 1]], { x1: 0, y1: 0, x2: 0, y2: 1 });
      var liquid = H.make('rect', {
        x: jarInner.x, y: jarInner.y + jarInner.h, width: jarInner.w, height: 0,
        fill: 'url(#' + liqGrad + ')', opacity: 0.85
      }, liquidWrap);
      var surface = H.make('ellipse', {
        cx: jarX + jarW / 2, cy: jarInner.y + jarInner.h, rx: jarInner.w / 2, ry: 7,
        fill: H.rgba('#ffffff', 0.55)
      }, liquidWrap);
      H.make('rect', { x: jarX + 18, y: jarY + 22, width: 5, height: 120, rx: 3, fill: H.rgba('#ffffff', 0.20) }, root);
      H.make('rect', { x: jarX + jarW - 23, y: jarY + 22, width: 5, height: 120, rx: 3, fill: H.rgba('#ffffff', 0.10) }, root);
      for (var tk = 1; tk <= 3; tk++) {
        H.make('rect', { x: jarX + jarW - 34, y: jarY + 34 + tk * 48, width: 12, height: 1.4, fill: H.rgba('#ffffff', 0.22) }, root);
      }
      var jarGlow = A.rad(defs, pal.accent, [[0, 0.35], [1, 0]]);
      H.make('ellipse', { cx: jarX + jarW / 2, cy: jarY + jarH + 6, rx: 150, ry: 26, fill: 'url(#' + jarGlow + ')' }, root);

      /* ---------------- 光球渐变（复用） ---------------- */
      var orbRand = H.rng(19);
      var joyGradId = H.radial(defs, [[0, '#ffffff', 0.98], [0.3, pal.accent2, 0.9], [0.66, pal.accent, 0.4], [1, pal.accent, 0]], { cx: 0.5, cy: 0.5, r: 0.5 });
      var sadGradId = H.radial(defs, [[0, '#ffffff', 0.85], [0.32, '#9fb6d8', 0.7], [0.7, '#5b6f8f', 0.3], [1, '#5b6f8f', 0]], { cx: 0.5, cy: 0.5, r: 0.5 });

      var JOY_N = 9;
      var joys = [];
      for (var j = 0; j < JOY_N; j++) {
        var el = H.make('circle', { cx: 0, cy: 0, r: 8, fill: 'url(#' + joyGradId + ')', opacity: 0 }, root);
        joys.push({
          el: el, t0: 0.10 + j * 0.235, dur: 0.55,
          sx: 310 + (orbRand() - 0.5) * 80, sy: 438,
          sway: (orbRand() - 0.5) * 70,
          r: 8 + orbRand() * 5, landed: false
        });
      }
      var joyCount = 0;
      var collected = [];
      for (var c = 0; c < JOY_N; c++) {
        collected.push(H.make('circle', {
          cx: (jarX + 30 + (c % 4) * 44 + (c > 3 ? 16 : 0)).toFixed(1),
          cy: (jarY + jarH - 22 - Math.floor(c / 4) * 34).toFixed(1),
          r: (4.5 + (c % 3) * 1.6).toFixed(1), fill: 'url(#' + joyGradId + ')', opacity: 0
        }, root));
      }

      /* ---------------- 淘汰：不开心 → 黑洞 ---------------- */
      var SAD_N = 8;
      var sadPortal = { x: 1250, y: 640, r: 108 };
      var sads = [];
      for (var s = 0; s < SAD_N; s++) {
        var se = H.make('circle', { cx: 0, cy: 0, r: 10, fill: 'url(#' + sadGradId + ')', opacity: 0 }, root);
        sads.push({
          el: se, t0: 0.16 + s * 0.23, dur: 0.85,
          sx: sadPortal.x + (orbRand() - 0.5) * 390,
          sy: 170 + orbRand() * 80,
          r: 9 + orbRand() * 6, done: false
        });
      }
      var sadCount = 0;

      /* ---------------- 右侧：霓虹黑洞 ---------------- */
      var portalWrap = H.make('g', {}, root);
      var portalGlow = A.rad(defs, pal.accent2, [[0, 0.55], [0.55, 0.18], [1, 0]]);
      H.make('circle', { cx: sadPortal.x, cy: sadPortal.y, r: 230, fill: 'url(#' + portalGlow + ')' }, portalWrap);
      H.make('circle', { cx: sadPortal.x, cy: sadPortal.y, r: sadPortal.r, fill: '#030209', opacity: 0.98 }, portalWrap);
      var wheel = H.make('g', {}, portalWrap);
      H.make('circle', {
        cx: sadPortal.x, cy: sadPortal.y, r: sadPortal.r, fill: 'none', stroke: pal.accent2,
        'stroke-width': 2.4, 'stroke-dasharray': '26 14', opacity: 0.75, filter: 'url(#' + glowF + ')'
      }, wheel);
      H.make('circle', {
        cx: sadPortal.x, cy: sadPortal.y, r: sadPortal.r - 18, fill: 'none', stroke: pal.accent,
        'stroke-width': 1.2, 'stroke-dasharray': '4 10', opacity: 0.55
      }, wheel);
      var swirl = H.make('g', {}, portalWrap);
      for (var v = 0; v < 4; v++) {
        H.make('ellipse', {
          cx: sadPortal.x, cy: sadPortal.y, rx: 84 - v * 16, ry: 30 - v * 6,
          fill: 'none', stroke: pal.accent2, 'stroke-width': 1, opacity: 0.18 + v * 0.05,
          transform: 'rotate(' + (v * 43) + ' ' + sadPortal.x + ' ' + sadPortal.y + ')'
        }, swirl);
      }
      var glitches = [];
      for (var gb = 0; gb < 5; gb++) {
        glitches.push(H.make('rect', {
          x: sadPortal.x - 128, y: sadPortal.y - 70 + gb * 32, width: 256, height: 3 + (gb % 2) * 2,
          fill: gb % 2 ? pal.accent2 : pal.accent, opacity: 0
        }, portalWrap));
      }
      var portalDust = A.dust(portalWrap, {
        count: 22, seed: 55, x: [sadPortal.x - 150, sadPortal.x + 150], y: [sadPortal.y - 150, sadPortal.y + 120],
        r: [0.8, 2], colors: [pal.accent2, '#ffffff', pal.accent], opacity: 0.6
      });

      /* ---------------- 数据流小光点 ---------------- */
      var flowDots = [];
      for (var f = 0; f < 18; f++) {
        flowDots.push(H.make('circle', { cx: 0, cy: 0, r: 1.6 + (f % 3) * 0.6, fill: pal.accent2, opacity: 0 }, root));
      }

      var jarRipple = A.ripple(root, defs, jarX + jarW / 2, jarY + 12, pal.accent, { count: 2, r0: 40, r1: 130, width: 1.4, alpha: 0.8 });
      var sparkle = A.dust(root, {
        count: 34, seed: 7, x: [120, 520], y: [480, 830], r: [0.8, 2.2],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.55
      });

      return {
        update: function (t, info) {
          var enter = A.enter(t, dur, 0.22, 0.16);
          root.setAttribute('opacity', (0.4 + 0.6 * enter).toFixed(3));
          var pulse = info.pulse || 0;

          var b = 1 + pulse * 0.012;
          portalWrap.setAttribute('transform', 'translate(' + sadPortal.x + ' ' + sadPortal.y + ') scale(' + b.toFixed(4) + ') translate(' + (-sadPortal.x) + ' ' + (-sadPortal.y) + ')');
          wheel.setAttribute('transform', 'rotate(' + (t * 46).toFixed(1) + ' ' + sadPortal.x + ' ' + sadPortal.y + ')');
          swirl.setAttribute('transform', 'rotate(' + (-t * 26).toFixed(1) + ' ' + sadPortal.x + ' ' + sadPortal.y + ')');
          for (var gi = 0; gi < glitches.length; gi++) {
            var on = Math.sin(t * (13 + gi * 3.1) + gi * 2) > 0.55 ? 0.5 : 0;
            glitches[gi].setAttribute('opacity', on.toFixed(2));
            glitches[gi].setAttribute('x', (sadPortal.x - 128 + Math.sin(t * 21 + gi) * 14).toFixed(1));
          }

          /* ---- 收集 ---- */
          var landedNow = 0;
          for (var i = 0; i < joys.length; i++) {
            var o = joys[i];
            var p = H.clamp((t - o.t0) / o.dur, 0, 1);
            if (t < o.t0) { o.el.setAttribute('opacity', '0'); continue; }
            if (p >= 1) {
              o.el.setAttribute('opacity', '0');
              if (!o.landed) { o.landed = true; joyCount++; landedNow++; }
              continue;
            }
            var e = H.E.inOutCubic(p);
            var x = H.lerp(o.sx, jarX + jarW / 2, e) + Math.sin(p * Math.PI) * o.sway;
            var y = H.lerp(o.sy, jarY + 26, Math.pow(e, 1.5));
            var rad = o.r * (1 - p * 0.35);
            o.el.setAttribute('cx', x.toFixed(1));
            o.el.setAttribute('cy', y.toFixed(1));
            o.el.setAttribute('r', rad.toFixed(2));
            o.el.setAttribute('opacity', (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, p * 1.15))).toFixed(3));
          }
          var fillP = 0.16 + (joyCount / JOY_N) * 0.68;
          var liqH = jarInner.h * fillP;
          liquid.setAttribute('height', liqH.toFixed(1));
          liquid.setAttribute('y', (jarInner.y + jarInner.h - liqH).toFixed(1));
          var sy = jarInner.y + jarInner.h - liqH;
          surface.setAttribute('cy', (sy + Math.sin(t * 5.4) * 1.6).toFixed(1));
          surface.setAttribute('opacity', (0.35 + pulse * 0.3).toFixed(2));
          for (var ci = 0; ci < collected.length; ci++) {
            collected[ci].setAttribute('opacity', ci < joyCount ? '0.95' : '0');
          }
          numJoy.textContent = '×' + (joyCount < 10 ? '0' : '') + joyCount;

          /* ---- 淘汰 ---- */
          for (var si = 0; si < sads.length; si++) {
            var so = sads[si];
            var sp = H.clamp((t - so.t0) / so.dur, 0, 1);
            if (t < so.t0) { so.el.setAttribute('opacity', '0'); continue; }
            if (sp >= 1) {
              so.el.setAttribute('opacity', '0');
              if (!so.done) { so.done = true; sadCount++; }
              continue;
            }
            var se2 = Math.pow(sp, 1.6);
            var sx2 = H.lerp(so.sx, sadPortal.x, se2);
            var sy2 = H.lerp(so.sy, sadPortal.y, Math.pow(sp, 2.1));
            var sr2 = so.r * (1 - Math.pow(sp, 3) * 0.7);
            so.el.setAttribute('cx', sx2.toFixed(1));
            so.el.setAttribute('cy', sy2.toFixed(1));
            so.el.setAttribute('r', sr2.toFixed(2));
            so.el.setAttribute('opacity', (0.85 * (1 - Math.pow(sp, 2.4))).toFixed(3));
          }
          numSad.textContent = '×' + (sadCount < 10 ? '0' : '') + sadCount;

          for (var fi = 0; fi < flowDots.length; fi++) {
            var fp = H.fract(t * 0.55 + fi / flowDots.length);
            var fx = 560 + fp * 420;
            var fy = 300 + Math.sin(fp * Math.PI) * 30;
            flowDots[fi].setAttribute('cx', fx.toFixed(1));
            flowDots[fi].setAttribute('cy', fy.toFixed(1));
            flowDots[fi].setAttribute('opacity', (Math.sin(Math.PI * fp) * 0.35).toFixed(3));
          }

          portalDust.update(t, info.energy);
          sparkle.update(t, info.energy);
          jarRipple.update(t, pulse);

          if (landedNow > 0) jarRipple.group.setAttribute('data-hi', String(t));
          var since = t - parseFloat(jarRipple.group.getAttribute('data-hi') || '-9');
          var hi = since < 0.25 ? (1 - since / 0.25) : 0;
          tagCollect.setAttribute('opacity', (0.55 + 0.35 * (pulse + hi * 0.6)).toFixed(2));
          tagDelete.setAttribute('opacity', (0.55 + 0.35 * pulse).toFixed(2));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
