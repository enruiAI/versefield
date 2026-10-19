/* =========================================================================
 * MOTIF m15 — 燃烧的心
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：心/燃烧/炙热/爱自己/心脏/火
 * ========================================================================= */
/* =========================================================================
 * s15 — 爱炙热的你却忘了爱自己  (47.00 – 52.80s / 5.8s · 结尾镜头)
 * 情绪：整首歌的最后一次心跳。一颗燃烧的霓虹心脏悬在画面中央，
 *      火焰从炽热橙红慢慢冷却成暗红与灰烬；两个人被它的光照着。
 *      最后 1.2s 收束留白：只剩余烬和心形轮廓。
 * 画面：燃烧心形（霓虹三层 + 火粒 + 光环）+ 下方两个剪影 + 冷灰收尾。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A, TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[14].palette;
      var dur = (scene && scene.dur) || TL.scenes[14].dur;
      var C = A.C;
      var cx = 800, cy = 312, hs = 168;
      var heartD = A.heartPath(cx, cy, hs);

      var root = H.make('g', {}, g);
      var world = H.make('g', {}, root);

      /* ---------------- 底层热光 ---------------- */
      var bgHeat = A.rad(defs, pal.accent, [[0, 0.34], [0.45, 0.12], [1, 0]]);
      var bgHeatEl = H.make('circle', { cx: cx, cy: cy + 20, r: 680, fill: 'url(#' + bgHeat + ')' }, world);
      var innerHeat = A.rad(defs, pal.accent2, [[0, 0.42], [0.45, 0.16], [1, 0]]);
      var innerHeatEl = H.make('circle', { cx: cx, cy: cy + 40, r: 330, fill: 'url(#' + innerHeat + ')' }, world);

      // 地面/下半部的暗（让心悬起来）
      var underDark = A.vgrad(defs, [[0, '#0a0407', 0], [1, '#050206', 0.85]], 's15b');
      H.make('rect', { x: 0, y: 560, width: W, height: 340, fill: 'url(#' + underDark + ')' }, world);

      // 背景余烬光斑
      A.bokeh(world, defs, {
        count: 8, seed: 151, x: [100, 1500], y: [140, 560], r: [30, 100],
        colors: [pal.accent, pal.accent2, C.ember], opacity: 0.16, blur: 20
      });

      /* ---------------- 心脏本体 ---------------- */
      var heartG = H.make('g', {}, world);

      // 外圈光晕（大心形，模糊）
      var halo = A.neon(heartG, defs, pal.accent2, {
        d: heartD, width: 16, glowOpacity: 0.34, blur: 14, inner: pal.accent2, opacity: 0.20
      });
      halo.inner.setAttribute('opacity', '0');

      // 火焰填充（径向渐变）
      var fireFillId = H.radial(defs, [
        [0, '#fff8de', 0.98], [0.26, '#ffd08a', 0.94], [0.52, '#ff7a3d', 0.82],
        [0.78, '#e0301e', 0.55], [1, '#8a1410', 0.15]
      ], { cx: 0.5, cy: 0.6, r: 0.66 });
      var fireFill = H.make('path', { d: heartD, fill: 'url(#' + fireFillId + ')', opacity: 0.55 }, heartG);

      // 核心热团
      var coreOrb = A.orb(heartG, defs, cx, cy + 34, 108, pal.accent2, { opacity: 0.75 });

      // 心形内部翻卷的火舌
      var tongues = [];
      var tongueDefs = [
        { x: cx - 96, w: 46, h: 150, ph: 0.0 },
        { x: cx - 34, w: 58, h: 205, ph: 1.3 },
        { x: cx + 30, w: 52, h: 180, ph: 2.4 },
        { x: cx + 92, w: 40, h: 140, ph: 3.6 },
        { x: cx - 8, w: 36, h: 120, ph: 5.1 }
      ];
      for (var tg = 0; tg < tongueDefs.length; tg++) {
        var td = tongueDefs[tg];
        var tongue = H.make('path', {
          d: 'M0 0 C' + (-td.w * 0.5) + ' ' + (-td.h * 0.28) + ' ' + (-td.w * 0.34) + ' ' + (-td.h * 0.66) + ' 0 ' + (-td.h) +
             ' C' + (td.w * 0.3) + ' ' + (-td.h * 0.66) + ' ' + (td.w * 0.52) + ' ' + (-td.h * 0.26) + ' 0 0 Z',
          fill: tg % 2 ? '#ffb36b' : '#ff7a3d', opacity: 0.4
        }, heartG);
        tongues.push({ el: tongue, x: td.x, y: cy + 128, ph: td.ph, h: td.h });
      }

      // 霓虹描边（外发光 + 主色 + 白色内芯）
      var neonMain = A.neon(heartG, defs, pal.accent, {
        d: heartD, width: 6.5, glowOpacity: 0.7, blur: 9, inner: '#fff2e8'
      });

      // 心脏内部的光丝（几条向上飘的细弧线）
      var veins = [];
      var vrand = H.rng(2611);
      for (var v = 0; v < 5; v++) {
        veins.push(H.make('path', {
          d: 'M' + (cx - 120 + v * 60) + ' ' + (cy + 120) + ' Q' + (cx - 150 + v * 76) + ' ' + (cy + 10) + ' ' + (cx - 60 + v * 42) + ' ' + (cy - 80),
          fill: 'none', stroke: v % 2 ? '#fff3cf' : pal.accent2,
          'stroke-width': 2 + vrand() * 1.6, 'stroke-linecap': 'round', opacity: 0.10
        }, heartG));
      }

      // 心外放射光（安静的光针）
      var rays = [];
      for (var ry = 0; ry < 12; ry++) {
        var ra = (ry / 12) * Math.PI * 2 + 0.1;
        var r1 = 250, r2 = 420 + (ry % 3) * 70;
        var ray = H.make('path', {
          d: 'M' + (cx + Math.cos(ra) * r1).toFixed(1) + ' ' + (cy + Math.sin(ra) * r1 * 0.92).toFixed(1) +
            ' L' + (cx + Math.cos(ra) * r2).toFixed(1) + ' ' + (cy + Math.sin(ra) * r2 * 0.92).toFixed(1),
          fill: 'none', stroke: ry % 2 ? pal.accent2 : pal.accent,
          'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.12
        }, heartG);
        rays.push({ el: ray, ang: ra });
      }

      /* ---------------- 火焰粒子（心形内部 + 上方） ---------------- */
      var flames = [];
      var frand = H.rng(7717);
      var hotCols = [C.white, pal.accent2, C.ember, pal.accent, '#ff7a3d'];
      for (var f = 0; f < 30; f++) {
        var fl = H.make('circle', {
          cx: cx, cy: cy, r: 2, fill: hotCols[Math.floor(frand() * hotCols.length)], opacity: 0
        }, heartG);
        flames.push({
          el: fl,
          bx: cx + (frand() - 0.5) * hs * 1.5,
          by: cy + 110 + frand() * 60,
          sp: 0.28 + frand() * 0.34,
          rise: 150 + frand() * 170,
          size: 2.4 + frand() * 5.2,
          ph: frand(),
          sway: 8 + frand() * 26
        });
      }
      // 掉落的火星
      var sparks = [];
      for (var s = 0; s < 14; s++) {
        var spEl = H.make('circle', { cx: cx, cy: cy, r: 1 + frand() * 1.8, fill: s % 3 ? pal.accent2 : C.ember, opacity: 0 }, world);
        sparks.push({
          el: spEl, x: cx + (frand() - 0.5) * hs * 1.4, y0: cy + 80 + frand() * 70,
          sp: 30 + frand() * 50, ph: frand(),
          drift: (frand() - 0.5) * 40
        });
      }
      // 冷却后的灰烬（在心形上方缓缓上升）
      var ashes = [];
      for (var a = 0; a < 16; a++) {
        var asEl = H.make('circle', {
          cx: 0, cy: 0, r: 1 + frand() * 2.2,
          fill: a % 3 === 0 ? '#c9b8b0' : '#8a7a76', opacity: 0
        }, world);
        ashes.push({
          el: asEl, x: cx + (frand() - 0.5) * hs * 2.1,
          y0: cy + 40 + frand() * 120,
          rise: 60 + frand() * 150, sp: 0.1 + frand() * 0.16,
          ph: frand(), drift: (frand() - 0.5) * 60
        });
      }

      /* ---------------- 被照亮的人 ---------------- */
      var peopleG = H.make('g', {}, world);
      var personHalos = [];
      var ppl = [];
      var pdefs = [
        { x: 660, y: 668, s: 0.98, flip: false, rim: pal.accent, glow: C.ember },
        { x: 946, y: 664, s: 0.9, flip: true, rim: pal.accent2, glow: pal.accent }
      ];
      for (var p = 0; p < pdefs.length; p++) {
        var pd = pdefs[p];
        var ph = A.rad(defs, pd.glow, [[0, 0.34], [0.5, 0.10], [1, 0]]);
        personHalos.push(H.make('ellipse', { cx: pd.x, cy: pd.y - 70, rx: 160, ry: 130, fill: 'url(#' + ph + ')' }, peopleG));
        var wrap = H.make('g', {}, peopleG);
        A.person(wrap, {
          x: 0, y: 0, s: 1, pose: p === 0 ? 'stand' : 'kneel',
          flip: pd.flip, rim: pd.rim, color: '#05030a', rimOpacity: 0.9
        });
        ppl.push({ wrap: wrap, x: pd.x, y: pd.y, s: pd.s, ph: p * 1.7 });
      }
      // 从心脏落向两个人的光柱
      var beamGrad = H.grad(defs, [[0, pal.accent2, 0.22], [0.6, pal.accent, 0.08], [1, pal.accent, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
      var beams = [];
      for (var b = 0; b < 2; b++) {
        var pd2 = pdefs[b];
        beams.push(H.make('polygon', {
          points: (cx - 90 + b * 120) + ',' + (cy + 130) + ' ' + (cx + 30 + b * 120) + ',' + (cy + 130) + ' ' +
            (pd2.x + 80) + ',' + (pd2.y + 6) + ' ' + (pd2.x - 80) + ',' + (pd2.y + 6),
          fill: 'url(#' + beamGrad + ')'
        }, world));
      }
      // 地面的暖反光
      var floorGlow = A.rad(defs, pal.accent, [[0, 0.22], [0.5, 0.07], [1, 0]]);
      H.make('ellipse', { cx: cx, cy: 672, rx: 420, ry: 46, fill: 'url(#' + floorGlow + ')' }, world);

      /* ---------------- 氛围 ---------------- */
      var dust = A.dust(world, {
        count: 26, seed: 313, x: [-40, 1640], y: [140, 720], r: [0.8, 2.4],
        colors: [pal.accent2, '#ffffff', pal.accent], opacity: 0.5
      });
      var ripple = A.ripple(world, defs, cx, cy + 40, pal.accent, {
        count: 3, r0: 190, r1: 420, width: 1.6, alpha: 0.5, period: 1.15
      });

      /* ---------------- 收尾压暗 ---------------- */
      var fade = H.make('rect', {
        x: 0, y: 0, width: W, height: HGT, fill: '#040206', opacity: 0, 'pointer-events': 'none'
      }, root);

      /* ---------------- HUD ---------------- */
      var hud = H.make('g', {}, root);
      var tag = A.tag(hud, ((scene && scene.tag) || '15 — LOVE YOURSELF'), 64, 196, pal.accent2, { size: 11, spacing: 7, opacity: 0.45 });
      var tagR = A.tag(hud, 'LAST  HEARTBEAT', 1536, 196, pal.accent, { size: 10, spacing: 5, opacity: 0.32, anchor: 'end' });
      var bpm = A.tag(hud, 'BPM  130  /  TEMP  41.5°C', 64, 214, pal.accent, { size: 9, spacing: 4, opacity: 0.26 });

      // 结尾专属的心跳包络
      function endBeat(t) {
        var q = H.clamp((t - 4.45) / 0.95, 0, 1);
        return Math.sin(Math.PI * q) * Math.sin(Math.PI * q);
      }

      return {
        update: function (t, info) {
          var pulse = info.pulse || 0;
          var energy = info.energy != null ? info.energy : 0.5;
          var enter = A.enter(t, dur, 0.5, 0.9);
          var e = H.clamp(t / dur, 0, 1);
          var cool = H.ramp(t, 3.6, 5.2, H.E.inOutSine);       // 冷却进度
          var ash = H.ramp(t, 4.0, 5.0, H.E.inOutSine);        // 灰烬出现
          var hot = 1 - cool;
          var endP = endBeat(t);
          var beat = 1 + 0.055 * (pulse * 0.9 + endP * 1.1);

          // 镜头：轻轻推近，最后停住
          var cam = 1 + 0.045 * H.E.outCubic(H.clamp(t / 3.4, 0, 1));
          world.setAttribute('transform',
            'translate(' + cx + ' ' + (cy + 120) + ') scale(' + cam.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy - 120) + ')');
          root.setAttribute('opacity', (0.3 + 0.7 * enter).toFixed(3));

          // 心脏整体随鼓点跳动
          heartG.setAttribute('transform',
            'translate(' + cx + ' ' + cy + ') scale(' + beat.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');

          // 底层热光随鼓点/冷却变化
          bgHeatEl.setAttribute('opacity', (0.55 + 0.35 * pulse - 0.3 * cool).toFixed(3));
          innerHeatEl.setAttribute('opacity', (0.5 + 0.4 * pulse - 0.34 * cool).toFixed(3));
          bgHeatEl.setAttribute('r', (680 + pulse * 22 + endP * 26).toFixed(1));

          // 心脏颜色随冷却变暗（炽红 → 暗红）
          var mainCol = H.mix(pal.accent, '#6e1612', cool * 0.72);
          var glowCol = H.mix(pal.accent, '#3a0c0a', cool * 0.8);
          var innerCol = H.mix('#fff2e8', '#a8403a', cool * 0.8);
          neonMain.core.setAttribute('stroke', mainCol);
          neonMain.glow.setAttribute('stroke', glowCol);
          neonMain.inner.setAttribute('stroke', innerCol);
          neonMain.glow.setAttribute('opacity', (0.5 + 0.35 * pulse - 0.3 * cool).toFixed(3));
          neonMain.core.setAttribute('opacity', 0.95);
          neonMain.inner.setAttribute('opacity', (0.85 - 0.4 * cool).toFixed(3));
          neonMain.glow.setAttribute('stroke-width', (6.5 * 3.4 * (1 - 0.3 * cool)).toFixed(2));

          halo.core.setAttribute('stroke', innerCol);
          halo.glow.setAttribute('stroke', glowCol);
          halo.core.setAttribute('opacity', (0.16 * hot + 0.05).toFixed(3));
          halo.glow.setAttribute('opacity', (0.3 * hot + 0.04 + pulse * 0.1).toFixed(3));

          fireFill.setAttribute('opacity', (0.34 + 0.3 * hot + 0.08 * pulse - 0.2 * cool).toFixed(3));
          coreOrb.setAttribute('opacity', (0.28 + 0.5 * hot - 0.18 * cool + 0.1 * pulse).toFixed(3));
          coreOrb.setAttribute('r', (108 + 14 * hot * (0.6 + pulse)).toFixed(1));

          // 火舌翻卷
          for (var tg2 = 0; tg2 < tongues.length; tg2++) {
            var tng = tongues[tg2];
            var wob = 1 + 0.18 * Math.sin(t * 3.1 + tng.ph);
            var ty = 1 + 0.12 * Math.cos(t * 2.4 + tng.ph);
            tng.el.setAttribute('transform',
              'translate(' + (tng.x + Math.sin(t * 1.8 + tng.ph) * 9).toFixed(1) + ' ' + tng.y.toFixed(1) +
              ') scale(' + wob.toFixed(3) + ' ' + ty.toFixed(3) + ')');
            tng.el.setAttribute('opacity', (hot * (0.3 + 0.2 * Math.sin(t * 2.7 + tng.ph))).toFixed(3));
          }

          // 光针：燃烧时慢慢转，冷却后收掉
          for (var r = 0; r < rays.length; r++) {
            rays[r].el.setAttribute('opacity', ((0.05 + 0.1 * hot) * (0.6 + 0.4 * Math.sin(t * 1.2 + r))).toFixed(3));
          }
          // 内部光丝
          for (var v = 0; v < veins.length; v++) {
            veins[v].setAttribute('opacity', ((0.06 + 0.08 * hot) * (0.6 + 0.4 * Math.sin(t * 1.7 + v * 1.2))).toFixed(3));
          }

          // 火粒：从心底向上窜
          for (var f = 0; f < flames.length; f++) {
            var fl = flames[f];
            var u = H.fract(fl.ph + t * fl.sp);
            var fx = fl.bx + Math.sin(t * 2.1 + f * 1.3) * fl.sway + u * 26 * (f % 2 ? 1 : -1);
            var fy = fl.by - u * fl.rise;
            fl.el.setAttribute('cx', fx.toFixed(1));
            fl.el.setAttribute('cy', fy.toFixed(1));
            fl.el.setAttribute('r', (fl.size * (0.5 + u * 0.9) * (1 - 0.35 * u)).toFixed(2));
            fl.el.setAttribute('opacity', (hot * Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.95).toFixed(3));
          }
          // 掉落的火星
          for (var s2 = 0; s2 < sparks.length; s2++) {
            var sp = sparks[s2];
            var u2 = H.fract(sp.ph + t * (sp.sp / 360));
            var sy = sp.y0 + u2 * u2 * 230;
            sp.el.setAttribute('cx', (sp.x + sp.drift * u2).toFixed(1));
            sp.el.setAttribute('cy', sy.toFixed(1));
            sp.el.setAttribute('opacity', (hot * (1 - u2) * 0.8).toFixed(3));
          }
          // 灰烬
          for (var a2 = 0; a2 < ashes.length; a2++) {
            var as = ashes[a2];
            var u3 = H.fract(as.ph + t * as.sp);
            as.el.setAttribute('cx', (as.x + as.drift * u3 + Math.sin(t * 0.8 + a2) * 8).toFixed(1));
            as.el.setAttribute('cy', (as.y0 - u3 * as.rise).toFixed(1));
            as.el.setAttribute('opacity', (ash * (0.25 + 0.35 * Math.sin(Math.PI * u3))).toFixed(3));
          }

          // 两个人：被心跳的光轻轻推着呼吸
          for (var p2 = 0; p2 < ppl.length; p2++) {
            var pp = ppl[p2];
            var bob = Math.sin(t * 1.1 + pp.ph) * 1.6 + pulse * 0.8;
            pp.wrap.setAttribute('transform',
              'translate(' + pp.x + ' ' + (pp.y + bob).toFixed(1) + ') scale(' + pp.s + ')');
            personHalos[p2].setAttribute('opacity', ((0.5 + 0.35 * pulse) * (0.65 + 0.35 * hot)).toFixed(3));
            beams[p2].setAttribute('opacity', ((0.5 + 0.2 * pulse) * (0.55 + 0.45 * hot)).toFixed(3));
          }

          // 光环与尘埃
          ripple.update(t, pulse);
          dust.update(t, energy);
          tag.setAttribute('opacity', (0.3 + pulse * 0.1).toFixed(2));
          tagR.setAttribute('opacity', (0.24 + pulse * 0.1).toFixed(2));
          bpm.textContent = 'BPM  130  /  TEMP  ' + (41.5 - 12 * cool).toFixed(1) + '°C';

          // 收束：最后 1.2s 压暗留白
          fade.setAttribute('opacity', (0.66 * H.ramp(t, 4.55, 5.75, H.E.inOutSine)).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
