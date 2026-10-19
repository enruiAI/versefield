/* =========================================================================
 * MOTIF m03 — 地平线升起的光
 * 可复用场景模板（scaffold 会复制到具体槽位并注入 scene 配置：
 *   scene.id / scene.index / scene.start / scene.end / scene.dur
 *   scene.lyric / scene.sub / scene.tag / scene.palette
 * 关键词：光/希望/遇见/日出/天亮/照亮
 * ========================================================================= */
/* =========================================================================
 * s03 — 直到遇见你我以为就光明起来  (6.00 – 10.00s)
 * 情绪：从 70% 的暗，到整片画面被暖金光照亮。地平线上升起一颗巨大的霓虹
 *       太阳/光核，放射光铺满画面；左右两个剪影从两边走向中央相遇，
 *       相遇的一瞬间光波扩散，暗幕被彻底推开。
 *
 * 层次：远景夜空/云层 → 中景巨大光核+放射光+地平线城市 → 近景两个剪影/光尘
 *       HUD：03 — FIRST LIGHT
 * ========================================================================= */
(function (global) {
  'use strict';
  var SCENES = global.SCENES = global.SCENES || {};

  SCENES.__SCENE_ID__ = {
    build: function (g, defs, H, W, HGT, scene) {
      var A = global.A;
      var TL = global.TL;
      var pal = (scene && scene.palette) || TL.scenes[2].palette;
      var dur = (scene && scene.dur) || TL.scenes[2].dur;
      var C = A.C;
      var clamp = H.clamp, lerp = H.lerp;

      var HZ = 566;              // 地平线
      var SUN = { x: 800, y: 500 }; // 光核（会随上升动画改 y）

      var world = H.make('g', {}, g);

      /* ---------------- 夜空底（被光逐渐照亮） ---------------- */
      var nightGrad = H.grad(defs, [
        [0, '#05040c'], [0.45, '#120b1e'], [0.72, '#2a1622'], [1, '#0a060e']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + nightGrad + ')' }, world);

      // 星（被照亮后淡出）
      var rand = H.rng(707);
      var stars = [];
      for (var i = 0; i < 44; i++) {
        var sx = rand() * W;
        var sy = 40 + rand() * 400;
        stars.push(H.make('circle', {
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: (0.6 + rand() * 1.6).toFixed(2),
          fill: i % 5 === 0 ? pal.accent2 : '#dfe8ff',
          opacity: (0.2 + rand() * 0.6).toFixed(2)
        }, world));
      }

      /* ---------------- 地平线以上：云层 ---------------- */
      var cloudA = A.rad(defs, pal.accent, [[0, 0.34], [0.5, 0.10], [1, 0]]);
      var cloudB = A.rad(defs, pal.accent2, [[0, 0.26], [0.5, 0.08], [1, 0]]);
      var clouds = [];
      var CLOUD = [
        [520, 430, 620, 96, -6, cloudA, 0.55],
        [1080, 470, 700, 110, 4, cloudA, 0.5],
        [760, 520, 880, 90, 0, cloudB, 0.55],
        [300, 496, 480, 74, -3, cloudB, 0.4],
        [1320, 400, 460, 80, 6, cloudA, 0.35]
      ];
      for (var ci = 0; ci < CLOUD.length; ci++) {
        var cd = CLOUD[ci];
        clouds.push(H.make('ellipse', {
          cx: cd[0], cy: cd[1], rx: cd[2], ry: cd[3], fill: 'url(#' + cd[5] + ')',
          opacity: cd[6], transform: 'rotate(' + cd[4] + ' ' + cd[0] + ' ' + cd[1] + ')'
        }, world));
      }

      /* ---------------- 地平线城市剪影（逆光） ---------------- */
      var cityD = 'M0 ' + HZ + ' L0 ' + (HZ - 16) + ' L44 ' + (HZ - 16) + ' L52 ' + (HZ - 40) + ' L96 ' + (HZ - 40) +
        ' L104 ' + (HZ - 18) + ' L150 ' + (HZ - 18) + ' L158 ' + (HZ - 58) + ' L196 ' + (HZ - 58) +
        ' L202 ' + (HZ - 20) + ' L258 ' + (HZ - 20) + ' L264 ' + (HZ - 44) + ' L310 ' + (HZ - 44) +
        ' L316 ' + (HZ - 14) + ' L372 ' + (HZ - 14) + ' L378 ' + (HZ - 52) + ' L420 ' + (HZ - 52) +
        ' L426 ' + (HZ - 22) + ' L486 ' + (HZ - 22) + ' L492 ' + (HZ - 36) + ' L540 ' + (HZ - 36) +
        ' L546 ' + (HZ - 12) + ' L604 ' + (HZ - 12) + ' L610 ' + (HZ - 30) + ' L660 ' + (HZ - 30) +
        ' L666 ' + (HZ - 18) + ' L730 ' + (HZ - 18) + ' L736 ' + (HZ - 46) + ' L778 ' + (HZ - 46) +
        ' L784 ' + (HZ - 14) + ' L840 ' + (HZ - 14) + ' L846 ' + (HZ - 38) + ' L894 ' + (HZ - 38) +
        ' L900 ' + (HZ - 18) + ' L960 ' + (HZ - 18) + ' L966 ' + (HZ - 50) + ' L1010 ' + (HZ - 50) +
        ' L1016 ' + (HZ - 16) + ' L1074 ' + (HZ - 16) + ' L1080 ' + (HZ - 42) + ' L1128 ' + (HZ - 42) +
        ' L1134 ' + (HZ - 20) + ' L1196 ' + (HZ - 20) + ' L1202 ' + (HZ - 34) + ' L1256 ' + (HZ - 34) +
        ' L1262 ' + (HZ - 12) + ' L1322 ' + (HZ - 12) + ' L1328 ' + (HZ - 48) + ' L1372 ' + (HZ - 48) +
        ' L1378 ' + (HZ - 22) + ' L1440 ' + (HZ - 22) + ' L1446 ' + (HZ - 40) + ' L1496 ' + (HZ - 40) +
        ' L1502 ' + (HZ - 16) + ' L1562 ' + (HZ - 16) + ' L1568 ' + (HZ - 34) + ' L1600 ' + (HZ - 34) +
        ' L1600 ' + (HZ + 40) + ' L0 ' + (HZ + 40) + ' Z';
      H.make('path', { d: cityD, fill: '#0b0714', opacity: 0.97 }, world);
      // 城市窗灯
      var wrand = H.rng(424);
      var cityWins = [];
      for (var w = 0; w < 26; w++) {
        cityWins.push(H.make('rect', {
          x: (30 + wrand() * 1540).toFixed(1), y: (HZ - 40 + wrand() * 30).toFixed(1),
          width: 2.6, height: 3.6,
          fill: w % 4 === 0 ? C.cyan : pal.accent2, opacity: 0.4
        }, world));
      }
      // 城市上方被光染亮的雾
      var cityHaze = A.rad(defs, pal.accent2, [[0, 0.42], [0.55, 0.12], [1, 0]]);
      var cityHazeEl = H.make('ellipse', { cx: 800, cy: HZ - 6, rx: 780, ry: 120, fill: 'url(#' + cityHaze + ')', opacity: 0 }, world);

      /* ---------------- 巨大光核 ---------------- */
      var sunWrap = H.make('g', {}, world);
      var sunHaloGrad = A.rad(defs, pal.accent, [[0, 0.9], [0.22, 0.5], [0.5, 0.2], [1, 0]]);
      var sunHalo = H.make('circle', { cx: SUN.x, cy: SUN.y, r: 560, fill: 'url(#' + sunHaloGrad + ')', opacity: 0 }, sunWrap);
      var sunHalo2 = H.make('circle', { cx: SUN.x, cy: SUN.y, r: 300, fill: 'url(#' + A.rad(defs, pal.accent2, [[0, 0.9], [0.45, 0.32], [1, 0]]) + ')', opacity: 0 }, sunWrap);
      // 放射光（两层，反向慢转）
      // 放射光（两层，反向慢转）；用 userSpaceOnUse 径向渐变让整组光从中心向外柔和衰减
      var rayGradId = H.radial(defs, [
        [0, '#fffdf2', 0.95], [0.14, '#fff0c8', 0.62], [0.38, '#ffc46b', 0.24],
        [0.68, '#d0703a', 0.07], [1, '#ff8a3d', 0]
      ], { cx: 0, cy: 0, r: 860, units: 'userSpaceOnUse', prefix: 's03ray' });
      var rayOuter = H.make('g', { opacity: 0 }, sunWrap);
      var rayInner = H.make('g', { opacity: 0 }, sunWrap);
      var rayRand = H.rng(19);
      var RAY_N = 22;
      for (var r = 0; r < RAY_N; r++) {
        var ang = (r / RAY_N) * Math.PI * 2 + rayRand() * 0.12;
        var len = 360 + rayRand() * 460;
        var halfW = 3 + rayRand() * 6;
        var ca = Math.cos(ang), sa = Math.sin(ang);
        var px = -sa, py = ca;
        var tipX = ca * len, tipY = sa * len;
        var wide = 2.4 + rayRand() * 1.6;
        H.make('path', {
          d: 'M0 0 L' + (tipX + px * halfW * wide).toFixed(1) + ' ' + (tipY + py * halfW * wide).toFixed(1) +
            ' L' + (tipX - px * halfW * wide).toFixed(1) + ' ' + (tipY - py * halfW * wide).toFixed(1) + ' Z',
          fill: 'url(#' + rayGradId + ')', opacity: (0.16 + rayRand() * 0.24).toFixed(3)
        }, rayOuter);
        H.make('path', {
          d: 'M0 0 L' + (tipX + px * halfW).toFixed(1) + ' ' + (tipY + py * halfW).toFixed(1) +
            ' L' + (tipX - px * halfW).toFixed(1) + ' ' + (tipY - py * halfW).toFixed(1) + ' Z',
          fill: 'url(#' + rayGradId + ')', opacity: (0.4 + rayRand() * 0.45).toFixed(3)
        }, rayInner);
      }
      for (var r2 = 0; r2 < 12; r2++) {
        var ang2 = (r2 / 12) * Math.PI * 2 + 0.2;
        var len2 = 150 + rayRand() * 200;
        var halfW2 = 8 + rayRand() * 12;
        var ca2 = Math.cos(ang2), sa2 = Math.sin(ang2);
        var px2 = -sa2, py2 = ca2;
        H.make('path', {
          d: 'M0 0 L' + (ca2 * len2 + px2 * halfW2).toFixed(1) + ' ' + (sa2 * len2 + py2 * halfW2).toFixed(1) +
            ' L' + (ca2 * len2 - px2 * halfW2).toFixed(1) + ' ' + (sa2 * len2 - py2 * halfW2).toFixed(1) + ' Z',
          fill: 'url(#' + rayGradId + ')', opacity: 0.5
        }, rayInner);
      }
      // 光核本体
      var sunCoreWrap = H.make('g', {}, sunWrap);
      var sunCore = H.make('circle', {
        cx: 0, cy: 0, r: 96,
        fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 1], [0.5, 0.92], [0.78, 0.4], [1, 0]]) + ')'
      }, sunCoreWrap);
      var sunRing = H.make('circle', {
        cx: 0, cy: 0, r: 112, fill: 'none', stroke: pal.accent2, 'stroke-width': 1.8, opacity: 0.6
      }, sunCoreWrap);
      var sunRing2 = H.make('circle', {
        cx: 0, cy: 0, r: 138, fill: 'none', stroke: pal.accent, 'stroke-width': 1,
        'stroke-dasharray': '4 10', opacity: 0.4
      }, sunCoreWrap);
      // 光晕（镜头 flare）
      var flareEl = A.flare(sunWrap, defs, 0, 0, 26, pal.accent2, { opacity: 0.7 });

      /* ---------------- 地面 / 反射 ---------------- */
      var groundGrad = H.grad(defs, [
        [0, '#3a1e14'], [0.22, '#1a0d14'], [1, '#050308']
      ], { x1: 0, y1: 0, x2: 0, y2: 1 });
      H.make('rect', { x: 0, y: HZ, width: W, height: HGT - HZ, fill: 'url(#' + groundGrad + ')' }, world);
      var reflectGrad = A.rad(defs, pal.accent2, [[0, 0.5], [0.4, 0.16], [1, 0]]);
      var reflect = H.make('ellipse', { cx: 800, cy: HZ + 60, rx: 360, ry: 96, fill: 'url(#' + reflectGrad + ')', opacity: 0 }, world);
      // 地面横向光带（远处的路 / 反光）
      var groundLines = [];
      for (var gl = 0; gl < 4; gl++) {
        groundLines.push(H.make('rect', {
          x: 200, y: HZ + 24 + gl * 26, width: 1200, height: 1.2,
          fill: pal.accent2, opacity: 0.05
        }, world));
      }

      /* ---------------- 两个剪影走向中央 ---------------- */
      var personY = HZ + 10;
      var p1 = A.person(world, { x: 250, y: personY, s: 0.72, pose: 'walk', rim: pal.accent2, color: '#05030a', rimOpacity: 0.45 });
      var p2 = A.person(world, { x: 1350, y: personY, s: 0.72, pose: 'walk', flip: true, rim: pal.accent, color: '#05030a', rimOpacity: 0.45 });
      // 人物脚下的暖光
      var footA = A.rad(defs, pal.accent2, [[0, 0.5], [1, 0]]);
      var footB = A.rad(defs, pal.accent, [[0, 0.4], [1, 0]]);
      var foot1 = H.make('ellipse', { cx: 250, cy: personY, rx: 52, ry: 12, fill: 'url(#' + footA + ')' }, world);
      var foot2 = H.make('ellipse', { cx: 1350, cy: personY, rx: 48, ry: 11, fill: 'url(#' + footB + ')' }, world);

      /* ---------------- 相遇光波 ---------------- */
      var waveWrap = H.make('g', {}, world);
      var waves = [];
      for (var wv = 0; wv < 3; wv++) {
        waves.push(H.make('ellipse', {
          cx: 800, cy: personY - 22, rx: 40, ry: 17, fill: 'none', stroke: pal.accent2,
          'stroke-width': 2.2 - wv * 0.5, opacity: 0
        }, waveWrap));
      }
      var meetGlow = H.make('circle', {
        cx: 800, cy: personY - 46, r: 120, fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 0.85], [0.4, 0.25], [1, 0]]) + ')', opacity: 0
      }, world);

      /* ---------------- 光尘 / 散景 / 暗幕 ---------------- */
      var dust = A.dust(world, {
        count: 44, seed: 91, x: [40, 1560], y: [120, 860], r: [0.9, 2.8],
        colors: ['#ffffff', pal.accent2, pal.accent], opacity: 0.72
      });
      var bokeh = A.bokeh(world, defs, {
        count: 10, seed: 31, x: [100, 1500], y: [200, 720], r: [24, 80],
        colors: [pal.accent, pal.accent2, C.white], opacity: 0.18, blur: 24
      });
      // 暖光充满画面（“被照亮”的整体色温）
      var warmWash = H.radial(defs, [
        [0, '#fff0c8', 0.34], [0.42, '#ffb066', 0.17], [0.8, '#ff8a3d', 0.05], [1, '#ff8a3d', 0]
      ], { cx: 0.5, cy: 0.5, r: 0.74 });
      var warmEl = H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + warmWash + ')', opacity: 0 }, world);
      // 暗幕：从 70% 暗 → 被照亮
      var veil = H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: '#04030c', opacity: 0.78 }, world);
      // 相遇白光
      var flashEl = H.make('circle', {
        cx: 800, cy: personY - 46, r: 300,
        fill: 'url(#' + A.rad(defs, '#ffffff', [[0, 0.95], [0.45, 0.4], [1, 0]]) + ')', opacity: 0
      }, world);
      // 边缘暗角（让光更集中）
      var vig = H.radial(defs, [
        [0, '#000000', 0], [0.3, '#000000', 0.02], [0.66, '#000000', 0.14], [1, '#000000', 0.46]
      ], { cx: 0.5, cy: 0.5, r: 0.8 });
      H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + vig + ')' }, world);

      // HUD
      var tag = A.tag(H.make('g', {}, g), ((scene && scene.tag) || '03 — FIRST LIGHT'), 64, 196, pal.accent2, {
        size: 11, spacing: 7, opacity: 0.45
      });
      A.num(H.make('g', {}, g), 3, 64, 226, pal.accent2, { size: 11, anchor: 'start', opacity: 0.3 });

      return {
        update: function (t, info) {
          var enter = A.enter(t, dur, 0.3, 0.2);
          var pulse = info.pulse || 0;
          var p = H.clamp(t / dur, 0, 1);

          // 光照进度：0.35s 开始，2.45s 完成
          var lightP = H.E.inOutCubic(H.clamp((t - 0.35) / 2.1, 0, 1));
          // 相遇进度（0.45 → 2.5s）
          var walkP = H.E.inOutSine(H.clamp((t - 0.45) / 2.05, 0, 1));
          // 相遇闪光
          var meetK = H.clamp((t - 2.5) / 0.1, 0, 1) * (1 - H.clamp((t - 2.6) / 0.75, 0, 1));

          world.setAttribute('opacity', (0.35 + 0.65 * enter).toFixed(3));

          // 太阳升起（从地平线下 780 → 500）
          var sunY = lerp(780, SUN.y, H.E.outCubic(H.clamp((t - 0.25) / 2.0, 0, 1)));
          sunWrap.setAttribute('transform', 'translate(' + SUN.x + ' ' + sunY.toFixed(1) + ')');
          sunCoreWrap.setAttribute('transform',
            'translate(0 0) scale(' + (0.86 + 0.14 * lightP + 0.05 * pulse).toFixed(4) + ')');
          sunHalo.setAttribute('opacity', ((0.15 + 0.85 * lightP) * (0.75 + 0.25 * pulse)).toFixed(3));
          sunHalo2.setAttribute('opacity', ((0.25 + 0.75 * lightP) * (0.7 + 0.3 * pulse)).toFixed(3));
          sunHalo.setAttribute('r', (400 + 260 * lightP).toFixed(1));
          sunHalo2.setAttribute('r', (210 + 150 * lightP).toFixed(1));
          rayOuter.setAttribute('opacity', (lightP * (0.65 + 0.35 * pulse)).toFixed(3));
          rayOuter.setAttribute('transform', 'rotate(' + (t * 6).toFixed(2) + ' 0 0) scale(' + (0.6 + 0.5 * lightP).toFixed(3) + ')');
          rayInner.setAttribute('opacity', (lightP * (0.5 + 0.5 * pulse)).toFixed(3));
          rayInner.setAttribute('transform', 'rotate(' + (-t * 11).toFixed(2) + ' 0 0) scale(' + (0.5 + 0.55 * lightP).toFixed(3) + ')');
          sunRing.setAttribute('opacity', (0.25 + 0.55 * lightP + 0.15 * pulse).toFixed(3));
          sunRing.setAttribute('r', (150 + 30 * lightP + 8 * pulse).toFixed(1));
          sunRing2.setAttribute('r', (196 + 40 * lightP).toFixed(1));
          flareEl.setAttribute('opacity', (0.2 + 0.55 * lightP).toFixed(3));

          // 天空/云/城市雾随光照亮
          cityHazeEl.setAttribute('opacity', (0.2 + 0.7 * lightP).toFixed(3));
          for (var ci = 0; ci < clouds.length; ci++) {
            clouds[ci].setAttribute('opacity', ((0.18 + 0.5 * lightP) * (0.7 + 0.3 * Math.sin(t * 0.6 + ci))).toFixed(3));
          }
          for (var st = 0; st < stars.length; st++) {
            stars[st].setAttribute('opacity', (0.55 * (1 - lightP) * (0.6 + 0.4 * Math.sin(t * 1.7 + st))).toFixed(3));
          }
          for (var cw = 0; cw < cityWins.length; cw++) {
            cityWins[cw].setAttribute('opacity', (0.25 + 0.35 * lightP * (0.5 + 0.5 * Math.sin(t * 2 + cw * 1.7))).toFixed(2));
          }
          reflect.setAttribute('opacity', (0.15 + 0.75 * lightP).toFixed(3));
          for (var gl = 0; gl < groundLines.length; gl++) {
            groundLines[gl].setAttribute('opacity', (0.03 + 0.1 * lightP * (0.6 + 0.4 * Math.sin(t * 1.1 + gl))).toFixed(3));
          }

          // 两个人：从两侧走到中央（相遇后站定，微微面对彼此）
          var px1 = lerp(250, 744, walkP);
          var px2 = lerp(1350, 856, walkP);
          var walking = walkP > 0.02 && walkP < 0.985 ? 1 : 0;
          var bob1 = walking * Math.abs(Math.sin(t * 5.4)) * 2.6;
          var bob2 = walking * Math.abs(Math.sin(t * 5.4 + 0.9)) * 2.6;
          p1.group.setAttribute('transform', 'translate(' + px1.toFixed(1) + ' ' + (personY - bob1).toFixed(1) + ') scale(0.72 0.72)');
          p2.group.setAttribute('transform', 'translate(' + px2.toFixed(1) + ' ' + (personY - bob2).toFixed(1) + ') scale(-0.72 0.72)');
          p1.update(t, pulse);
          p2.update(t, pulse);
          foot1.setAttribute('cx', px1.toFixed(1));
          foot1.setAttribute('cy', personY.toFixed(1));
          foot2.setAttribute('cx', px2.toFixed(1));
          foot2.setAttribute('cy', personY.toFixed(1));
          foot1.setAttribute('opacity', (0.35 + 0.5 * lightP).toFixed(3));
          foot2.setAttribute('opacity', (0.28 + 0.5 * lightP).toFixed(3));

          // 相遇光波 + 白闪
          for (var wv2 = 0; wv2 < waves.length; wv2++) {
            var we = H.clamp((t - 2.5 - wv2 * 0.1) / 0.95, 0, 1);
            if (we > 0 && we < 1) {
              var weE = H.E.outCubic(we);
              var wr = 40 + 300 * weE;
              waves[wv2].setAttribute('rx', wr.toFixed(1));
              waves[wv2].setAttribute('ry', (wr * 0.4).toFixed(1));
              waves[wv2].setAttribute('opacity', ((1 - we) * 0.3).toFixed(3));
            } else {
              waves[wv2].setAttribute('opacity', '0');
            }
          }
          meetGlow.setAttribute('opacity', (meetK * 0.9).toFixed(3));
          meetGlow.setAttribute('r', (90 + 150 * H.clamp((t - 2.5) / 0.8, 0, 1)).toFixed(1));
          flashEl.setAttribute('opacity', (meetK * 0.7).toFixed(3));

          // 光把画面整体染暖 + 暗幕退去
          warmEl.setAttribute('opacity', (0.15 + 0.85 * lightP).toFixed(3));
          veil.setAttribute('opacity', (0.78 * (1 - lightP) + 0.03).toFixed(3));

          bokeh.update(t, pulse * 0.7);
          dust.update(t, info.energy);
          tag.setAttribute('opacity', (0.3 + 0.2 * Math.sin(t * 1.6) + 0.15 * lightP).toFixed(3));
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
