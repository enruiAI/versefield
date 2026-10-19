/* =========================================================================
 * MOTIF m05 — 天台与拍立得
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：天台/城市夜/并肩/拍立得/回忆/取代
 * ========================================================================= */
/* =========================================================================
 * s05 — 有你在的日子里不可能被取代  (14.00 – 17.00s)
 * 情绪：霓虹都市的天台夜景。两个人并肩坐在栏杆上，背后是粉色/紫色的城市
 *       霓虹与一轮巨大的粉色月亮；四周漂浮着 5–6 张拍立得，每张里是一小团
 *       光斑记忆；两人头顶一颗小小的心形霓虹灯牌，随鼓点一跳一跳。
 *
 * 层次：远景粉色月亮/城市天际线 → 中景天台栏杆+两个剪影+心形灯牌
 *       → 近景漂浮拍立得/光尘/散景。HUD：05 — NO REPLACE
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[4].palette;
      var dur = (scene && scene.dur) || TL.scenes[4].dur;
      var C = A.C;
      var clamp = H.clamp, lerp = H.lerp;

      var world = H.make('g', {}, g);
      var RAIL_Y = 566;       // 栏杆高度
      var BASE_Y = 700;       // 城市地面 / 天台面

      /* ---------------- 夜空：粉紫渐变 ---------------- */
      var skyGrad = H.grad(defs, [
        [0, '#08030f'], [0.34, '#2a0a2a'], [0.62, '#5a1548'], [0.82, '#8a1f6a'], [1, '#2a0722']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + skyGrad + ')' }, world);

      // 粉色大月亮
      var moonGrad = H.radial(defs, [
        [0, '#fff0f8', 0.95], [0.42, pal.accent2, 0.85], [0.72, pal.accent, 0.55], [1, pal.accent, 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var moonHalo = H.make('circle', {
        cx: 1218, cy: 286, r: 330,
        fill: 'url(#' + A.rad(defs, pal.accent, [[0, 0.34], [0.5, 0.1], [1, 0]]) + ')'
      }, world);
      var moon = H.make('circle', { cx: 1218, cy: 286, r: 118, fill: 'url(#' + moonGrad + ')' }, world);
      H.make('circle', {
        cx: 1218, cy: 286, r: 128, fill: 'none', stroke: pal.accent2,
        'stroke-width': 1.2, opacity: 0.35
      }, world);
      // 月亮上很淡的环形山
      H.make('circle', { cx: 1176, cy: 250, r: 22, fill: pal.accent, opacity: 0.18 }, world);
      H.make('circle', { cx: 1252, cy: 320, r: 15, fill: pal.accent, opacity: 0.15 }, world);
      H.make('circle', { cx: 1206, cy: 350, r: 9, fill: pal.accent, opacity: 0.14 }, world);

      // 星
      var rand = H.rng(515);
      var stars = [];
      for (var i = 0; i < 36; i++) {
        stars.push(H.make('circle', {
          cx: (rand() * W).toFixed(1), cy: (30 + rand() * 380).toFixed(1),
          r: (0.6 + rand() * 1.5).toFixed(2),
          fill: i % 4 === 0 ? pal.accent2 : '#ffe8f6',
          opacity: (0.2 + rand() * 0.55).toFixed(2)
        }, world));
      }

      /* ---------------- 城市天际线（手绘，省节点） ---------------- */
      var cityRand = H.rng(812);
      var bld = [];
      var bx = -30;
      while (bx < 1640) {
        var bw = 54 + cityRand() * 92;
        var bh = 60 + cityRand() * 195;
        bld.push({ x: bx, w: bw, top: BASE_Y - bh });
        bx += bw + 4 + cityRand() * 18;
      }
      var cityD = 'M-30 ' + (BASE_Y + 60) + ' L-30 ' + bld[0].top;
      for (var b = 0; b < bld.length; b++) {
        cityD += ' L' + bld[b].x.toFixed(1) + ' ' + bld[b].top.toFixed(1) +
          ' L' + (bld[b].x + bld[b].w).toFixed(1) + ' ' + bld[b].top.toFixed(1);
      }
      cityD += ' L1640 ' + bld[bld.length - 1].top.toFixed(1) + ' L1640 ' + (BASE_Y + 60) + ' Z';
      H.make('path', { d: cityD, fill: '#0a0410', opacity: 0.97 }, world);
      // 楼顶霓虹边
      var neonTop = '';
      for (var b2 = 0; b2 < bld.length; b2++) {
        neonTop += 'M' + bld[b2].x.toFixed(1) + ' ' + bld[b2].top.toFixed(1) +
          ' L' + (bld[b2].x + bld[b2].w).toFixed(1) + ' ' + bld[b2].top.toFixed(1) + ' ';
      }
      H.make('path', {
        d: neonTop, fill: 'none', stroke: pal.accent, 'stroke-width': 1.4, opacity: 0.45
      }, world);
      // 窗灯
      var winRand = H.rng(33);
      var cityWins = [];
      for (var w = 0; w < 42; w++) {
        var bi = Math.floor(winRand() * bld.length);
        var bd = bld[bi];
        var wx = bd.x + 5 + winRand() * (bd.w - 10);
        var wy = bd.top + 8 + winRand() * (BASE_Y - bd.top - 14);
        cityWins.push(H.make('rect', {
          x: wx.toFixed(1), y: wy.toFixed(1), width: 2.4, height: 3.6,
          fill: w % 5 === 0 ? C.cyan : (w % 3 === 0 ? pal.accent2 : pal.accent),
          opacity: 0.45
        }, world));
      }
      // 楼顶霓虹招牌（竖条 + 圆点）
      var sign1 = H.make('rect', {
        x: 118, y: 470, width: 5, height: 96, fill: pal.accent2, opacity: 0.8,
        filter: 'url(#' + A.glowF(defs, 6) + ')'
      }, world);
      H.make('rect', { x: 136, y: 500, width: 4, height: 66, fill: C.cyan, opacity: 0.7 }, world);
      H.make('rect', { x: 1432, y: 520, width: 5, height: 80, fill: pal.accent, opacity: 0.75 }, world);
      H.make('circle', { cx: 1410, cy: 548, r: 4, fill: pal.accent2, opacity: 0.8 }, world);
      // 城市上方的雾光
      var cityHaze = H.make('ellipse', {
        cx: 800, cy: BASE_Y - 40, rx: 820, ry: 150,
        fill: 'url(#' + A.rad(defs, pal.accent, [[0, 0.26], [0.55, 0.08], [1, 0]]) + ')'
      }, world);
      // 城市升起的追光
      A.beam(world, defs, 330, BASE_Y - 10, 70, 300, pal.accent2, 0.12, 14);
      A.beam(world, defs, 1130, BASE_Y - 10, 60, 260, pal.accent, 0.1, -12);

      /* ---------------- 天台面 + 栏杆 ---------------- */
      var roofGrad = H.grad(defs, [
        [0, '#2a0a26'], [0.35, '#150614'], [1, '#050208']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: BASE_Y - 60, width: W, height: HGT - BASE_Y + 60, fill: 'url(#' + roofGrad + ')' }, world);
      // 天台面反光
      H.make('ellipse', {
        cx: 800, cy: BASE_Y - 40, rx: 560, ry: 70,
        fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.22], [0.5, 0.06], [1, 0]]) + ')'
      }, world);
      // 栏杆：横杆 + 立柱 + 霓虹下沿
      H.make('rect', { x: 470, y: RAIL_Y, width: 680, height: 9, rx: 4, fill: '#140718', opacity: 0.95 }, world);
      H.make('rect', { x: 470, y: RAIL_Y + 7, width: 680, height: 2, fill: pal.accent2, opacity: 0.6 }, world);
      var posts = [];
      for (var pt = 0; pt < 7; pt++) {
        posts.push(H.make('rect', {
          x: 490 + pt * 108, y: RAIL_Y + 8, width: 6, height: 66, fill: '#120616', opacity: 0.95
        }, world));
      }
      var railGlow = H.make('rect', {
        x: 470, y: RAIL_Y + 12, width: 680, height: 44,
        fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.22], [1, 0]]) + ')', opacity: 0.5
      }, world);

      /* ---------------- 两个人（并肩坐在栏杆上） ---------------- */
      var p1 = A.person(world, {
        x: 704, y: RAIL_Y + 42, s: 1.28, pose: 'sit', rim: pal.accent2,
        color: '#05030a', rimOpacity: 0.34
      });
      var p2 = A.person(world, {
        x: 886, y: RAIL_Y + 37, s: 1.24, pose: 'sit', rim: pal.accent,
        color: '#05030a', rimOpacity: 0.34
      });
      // 两人身后的暖光
      H.make('circle', {
        cx: 796, cy: 520, r: 150,
        fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.3], [0.5, 0.08], [1, 0]]) + ')'
      }, world);

      /* ---------------- 心形霓虹灯牌 ---------------- */
      var heartG = H.make('g', {}, world);
      var heartD = A.heartPath(800, 268, 32);
      var heart = A.neon(heartG, defs, pal.accent2, {
        d: heartD, width: 3.4, glowOpacity: 0.8, blur: 7, inner: '#ffffff'
      });
      H.make('path', { d: heartD, fill: pal.accent2, opacity: 0.14 }, heartG);
      // 吊线 + 钩
      H.make('path', {
        d: 'M800 148 L800 232 M788 148 L812 148',
        fill: 'none', stroke: '#3a1030', 'stroke-width': 2.2, opacity: 0.8
      }, world);
      // 灯牌底部的小光点
      H.make('circle', { cx: 800, cy: 232, r: 3, fill: '#ffffff', opacity: 0.85 }, world);

      /* ---------------- 漂浮拍立得（6 张，里面是抽象光斑记忆） ---------------- */
      var memA = H.radial(defs, [
        [0, '#fff3d8', 0.95], [0.35, C.gold, 0.65], [1, C.gold, 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var memB = H.radial(defs, [
        [0, '#ffffff', 0.9], [0.4, pal.accent2, 0.55], [1, pal.accent2, 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var memC = H.radial(defs, [
        [0, '#ffffff', 0.8], [0.4, C.cyan, 0.45], [1, C.cyan, 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var POLA = [
        [286, 372, 108, 128, -11, memA, 0.2],
        [452, 268, 84, 100, 8, memB, 0.6],
        [1312, 402, 96, 114, 12, memC, 0.35],
        [1160, 262, 78, 94, -7, memA, 0.9],
        [972, 178, 70, 84, 6, memB, 1.2],
        [612, 196, 74, 90, -5, memC, 0.0]
      ];
      var polaroids = [];
      for (var pi = 0; pi < POLA.length; pi++) {
        var pd = POLA[pi];
        var pg = H.make('g', {}, world);
        // 相纸
        H.make('rect', {
          x: -pd[2] / 2, y: -pd[3] / 2, width: pd[2], height: pd[3], rx: 4,
          fill: '#1a0d1c', stroke: '#fff0f8', 'stroke-width': 2.2, 'stroke-opacity': 0.8
        }, pg);
        // 记忆画面
        H.make('rect', {
          x: -pd[2] / 2 + 7, y: -pd[3] / 2 + 7, width: pd[2] - 14, height: pd[3] - 26,
          fill: '#0a0410'
        }, pg);
        H.make('circle', {
          cx: -pd[2] * 0.06, cy: -pd[3] * 0.08, r: pd[2] * 0.3,
          fill: 'url(#' + pd[5] + ')'
        }, pg);
        H.make('circle', {
          cx: pd[2] * 0.18, cy: pd[3] * 0.08, r: pd[2] * 0.12,
          fill: '#ffffff', opacity: 0.5
        }, pg);
        // 底部手写白边
        H.make('rect', {
          x: -pd[2] / 2 + 7, y: pd[3] / 2 - 15, width: pd[2] - 14, height: 1.4,
          fill: '#fff0f8', opacity: 0.35
        }, pg);
        polaroids.push({
          g: pg, x: pd[0], y: pd[1], rot: pd[4], delay: pd[6],
          amp: 6 + pi * 1.6, ph: pi * 1.37
        });
      }

      /* ---------------- 近景光尘 / 散景 ---------------- */
      var bokeh = A.bokeh(world, defs, {
        count: 9, seed: 9, x: [60, 1540], y: [120, 640], r: [24, 76],
        colors: [pal.accent, pal.accent2, C.gold], opacity: 0.16, blur: 24
      });
      var dust = A.dust(world, {
        count: 36, seed: 24, x: [40, 1560], y: [140, 820], r: [0.8, 2.4],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.6
      });

      /* ---------------- 收边 + HUD ---------------- */
      var vig = H.radial(defs, [
        [0, '#000000', 0], [0.6, '#000000', 0.14], [0.86, '#000000', 0.44], [1, '#000000', 0.68]
      ], { cx: 0.5, cy: 0.46, r: 0.8 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + vig + ')' }, world);
      var topFade = H.grad(defs, [
        [0, '#05020a', 0.72], [1, '#05020a', 0]
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: 0, width: W, height: 230, fill: 'url(#' + topFade + ')' }, g);

      var tag = A.tag(H.make('g', {}, g), ((scene && scene.tag) || '05 — NO REPLACE'), 64, 196, pal.accent2, {
        size: 11, spacing: 7, opacity: 0.45
      });
      A.num(H.make('g', {}, g), 5, 64, 226, pal.accent2, { size: 11, anchor: 'start', opacity: 0.3 });

      return {
        update: function (t, info) {
          var enter = A.enter(t, dur, 0.3, 0.22);
          var pulse = info.pulse || 0;
          var p = H.clamp(t / dur, 0, 1);

          // 轻推镜
          var cam = 1 + 0.03 * H.E.inOutSine(p);
          world.setAttribute('transform',
            'translate(800 430) scale(' + cam.toFixed(4) + ') translate(-800 -430)');
          world.setAttribute('opacity', (0.3 + 0.7 * enter).toFixed(3));

          // 月亮 / 城市呼吸
          moonHalo.setAttribute('opacity', (0.55 + 0.3 * pulse).toFixed(3));
          moonHalo.setAttribute('r', (320 + 18 * pulse).toFixed(1));
          moon.setAttribute('r', (116 + 3 * pulse).toFixed(1));
          cityHaze.setAttribute('opacity', (0.5 + 0.3 * pulse).toFixed(3));
          railGlow.setAttribute('opacity', (0.4 + 0.35 * pulse).toFixed(3));
          sign1.setAttribute('opacity', (0.55 + 0.4 * Math.abs(Math.sin(t * 3.1))).toFixed(2));

          // 星星闪烁
          for (var i = 0; i < stars.length; i++) {
            stars[i].setAttribute('opacity', (0.15 + 0.5 * Math.abs(Math.sin(t * 1.4 + i * 1.1))).toFixed(2));
          }
          // 窗灯呼吸（每几扇窗跳一下）
          for (var w2 = 0; w2 < cityWins.length; w2++) {
            cityWins[w2].setAttribute('opacity', (0.28 + 0.4 * Math.abs(Math.sin(t * 1.8 + w2 * 0.7))).toFixed(2));
          }

          // 两个人：轻微摇晃 + 拍点起伏
          p1.group.setAttribute('transform', 'translate(704 ' + (RAIL_Y + 42 - 2.2 * Math.sin(t * 1.5)).toFixed(1) + ') scale(1.28 1.28)');
          p2.group.setAttribute('transform', 'translate(886 ' + (RAIL_Y + 37 - 2.0 * Math.sin(t * 1.5 + 1.1)).toFixed(1) + ') scale(1.24 1.24)');
          p1.update(t, pulse);
          p2.update(t, pulse);

          // 心形灯牌：跟着鼓点一跳一跳
          var hb = 1 + 0.085 * pulse + 0.02 * Math.sin(t * 2.2);
          heartG.setAttribute('transform',
            'translate(800 268) scale(' + hb.toFixed(4) + ') translate(-800 -268)');
          heart.glow.setAttribute('opacity', (0.45 + 0.5 * pulse).toFixed(3));
          heart.core.setAttribute('opacity', (0.8 + 0.2 * pulse).toFixed(3));
          heart.inner.setAttribute('opacity', (0.7 + 0.3 * pulse).toFixed(3));

          // 拍立得：缓慢上浮 + 轻微倾斜
          for (var pi2 = 0; pi2 < polaroids.length; pi2++) {
            var po = polaroids[pi2];
            var inP = A.enter(t - po.delay, dur - po.delay, 0.35, 0.25);
            var px = po.x + Math.sin(t * 0.4 + po.ph) * po.amp;
            var py = po.y - t * 7 + Math.cos(t * 0.33 + po.ph) * po.amp * 0.8;
            var rot = po.rot + Math.sin(t * 0.3 + po.ph) * 3.2;
            po.g.setAttribute('transform',
              'translate(' + px.toFixed(1) + ' ' + py.toFixed(1) + ') rotate(' + rot.toFixed(2) + ')');
            po.g.setAttribute('opacity', (inP * (0.78 + 0.15 * Math.sin(t * 1.1 + po.ph))).toFixed(3));
          }

          bokeh.update(t, pulse * 0.7);
          dust.update(t, info.energy);
          tag.setAttribute('opacity', (0.3 + 0.16 * Math.sin(t * 1.5) + 0.12 * pulse).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
