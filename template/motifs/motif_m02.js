/* =========================================================================
 * MOTIF m02 — 玻璃星球小世界
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：小世界/愿望/星球/玻璃/城市/祈愿
 * ========================================================================= */
/* =========================================================================
 * s02 — 祈愿小世界里不只有挫败  (3.00 – 6.00s)
 * 情绪：一颗很轻的玻璃星球悬在深紫夜空里，球内是一座小小的霓虹城市和
 *       一棵发光的小树，像谁把愿望装进了玻璃球。歌声上来时球壳出现裂纹，
 *       裂开、漏光，又在句尾慢慢愈合。流星划过，祈愿光带绕星球旋转。
 *
 * 层次：远景星海/星云/远处城市灯火 → 中景玻璃星球（球内迷你城市+小树）
 *       → 近景晶尘/光斑/流星。HUD：02 — LITTLE WORLD
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[1].palette;
      var dur = (scene && scene.dur) || TL.scenes[1].dur;
      var C = A.C;
      var clamp = H.clamp, lerp = H.lerp;

      var SX = 800, SY = 372, SR = 196;

      /* ---------------- 整屏氛围：深紫夜空 + 星云 ---------------- */
      var world = H.make('g', {}, g);
      var deepp = H.radial(defs, [
        [0, H.mix(pal.bg3, '#000000', 0.2), 0.55],
        [0.5, pal.bg2, 0.35],
        [1, '#05020c', 0.6]
      ], { cx: 0.5, cy: 0.44, r: 0.72 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + deepp + ')' }, world);

      // 星云（克制一点，别把对比度吃掉）
      var nebA = A.rad(defs, pal.accent, [[0, 0.16], [0.45, 0.05], [1, 0]]);
      var nebB = A.rad(defs, pal.accent2, [[0, 0.12], [0.5, 0.035], [1, 0]]);
      H.make('ellipse', { cx: 980, cy: 250, rx: 520, ry: 210, fill: 'url(#' + nebA + ')', transform: 'rotate(-14 980 250)' }, world);
      H.make('ellipse', { cx: 500, cy: 470, rx: 440, ry: 170, fill: 'url(#' + nebB + ')', transform: 'rotate(9 500 470)', opacity: 0.8 }, world);
      H.make('ellipse', { cx: 1280, cy: 560, rx: 360, ry: 130, fill: 'url(#' + nebA + ')', opacity: 0.6 }, world);

      // 星海
      var rand = H.rng(202);
      var stars = [];
      for (var i = 0; i < 64; i++) {
        var sx = rand() * W;
        var sy = rand() * 620 + 20;
        var sr = 0.6 + rand() * 1.8;
        var sb = 0.25 + rand() * 0.65;
        var st = H.make('circle', {
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: sr.toFixed(2),
          fill: i % 6 === 0 ? pal.accent2 : (i % 4 === 0 ? C.cyan : '#ffffff'),
          opacity: sb.toFixed(3)
        }, world);
        stars.push({ el: st, base: sb, sp: 0.7 + rand() * 2.4, ph: rand() * 6.283 });
      }
      // 远处地平线的一层雾光（让星球有“悬浮在夜之上”的空间），底部压暗
      var horizonGlow = A.rad(defs, pal.accent2, [[0, 0.22], [0.5, 0.06], [1, 0]]);
      H.make('ellipse', { cx: 800, cy: 648, rx: 780, ry: 120, fill: 'url(#' + horizonGlow + ')' }, world);
      H.make('ellipse', { cx: 800, cy: 700, rx: 560, ry: 66, fill: 'url(#' + horizonGlow + ')', opacity: 0.5 }, world);

      // 大颗失焦光斑（远近景深）
      var bokehBack = A.bokeh(world, defs, {
        count: 9, seed: 41, x: [80, 1520], y: [60, 500], r: [26, 90],
        colors: [pal.accent, pal.accent2, C.violet], opacity: 0.22, blur: 24
      });
      var bokehFront = A.bokeh(world, defs, {
        count: 7, seed: 77, x: [60, 1540], y: [430, 760], r: [30, 110],
        colors: [pal.accent2, C.pink, C.cyan], opacity: 0.16, blur: 24
      });

      /* ---------------- 玻璃星球 ---------------- */
      var sphereG = H.make('g', {}, world);
      var haloGrad = H.radial(defs, [
        [0, pal.accent2, 0.30], [0.35, pal.accent, 0.18], [0.7, pal.accent, 0.05], [1, pal.accent, 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var halo = H.make('circle', { cx: SX, cy: SY, r: SR * 2.05, fill: 'url(#' + haloGrad + ')' }, sphereG);
      var halo2 = H.make('circle', { cx: SX, cy: SY, r: SR * 1.35, fill: 'url(#' + haloGrad + ')', opacity: 0.7 }, sphereG);

      // 玻璃球体（半透明深色 + 边缘暗）
      var glassGrad = H.radial(defs, [
        [0, '#9fd9ff', 0.10], [0.5, '#5f6bff', 0.10], [0.8, '#241048', 0.5], [1, '#07030f', 0.9]
      ], { cx: 0.36, cy: 0.28, r: 0.78 });
      H.make('circle', { cx: SX, cy: SY, r: SR, fill: 'url(#' + glassGrad + ')' }, sphereG);

      // 球内世界（裁剪到球体）
      var clipId = H.uid('s02sphere');
      var cp = H.make('clipPath', { id: clipId }, defs);
      H.make('circle', { cx: SX, cy: SY, r: SR - 3 }, cp);
      var inside = H.make('g', { 'clip-path': 'url(#' + clipId + ')' }, sphereG);

      // 球内夜空
      var skyIn = H.grad(defs, [
        [0, '#0b0826'], [0.42, '#241248'], [0.72, '#4a1f7a'], [1, '#1a0c33']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: SX - SR, y: SY - SR, width: SR * 2, height: SR * 2, fill: 'url(#' + skyIn + ')' }, inside);
      // 球内上层空气光
      var inSkyGlow = A.rad(defs, C.cyan, [[0, 0.18], [0.55, 0.05], [1, 0]]);
      H.make('ellipse', { cx: SX, cy: SY - 92, rx: 152, ry: 88, fill: 'url(#' + inSkyGlow + ')' }, inside);
      // 球内星星
      var inRand = H.rng(88);
      var innerStars = [];
      for (var si = 0; si < 26; si++) {
        var isx = SX - SR + 22 + inRand() * (SR * 2 - 44);
        var isy = SY - SR + 16 + inRand() * (SR * 1.1);
        innerStars.push(H.make('circle', {
          cx: isx.toFixed(1), cy: isy.toFixed(1), r: (0.6 + inRand() * 1.5).toFixed(2),
          fill: inRand() > 0.6 ? pal.accent2 : '#ffffff',
          opacity: (0.3 + inRand() * 0.6).toFixed(2)
        }, inside));
      }

      // 球内地面（弧形地平线 + 微光；底部渐隐，避免球底一大块死黑）
      var groundY = SY + 74;
      var groundGrad = H.grad(defs, [
        [0, '#2a1550', 0.96], [0.4, '#150c2c', 0.9], [0.75, '#0a0518', 0.55], [1, '#07030f', 0]
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('path', {
        d: 'M' + (SX - SR) + ' ' + (groundY + 34) + ' Q' + SX + ' ' + (groundY - 30) + ' ' + (SX + SR) + ' ' + (groundY + 34) +
          ' L' + (SX + SR) + ' ' + (SY + SR) + ' L' + (SX - SR) + ' ' + (SY + SR) + ' Z',
        fill: 'url(#' + groundGrad + ')'
      }, inside);
      H.make('path', {
        d: 'M' + (SX - SR) + ' ' + (groundY + 34) + ' Q' + SX + ' ' + (groundY - 30) + ' ' + (SX + SR) + ' ' + (groundY + 34),
        fill: 'none', stroke: pal.accent, 'stroke-width': 1.6, opacity: 0.65
      }, inside);
      var groundGlow = A.rad(defs, pal.accent, [[0, 0.4], [0.6, 0.12], [1, 0]]);
      H.make('ellipse', { cx: SX, cy: groundY + 26, rx: 150, ry: 40, fill: 'url(#' + groundGlow + ')' }, inside);

      // 迷你城市剪影（手工路径，窗户光点）
      var miniCity = 'M' + (SX - 132) + ' ' + (groundY + 14) +
        ' L' + (SX - 132) + ' ' + (groundY - 12) + ' L' + (SX - 112) + ' ' + (groundY - 12) +
        ' L' + (SX - 112) + ' ' + (groundY - 34) + ' L' + (SX - 92) + ' ' + (groundY - 34) +
        ' L' + (SX - 92) + ' ' + (groundY - 8) + ' L' + (SX - 66) + ' ' + (groundY - 8) +
        ' L' + (SX - 66) + ' ' + (groundY - 44) + ' L' + (SX - 44) + ' ' + (groundY - 44) +
        ' L' + (SX - 44) + ' ' + (groundY - 16) + ' L' + (SX - 22) + ' ' + (groundY - 16) +
        ' L' + (SX - 22) + ' ' + (groundY - 28) + ' L' + (SX - 2) + ' ' + (groundY - 28) +
        ' L' + (SX - 2) + ' ' + (groundY - 4) + ' L' + (SX + 24) + ' ' + (groundY - 4) +
        ' L' + (SX + 24) + ' ' + (groundY - 40) + ' L' + (SX + 46) + ' ' + (groundY - 40) +
        ' L' + (SX + 46) + ' ' + (groundY - 10) + ' L' + (SX + 74) + ' ' + (groundY - 10) +
        ' L' + (SX + 74) + ' ' + (groundY - 32) + ' L' + (SX + 96) + ' ' + (groundY - 32) +
        ' L' + (SX + 96) + ' ' + (groundY + 14) + ' Z';
      H.make('path', { d: miniCity, fill: '#100a26', opacity: 0.98 }, inside);
      // 城市霓虹窗 + 楼顶灯
      var winRand = H.rng(55);
      var miniWins = [];
      for (var wi = 0; wi < 22; wi++) {
        var wx = SX - 128 + winRand() * 224;
        var wy = groundY - 36 + winRand() * 40;
        miniWins.push(H.make('rect', {
          x: wx.toFixed(1), y: wy.toFixed(1), width: 1.8, height: 3,
          fill: wi % 3 === 0 ? C.cyan : (wi % 3 === 1 ? pal.accent2 : C.mint),
          opacity: 0.7
        }, inside));
      }
      // 楼顶的霓虹点（城市轮廓更清楚）
      var roofLights = [];
      var ROOFS = [[-112, -12], [-66, -44], [-22, -28], [46, -40], [96, -32]];
      for (var rl = 0; rl < ROOFS.length; rl++) {
        roofLights.push(H.make('circle', {
          cx: (SX + ROOFS[rl][0]).toFixed(1), cy: (groundY + ROOFS[rl][1] - 2).toFixed(1),
          r: 2.1, fill: rl % 2 ? pal.accent2 : C.cyan, opacity: 0.85
        }, inside));
      }
      // 天线
      H.make('path', {
        d: 'M' + (SX + 48) + ' ' + (groundY - 40) + ' L' + (SX + 48) + ' ' + (groundY - 58) +
          ' M' + (SX - 30) + ' ' + (groundY - 28) + ' L' + (SX - 30) + ' ' + (groundY - 46),
        fill: 'none', stroke: pal.accent2, 'stroke-width': 1.4, opacity: 0.55
      }, inside);
      // 城市霓虹街线
      H.make('rect', { x: SX - 122, y: groundY + 3, width: 248, height: 1.6, fill: pal.accent2, opacity: 0.55 }, inside);
      // 城市上空两片霓虹招牌
      H.make('rect', { x: SX + 30, y: groundY - 62, width: 3, height: 24, fill: pal.accent2, opacity: 0.55 }, inside);
      H.make('rect', { x: SX - 108, y: groundY - 52, width: 2.4, height: 18, fill: C.cyan, opacity: 0.5 }, inside);

      // 发光小树（在左侧，树冠是霓虹光团）
      var treeX = SX - 74, treeY = groundY + 8;
      H.make('path', {
        d: 'M' + treeX + ' ' + treeY + ' C' + (treeX - 4) + ' ' + (treeY - 26) + ' ' + (treeX + 2) + ' ' + (treeY - 44) + ' ' + (treeX - 2) + ' ' + (treeY - 62),
        fill: 'none', stroke: '#2a1a4a', 'stroke-width': 4, 'stroke-linecap': 'round'
      }, inside);
      H.make('path', {
        d: 'M' + treeX + ' ' + (treeY - 30) + ' L' + (treeX - 18) + ' ' + (treeY - 46) +
          ' M' + treeX + ' ' + (treeY - 38) + ' L' + (treeX + 16) + ' ' + (treeY - 52) +
          ' M' + treeX + ' ' + (treeY - 50) + ' L' + (treeX - 12) + ' ' + (treeY - 64) +
          ' M' + treeX + ' ' + (treeY - 54) + ' L' + (treeX + 12) + ' ' + (treeY - 66),
        fill: 'none', stroke: '#2a1a4a', 'stroke-width': 2.4, 'stroke-linecap': 'round'
      }, inside);
      var leafGrad = H.radial(defs, [
        [0, '#ffffff', 0.95], [0.3, C.mint, 0.8], [0.7, C.cyan, 0.25], [1, C.cyan, 0]
      ], { cx: 0.5, cy: 0.5, r: 0.5 });
      var LEAVES = [[-2, -66, 26], [-20, -50, 18], [16, -56, 20], [-8, -44, 15], [10, -42, 13]];
      var leaves = [];
      for (var li = 0; li < LEAVES.length; li++) {
        leaves.push(H.make('circle', {
          cx: (treeX + LEAVES[li][0]).toFixed(1), cy: (treeY + LEAVES[li][1]).toFixed(1),
          r: LEAVES[li][2], fill: 'url(#' + leafGrad + ')'
        }, inside));
      }
      // 树冠坠下的光点
      var treeDots = [];
      for (var td = 0; td < 8; td++) {
        treeDots.push(H.make('circle', {
          cx: (treeX + (td % 4) * 12 - 18).toFixed(1), cy: (treeY - 20 + (td % 3) * 10).toFixed(1),
          r: 1.4, fill: '#ffffff', opacity: 0.6
        }, inside));
      }
      // 球内的雾光（贴地平线的暖光，让球内世界有空气感）
      var inHaze = A.rad(defs, pal.accent2, [[0, 0.22], [0.55, 0.07], [1, 0]]);
      H.make('ellipse', { cx: SX, cy: groundY + 10, rx: 170, ry: 70, fill: 'url(#' + inHaze + ')' }, inside);

      // 球体边缘高光 + 玻璃反光
      H.make('circle', { cx: SX, cy: SY, r: SR, fill: 'none', stroke: pal.accent, 'stroke-width': 1.4, opacity: 0.5 }, sphereG);
      H.make('path', {
        d: 'M' + (SX - SR * 0.94) + ' ' + (SY + SR * 0.24) +
          ' A' + (SR * 0.94) + ' ' + (SR * 0.96) + ' 0 0 1 ' + (SX + SR * 0.2) + ' ' + (SY - SR * 0.94),
        fill: 'none', stroke: '#e8f2ff', 'stroke-width': 2.2, opacity: 0.5,
        filter: 'url(#' + A.glowF(defs, 6) + ')'
      }, sphereG);
      H.make('ellipse', {
        cx: SX - 62, cy: SY - 92, rx: 62, ry: 26, fill: '#ffffff', opacity: 0.10,
        transform: 'rotate(-28 ' + (SX - 62) + ' ' + (SY - 92) + ')'
      }, sphereG);
      H.make('ellipse', {
        cx: SX - 74, cy: SY - 84, rx: 22, ry: 8, fill: '#ffffff', opacity: 0.16,
        transform: 'rotate(-28 ' + (SX - 74) + ' ' + (SY - 84) + ')'
      }, sphereG);

      // 球体表面裂纹（裂开 → 漏光 → 愈合）
      var crackG = H.make('g', { filter: 'url(#' + A.glowF(defs, 6) + ')' }, sphereG);
      var CRACKS = [
        'M' + (SX - 150) + ' ' + (SY - 96) + ' L' + (SX - 108) + ' ' + (SY - 70) + ' L' + (SX - 118) + ' ' + (SY - 34) + ' L' + (SX - 78) + ' ' + (SY - 8),
        'M' + (SX + 132) + ' ' + (SY - 120) + ' L' + (SX + 96) + ' ' + (SY - 88) + ' L' + (SX + 112) + ' ' + (SY - 52) + ' L' + (SX + 82) + ' ' + (SY - 20),
        'M' + (SX - 96) + ' ' + (SY + 118) + ' L' + (SX - 62) + ' ' + (SY + 88) + ' L' + (SX - 74) + ' ' + (SY + 52),
        'M' + (SX + 118) + ' ' + (SY + 86) + ' L' + (SX + 80) + ' ' + (SY + 62) + ' L' + (SX + 92) + ' ' + (SY + 30)
      ];
      var cracks = [];
      for (var ci2 = 0; ci2 < CRACKS.length; ci2++) {
        var cEl = H.make('path', {
          d: CRACKS[ci2], fill: 'none', stroke: ci2 % 2 ? '#ffffff' : pal.accent2,
          'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0,
          'stroke-dasharray': '260', 'stroke-dashoffset': '260'
        }, crackG);
        cracks.push(cEl);
      }
      // 裂纹里漏出的光
      var leak = H.make('circle', {
        cx: SX - 96, cy: SY - 22, r: 70,
        fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 0.85], [0.42, 0.22], [1, 0]]) + ')', opacity: 0
      }, sphereG);
      var leak2 = H.make('circle', {
        cx: SX + 96, cy: SY - 40, r: 52,
        fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.6], [0.45, 0.16], [1, 0]]) + ')', opacity: 0
      }, sphereG);

      // 祈愿光带：两圈细椭圆 + 五个愿光小球，绕星球缓慢旋转
      var bandG = H.make('g', {}, world);
      var band1 = H.make('ellipse', {
        cx: SX, cy: SY, rx: SR * 1.52, ry: SR * 0.46, fill: 'none',
        stroke: pal.accent2, 'stroke-width': 1.6, 'stroke-dasharray': '3 11',
        opacity: 0.55, transform: 'rotate(-13 ' + SX + ' ' + SY + ')'
      }, bandG);
      var band2 = H.make('ellipse', {
        cx: SX, cy: SY, rx: SR * 1.36, ry: SR * 0.4, fill: 'none',
        stroke: C.cyan, 'stroke-width': 1.1, opacity: 0.4,
        transform: 'rotate(6 ' + SX + ' ' + SY + ')'
      }, bandG);
      var orbGrad = A.rad(defs, pal.accent2, [[0, 1], [0.3, 0.6], [1, 0]]);
      var wishOrbs = [];
      for (var oi = 0; oi < 5; oi++) {
        wishOrbs.push(H.make('circle', {
          cx: SX, cy: SY, r: 4.2, fill: 'url(#' + orbGrad + ')', opacity: 0.9
        }, world));
      }

      // 流星
      var meteor = H.make('g', { opacity: 0 }, world);
      var mgrad = H.grad(defs, [[0, '#ffffff', 0.95], [0.4, pal.accent2, 0.55], [1, pal.accent2, 0]], { x1: 1, y1: 1, x2: 0, y2: 0 });
      H.make('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: 'url(#' + mgrad + ')', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, meteor);
      H.make('circle', { cx: 0, cy: 0, r: 2.6, fill: '#ffffff' }, meteor);

      // 近景晶尘
      var dust = A.dust(world, {
        count: 46, seed: 63, x: [70, 1530], y: [130, 840], r: [0.8, 2.6],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.65
      });

      // 飘在星球外的晶体碎片（前后景各两片，增加景深与霓虹感）
      var shardA = A.rad(defs, pal.accent2, [[0, 0.5], [0.5, 0.12], [1, 0]]);
      var SHARDS = [
        [548, 246, 15, -18, 0.8], [1082, 300, 19, 22, 0.75], [618, 556, 22, 12, 0.7], [1016, 590, 16, -24, 0.65]
      ];
      for (var sh = 0; sh < SHARDS.length; sh++) {
        var sd = SHARDS[sh];
        var shg = H.make('g', { transform: 'translate(' + sd[0] + ' ' + sd[1] + ') rotate(' + sd[3] + ')', opacity: sd[4] }, world);
        H.make('circle', { cx: 0, cy: 0, r: sd[2] * 2.6, fill: 'url(#' + shardA + ')' }, shg);
        H.make('path', {
          d: 'M0 ' + (-sd[2]) + ' L' + (sd[2] * 0.62) + ' 0 L0 ' + (sd[2] * 0.9) + ' L' + (-sd[2] * 0.58) + ' 0 Z',
          fill: 'rgba(255,255,255,0.22)', stroke: pal.accent2, 'stroke-width': 1.2, 'stroke-opacity': 0.7
        }, shg);
      }
      // 前景失焦晶尘（贴镜头）
      A.bokeh(world, defs, {
        count: 5, seed: 153, x: [40, 360], y: [560, 860], r: [40, 90],
        colors: [pal.accent2, C.pink], opacity: 0.13, blur: 24
      });
      var flashEl = H.make('circle', {
        cx: SX, cy: SY, r: SR * 1.5, fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 0.5], [0.5, 0.14], [1, 0]]) + ')', opacity: 0
      }, world);

      // 收边：暗角 + 顶部压暗，把主体对比度提上来
      var vig = H.radial(defs, [
        [0, '#000000', 0], [0.6, '#000000', 0.16], [0.85, '#000000', 0.48], [1, '#000000', 0.8]
      ], { cx: 0.5, cy: 0.46, r: 0.8 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + vig + ')' }, g);
      var topFade = H.grad(defs, [
        [0, '#04020a', 0.72], [1, '#04020a', 0]
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: 0, width: W, height: 230, fill: 'url(#' + topFade + ')' }, g);

      // HUD
      var tag = A.tag(H.make('g', {}, g), ((scene && scene.tag) || '02 — LITTLE WORLD'), 64, 196, pal.accent2, {
        size: 11, spacing: 7, opacity: 0.42
      });
      A.num(H.make('g', {}, g), 2, 64, 226, pal.accent2, { size: 11, anchor: 'start', opacity: 0.3 });

      return {
        update: function (t, info) {
          var enter = A.enter(t, dur, 0.32, 0.22);
          var pulse = info.pulse || 0;
          var p = H.clamp(t / dur, 0, 1);

          // 缓慢推近 + 入场
          var cam = 1 + 0.035 * H.E.outCubic(p);
          world.setAttribute('transform',
            'translate(' + SX + ' ' + (SY + 40) + ') scale(' + cam.toFixed(4) + ') translate(' + (-SX) + ' ' + (-(SY + 40)) + ')');
          world.setAttribute('opacity', (0.25 + 0.75 * enter).toFixed(3));

          // 星球呼吸 + 拍点
          var sPulse = 1 + 0.014 * pulse;
          sphereG.setAttribute('transform',
            'translate(' + SX + ' ' + SY + ') scale(' + sPulse.toFixed(4) + ') translate(' + (-SX) + ' ' + (-SY) + ')');
          halo.setAttribute('opacity', (0.55 + 0.3 * pulse).toFixed(3));
          halo2.setAttribute('r', (SR * (1.32 + 0.04 * pulse + 0.02 * Math.sin(t * 1.3))).toFixed(1));

          // 星海闪烁
          for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.el.setAttribute('opacity', (s.base * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph))).toFixed(3));
          }
          // 球内星星
          for (var is = 0; is < innerStars.length; is++) {
            innerStars[is].setAttribute('opacity', (0.35 + 0.4 * Math.abs(Math.sin(t * 1.4 + is * 0.9))).toFixed(2));
          }
          // 城市窗灯（球内）
          for (var wv = 0; wv < miniWins.length; wv++) {
            miniWins[wv].setAttribute('opacity', (0.5 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.1 + wv * 1.7))).toFixed(2));
          }
          // 楼顶霓虹点闪烁
          for (var rl2 = 0; rl2 < roofLights.length; rl2++) {
            roofLights[rl2].setAttribute('opacity', (0.45 + 0.45 * Math.abs(Math.sin(t * 2.4 + rl2 * 1.9))).toFixed(2));
          }
          // 小树光团呼吸
          for (var lf = 0; lf < leaves.length; lf++) {
            leaves[lf].setAttribute('opacity', (0.55 + 0.3 * Math.sin(t * 1.8 + lf * 1.3) + 0.15 * pulse).toFixed(3));
          }
          for (var tdi = 0; tdi < treeDots.length; tdi++) {
            treeDots[tdi].setAttribute('opacity', (0.25 + 0.5 * Math.abs(Math.sin(t * 2.6 + tdi))).toFixed(2));
          }

          /* ---- 裂纹：0.55s 裂开，2.0s 后愈合 ---- */
          var openP = H.E.outCubic(H.clamp((t - 0.5) / 0.55, 0, 1));
          var healP = H.E.inOutCubic(H.clamp((t - 2.02) / 0.6, 0, 1));
          var crackP = openP * (1 - healP);
          for (var c = 0; c < cracks.length; c++) {
            var el = cracks[c];
            el.setAttribute('stroke-dashoffset', (260 * (1 - crackP)).toFixed(1));
            el.setAttribute('opacity', (crackP * (0.5 + 0.5 * pulse)).toFixed(3));
            el.setAttribute('stroke-width', (1.2 + 1.8 * crackP).toFixed(2));
          }
          var leakK = crackP * (0.5 + 0.5 * pulse);
          leak.setAttribute('opacity', (leakK * 0.7).toFixed(3));
          leak2.setAttribute('opacity', (leakK * 0.5).toFixed(3));

          // 祈愿光带旋转 + 愿光小球
          bandG.setAttribute('transform', 'rotate(' + (t * 9).toFixed(2) + ' ' + SX + ' ' + SY + ')');
          band1.setAttribute('opacity', (0.4 + 0.35 * pulse + 0.1 * enter).toFixed(3));
          band2.setAttribute('opacity', (0.24 + 0.3 * pulse).toFixed(3));
          for (var o = 0; o < wishOrbs.length; o++) {
            var ang = t * 0.5 + o * Math.PI * 2 / wishOrbs.length;
            var ox = SX + Math.cos(ang) * SR * 1.5;
            var oy = SY + Math.sin(ang) * SR * 0.46 - 8;
            wishOrbs[o].setAttribute('cx', ox.toFixed(1));
            wishOrbs[o].setAttribute('cy', oy.toFixed(1));
            wishOrbs[o].setAttribute('r', (4.2 + 1.8 * (0.5 + 0.5 * Math.sin(t * 3 + o)) + pulse * 1.6).toFixed(2));
            wishOrbs[o].setAttribute('opacity', (0.5 + 0.45 * Math.abs(Math.sin(t * 2.1 + o * 1.7))).toFixed(2));
          }

          // 流星：0.62 – 1.5s
          var mp = H.clamp((t - 0.62) / 0.88, 0, 1);
          if (mp > 0 && mp < 1) {
            var mx = lerp(1480, 900, mp);
            var my = lerp(120, 330, mp);
            meteor.setAttribute('opacity', (Math.sin(Math.PI * mp) * 0.95).toFixed(3));
            meteor.setAttribute('transform', 'translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')');
            var line = meteor.firstChild;
            line.setAttribute('x1', (-lerp(110, 55, mp)).toFixed(1));
            line.setAttribute('y1', (-lerp(42, 22, mp)).toFixed(1));
            line.setAttribute('x2', '0');
            line.setAttribute('y2', '0');
          } else {
            meteor.setAttribute('opacity', '0');
          }

          // 结尾亮一下
          var endK = Math.exp(-Math.pow((t - (dur - 0.42)) / 0.2, 2));
          flashEl.setAttribute('opacity', (endK * 0.55 + pulse * 0.07).toFixed(3));

          bokehBack.update(t, pulse * 0.6);
          bokehFront.update(t, pulse * 0.4);
          dust.update(t, info.energy);
          tag.setAttribute('opacity', (0.3 + 0.14 * Math.sin(t * 1.5)).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
