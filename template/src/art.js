/* =========================================================================
 * art.js — 「霓虹回忆」视觉系统（window.A）
 *
 * 给 15 个场景提供统一的赛博/霓虹素材：背景、光斑、粒子、雨幕、地面网格、
 * 城市剪影、霓虹描边、人物剪影、心跳光环、烟花爆点……所有绘制都是确定性的
 * （只依赖 t / pulse / energy），同一时间点截图必定一致。
 *
 * 使用方式（每个场景文件）：
 *   (function () {
 *     var SCENES = window.SCENES = window.SCENES || {};
 *     SCENES.s01 = { palette: {...}, build: function (g, defs, H, W, HGT) {
 *       A.frame(g, defs, TL.scenes[0].palette);      // 统一底色，建议保留
 *       ... 自己画 ...
 *       return { update: function (t, info) { ... } };
 *     } };
 *   })();
 * ========================================================================= */
(function (global) {
  'use strict';

  var H = global.H;
  var W = 1600, HGT = 900;

  var C = {
    white: '#ffffff', ink: '#eaf6ff',
    cyan: '#22e6ff', blue: '#5b8cff', ice: '#a8e8ff',
    violet: '#8a5cff', purple: '#c04bff',
    magenta: '#ff3cc7', pink: '#ff77c8',
    red: '#ff5a4d', orange: '#ff8a3d', ember: '#ffb36b',
    gold: '#ffc46b', mint: '#67ffc8'
  };

  var A = { C: C };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function a(hex, alpha) { return H.rgba(hex, alpha); }
  A.a = a;
  A.clamp = clamp;

  /* ---------------------------------------------------------------- 滤镜 */
  A.glowF = function (defs, amount) {
    amount = amount || 8;
    var key = 'glow' + Math.round(amount * 10);
    if (!defs.__cache) defs.__cache = {};
    if (defs.__cache[key]) return defs.__cache[key];
    var id = H.uid('gf');
    var f = H.make('filter', {
      id: id, x: '-70%', y: '-70%', width: '240%', height: '240%',
      colorInterpolationFilters: 'sRGB'
    }, defs);
    H.make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: amount, result: 'blur' }, f);
    var m = H.make('feMerge', {}, f);
    H.make('feMergeNode', { in: 'blur' }, m);
    H.make('feMergeNode', { in: 'blur' }, m);
    H.make('feMergeNode', { in: 'SourceGraphic' }, m);
    defs.__cache[key] = id;
    return id;
  };

  A.blurF = function (defs, amount) {
    amount = amount || 6;
    var key = 'blur' + Math.round(amount * 10);
    if (!defs.__cache) defs.__cache = {};
    if (defs.__cache[key]) return defs.__cache[key];
    var id = H.uid('bf');
    var f = H.make('filter', {
      id: id, x: '-40%', y: '-40%', width: '180%', height: '180%'
    }, defs);
    H.make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: amount }, f);
    defs.__cache[key] = id;
    return id;
  };

  /* ------------------------------------------------------------ 渐变工具 */
  A.rad = function (defs, color, stops) {
    var s = stops || [[0, 0.55], [0.45, 0.18], [1, 0]];
    return H.radial(defs, s.map(function (x) { return [x[0], color, x[1]]; }),
      { cx: 0.5, cy: 0.5, r: 0.5 });
  };

  function vgrad(defs, stops, prefix) {
    return H.grad(defs, stops, { x1: 0, y1: 0, x2: 0, y2: 1, prefix: prefix });
  }
  A.vgrad = vgrad;

  /* -------------------------------------------------------------- 背景底 */
  /**
   * 统一舞台底色：顶部深色 -> 中部主色 -> 底部更深，加一个大范围主色光晕与
   * 一条地平线雾光。每个场景都建议先调用它，保证 15 个镜头色调连贯。
   */
  A.frame = function (g, defs, pal, opt) {
    opt = opt || {};
    var cx = opt.cx != null ? opt.cx : 0.5;
    var cy = opt.cy != null ? opt.cy : 0.46;
    var r = opt.r != null ? opt.r : 0.72;

    var sky = H.radial(defs, [
      [0, H.mix(pal.bg2, pal.bg3, 0.55), 1],
      [0.42, pal.bg2, 1],
      [0.78, pal.bg1, 1],
      [1, '#04030a', 1]
    ], { cx: cx, cy: cy, r: r, fx: cx, fy: cy });
    H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + sky + ')' }, g);

    // 主色氛围光
    var glow = A.rad(defs, pal.accent, [[0, opt.glow != null ? opt.glow : 0.30], [0.5, 0.08], [1, 0]]);
    H.make('circle', {
      cx: W * cx, cy: HGT * cy, r: opt.glowR || 620,
      fill: 'url(#' + glow + ')'
    }, g);

    // 地平线雾光
    var hz = A.rad(defs, pal.accent2 || pal.accent, [[0, 0.34], [0.55, 0.10], [1, 0]]);
    H.make('ellipse', {
      cx: W / 2, cy: opt.horizon != null ? opt.horizon : 560,
      rx: W * 0.72, ry: 210, fill: 'url(#' + hz + ')', opacity: 0.8
    }, g);

    // 顶部/底部压暗（保证标题和歌词可读）
    var top = vgrad(defs, [[0, '#04030a', 0.55], [0.35, '#04030a', 0]], 'tp');
    H.make('rect', { x: 0, y: 0, width: W, height: 260, fill: 'url(#' + top + ')' }, g);
    var bot = vgrad(defs, [[0, '#04030a', 0], [0.5, '#04030a', 0.26], [1, '#04030a', 0.60]], 'bt');
    H.make('rect', { x: 0, y: HGT - 300, width: W, height: 300, fill: 'url(#' + bot + ')' }, g);
    return g;
  };

  /** 只加一层暗角（场景自己铺满背景时用） */
  A.vignette = function (g, defs) {
    var v = H.radial(defs, [[0, '#000', 0], [0.6, '#000', 0.12], [1, '#000', 0.7]], { cx: 0.5, cy: 0.48, r: 0.8 });
    H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + v + ')', opacity: 0.85 }, g);
  };

  /* ------------------------------------------------------------ 粒子/光点 */
  /** 飘浮光尘：向上缓慢飘、左右摆动、呼吸闪烁 */
  A.dust = function (g, o) {
    o = o || {};
    var count = o.count || 46;
    var rand = H.rng(o.seed || 3);
    var x0 = o.x || [0, W], y0 = o.y || [0, HGT];
    var r0 = o.r || [1.2, 3.6];
    var colors = o.colors || [C.white, o.color || C.cyan];
    var nodes = [];
    for (var i = 0; i < count; i++) {
      var x = H.lerp(x0[0], x0[1], rand());
      var y = H.lerp(y0[0], y0[1], rand());
      var r = H.lerp(r0[0], r0[1], rand());
      var col = colors[Math.floor(rand() * colors.length)];
      var el = H.make('circle', {
        cx: x, cy: y, r: r, fill: col,
        opacity: (o.opacity != null ? o.opacity : 0.7) * (0.35 + rand() * 0.65)
      }, g);
      nodes.push({
        el: el, x: x, y: y, base: y, sp: 8 + rand() * 26,
        amp: 6 + rand() * 26, ph: rand() * 6.283, tw: 1.4 + rand() * 3.2,
        op: (o.opacity != null ? o.opacity : 0.7) * (0.35 + rand() * 0.65)
      });
    }
    var h = (o.h != null ? o.h : HGT) + 40;
    var top = (o.top != null ? o.top : 0) - 40;
    return {
      nodes: nodes,
      update: function (t, energy) {
        var boost = 1 + (energy || 0) * 0.9;
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var y = n.base - H.mod(t * n.sp * boost, h - top);
          var x = n.x + Math.sin(t * 0.5 + n.ph) * n.amp;
          H.setf(n.el, { cx: x.toFixed(2), cy: y.toFixed(2) });
          n.el.setAttribute('opacity', (n.op * (0.6 + 0.4 * Math.sin(t * n.tw + n.ph))).toFixed(3));
        }
      }
    };
  };

  /** 雨丝 */
  A.rain = function (g, o) {
    o = o || {};
    var count = o.count || 90;
    var rand = H.rng(o.seed || 11);
    var col = o.color || C.ice;
    var nodes = [];
    for (var i = 0; i < count; i++) {
      var x = rand() * (W + 200) - 100;
      var y = rand() * HGT;
      var len = 26 + rand() * 60;
      var sp = 620 + rand() * 700;
      var el = H.make('line', {
        x1: x, y1: y, x2: x - 6, y2: y + len,
        stroke: col, 'stroke-width': o.width || 1.2,
        'stroke-linecap': 'round', opacity: (o.opacity != null ? o.opacity : 0.35) * (0.3 + rand() * 0.7)
      }, g);
      nodes.push({ el: el, x: x, y: y, len: len, sp: sp, op: 1 });
    }
    return {
      update: function (t) {
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var y = H.mod(n.y + t * n.sp, HGT + 120) - 60;
          H.setf(n.el, { y1: y.toFixed(1), y2: (y + n.len).toFixed(1) });
        }
      }
    };
  };

  /** 大颗散景光斑（先整体高斯模糊，一次 filter 搞定） */
  A.bokeh = function (g, defs, o) {
    o = o || {};
    var wrap = H.make('g', { filter: 'url(#' + A.blurF(defs, o.blur || 14) + ')' }, g);
    var count = o.count || 22;
    var rand = H.rng(o.seed || 5);
    var colors = o.colors || [o.color || C.violet, C.magenta, C.cyan];
    var nodes = [];
    for (var i = 0; i < count; i++) {
      var x = H.lerp(o.x ? o.x[0] : 0, o.x ? o.x[1] : W, rand());
      var y = H.lerp(o.y ? o.y[0] : 0, o.y ? o.y[1] : HGT, rand());
      var r = H.lerp(o.r ? o.r[0] : 20, o.r ? o.r[1] : 70, rand());
      var el = H.make('circle', {
        cx: x, cy: y, r: r,
        fill: colors[Math.floor(rand() * colors.length)],
        opacity: (o.opacity != null ? o.opacity : 0.30) * (0.3 + rand() * 0.7)
      }, wrap);
      nodes.push({ el: el, x: x, y: y, sp: 6 + rand() * 18, ph: rand() * 6.283, op: +el.getAttribute('opacity') });
    }
    return {
      update: function (t, pulse) {
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var y = n.y + Math.sin(t * 0.4 + n.ph) * n.sp;
          var x = n.x + Math.cos(t * 0.3 + n.ph) * n.sp * 1.4;
          H.setf(n.el, { cx: x.toFixed(1), cy: y.toFixed(1) });
          n.el.setAttribute('opacity', (n.op * (0.75 + 0.5 * (pulse || 0))).toFixed(3));
        }
      }
    };
  };

  /* ------------------------------------------------------------ 霓虹描边 */
  /**
   * 一条霓虹线：外发光 + 主色 + 白色内芯。返回 { group, glow, core }，
   * 可以继续改 d 做生长动画。
   */
  A.neon = function (parent, defs, color, opt) {
    opt = opt || {};
    var width = opt.width || 3;
    var wrap = H.make('g', {}, parent);
    var glow = H.make('path', {
      d: opt.d || '', fill: 'none', stroke: color,
      'stroke-width': width * 3.4, 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', opacity: opt.glowOpacity != null ? opt.glowOpacity : 0.55,
      filter: 'url(#' + A.glowF(defs, opt.blur || 7) + ')'
    }, wrap);
    var core = H.make('path', {
      d: opt.d || '', fill: 'none', stroke: color,
      'stroke-width': width, 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', opacity: opt.opacity != null ? opt.opacity : 1
    }, wrap);
    var inner = H.make('path', {
      d: opt.d || '', fill: 'none', stroke: opt.inner || C.white,
      'stroke-width': Math.max(0.7, width * 0.32), 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', opacity: 0.85
    }, wrap);
    return { group: wrap, glow: glow, core: core, inner: inner };
  };

  /** 空心霓虹几何（圆/椭圆/矩形用） */
  A.ringEl = function (parent, defs, color, r, opt) {
    opt = opt || {};
    var wrap = H.make('g', {}, parent);
    var cfg = {
      fill: 'none', stroke: color, opacity: opt.opacity != null ? opt.opacity : 1
    };
    var glowCfg = {
      fill: 'none', stroke: color, opacity: opt.glowOpacity != null ? opt.glowOpacity : 0.5,
      filter: 'url(#' + A.glowF(defs, opt.blur || 8) + ')'
    };
    var glow = H.make('circle', Object.assign({}, cfg, glowCfg, { r: r, 'stroke-width': (opt.width || 2) * 3 }), wrap);
    var core = H.make('circle', Object.assign({}, cfg, { r: r, 'stroke-width': opt.width || 2 }), wrap);
    return { group: wrap, glow: glow, core: core };
  };

  /* ------------------------------------------------------------ 地面网格 */
  /** 透视地面网格：竖线汇聚到灭点，横线向镜头滚动，beat 时更亮 */
  A.grid = function (g, defs, pal, o) {
    o = o || {};
    var vx = o.vx != null ? o.vx : W / 2;
    var vy = o.vy != null ? o.vy : 520;
    var wrap = H.make('g', { opacity: o.opacity != null ? o.opacity : 0.5 }, g);
    var color = o.color || pal.accent;
    var lines = [];
    var i;
    // 竖线
    for (i = -9; i <= 9; i++) {
      var x0 = vx + i * 190;
      var el = H.make('line', {
        x1: x0, y1: HGT + 40, x2: vx + i * 18, y2: vy,
        stroke: color, 'stroke-width': 1.1, opacity: 0.38
      }, wrap);
      lines.push(el);
    }
    // 横线（会滚动）
    var rows = [];
    var rowsN = 18;
    for (i = 0; i < rowsN; i++) {
      var el2 = H.make('line', {
        x1: 0, y1: 0, x2: W, y2: 0,
        stroke: color, 'stroke-width': 1.1, opacity: 0.3
      }, wrap);
      rows.push(el2);
    }
    return {
      nodes: lines.concat(rows),
      update: function (t, pulse) {
        var speed = o.speed || 0.55;
        var phase = H.fract(t * speed);
        for (var k = 0; k < rowsN; k++) {
          var u = (k + phase) / rowsN;             // 0..1 深度
          var y = vy + Math.pow(u, 2.2) * (HGT - vy + 80);
          var op = 0.08 + Math.pow(u, 1.4) * 0.42;
          var el = rows[k];
          el.setAttribute('y1', y.toFixed(1));
          el.setAttribute('y2', y.toFixed(1));
          el.setAttribute('opacity', (op * (0.8 + (pulse || 0) * 0.9)).toFixed(3));
        }
        wrap.setAttribute('opacity', (0.5 + (pulse || 0) * 0.4).toFixed(3));
      }
    };
  };

  /* ------------------------------------------------------------ 城市剪影 */
  /** 夜景城市轮廓 + 零星霓虹窗。返回 { group, update } */
  A.skyline = function (g, defs, pal, o) {
    o = o || {};
    var rand = H.rng(o.seed || 21);
    var baseY = o.baseY != null ? o.baseY : 600;
    var height = o.height || 240;
    var color = o.color || '#05040c';
    var wrap = H.make('g', {}, g);
    var x = -40;
    var windows = [];
    while (x < W + 80) {
      var bw = 40 + rand() * 120;
      var bh = 40 + rand() * height;
      var top = baseY - bh;
      H.make('rect', {
        x: x, y: top, width: bw, height: bh + 260,
        fill: color, opacity: 0.92
      }, wrap);
      // 楼顶霓虹边
      H.make('rect', {
        x: x, y: top, width: bw, height: 1.6,
        fill: pal.accent, opacity: 0.35 + rand() * 0.3
      }, wrap);
      // 窗户灯火
      var cols = Math.max(1, Math.floor(bw / 16));
      var rows = Math.max(1, Math.floor(bh / 18));
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          if (rand() > 0.55) continue;
          var wx = x + 6 + c * (bw - 10) / cols;
          var wy = top + 8 + r * (bh - 8) / rows;
          var warm = rand() > 0.4;
          windows.push(H.make('rect', {
            x: wx, y: wy, width: 2.4, height: 4.2,
            fill: warm ? (o.win || pal.accent2 || pal.accent) : pal.accent,
            opacity: 0.18 + rand() * 0.5
          }, wrap));
        }
      }
      x += bw + 4 + rand() * 26;
    }
    var lit = windows.slice(0, Math.min(90, windows.length));
    return {
      group: wrap,
      update: function (t) {
        for (var i = 0; i < lit.length; i++) {
          var el = lit[i];
          var base = parseFloat(el.getAttribute('data-op') || el.getAttribute('opacity')) || 0.4;
          if (!el.getAttribute('data-op')) el.setAttribute('data-op', String(base));
          var op = base * (0.65 + 0.35 * Math.sin(t * (1.2 + (i % 7) * 0.23) + i * 1.7));
          el.setAttribute('opacity', op.toFixed(3));
        }
      }
    };
  };

  /* ------------------------------------------------------------ 人物剪影 */
  // 统一坐标：脚底 y=0，头顶约 y=-96（所以 s 就是“身高 / 96”）
  var POSES = {
    stand: {
      arms: [[[-13, -70], [-19, -51], [-21, -31]], [[13, -70], [19, -51], [21, -31]]],
      legs: [[[-6, -31], [-8, -15], [-10, 0]], [[6, -31], [8, -15], [10, 0]]]
    },
    walk: {
      arms: [[[-13, -70], [-23, -57], [-29, -39]], [[13, -70], [21, -49], [25, -28]]],
      legs: [[[-6, -31], [-14, -16], [-24, -2]], [[6, -31], [12, -14], [19, 0]]]
    },
    reach: {
      arms: [[[-13, -70], [-25, -86], [-34, -104]], [[13, -70], [23, -86], [31, -102]]],
      legs: [[[-6, -31], [-8, -15], [-10, 0]], [[6, -31], [8, -15], [10, 0]]]
    },
    sit: {
      arms: [[[-13, -70], [-19, -52], [-23, -35]], [[13, -70], [19, -52], [23, -35]]],
      legs: [[[-6, -31], [-17, -25], [-31, -21]], [[6, -31], [17, -25], [31, -21]]]
    },
    kneel: {
      arms: [[[-13, -70], [-20, -54], [-23, -36]], [[13, -70], [20, -54], [23, -36]]],
      legs: [[[-6, -31], [-14, -17], [-17, -3]], [[6, -31], [9, -17], [11, -3]]]
    }
  };
  var TORSO_D = 'M-14 -73 C-18 -62 -17 -46 -13 -30 L13 -30 C17 -46 18 -62 14 -73 C9 -78 -9 -78 -14 -73 Z';

  /**
   * 人物剪影（霓虹描边版）：近黑的人形 + 一圈主色轮廓光。
   * o = { x, y(脚底), s(身高系数, 96px 为 1), pose, flip, color, rim, rimOpacity, opacity, bob }
   */
  A.person = function (parent, o) {
    o = o || {};
    var s = o.s != null ? o.s : 1;
    var color = o.color || '#05040b';
    var rim = o.rim || C.cyan;
    var pose = POSES[o.pose || 'stand'] || POSES.stand;
    var wrap = H.make('g', {
      transform: 'translate(' + (o.x || 0) + ',' + (o.y || 0) + ') scale(' + (o.flip ? -s : s) + ',' + s + ')',
      opacity: o.opacity != null ? o.opacity : 1
    }, parent);
    var body = H.make('g', {}, wrap);

    function draw(target, col, extra) {
      H.make('circle', { cx: 0, cy: -86, r: 10, fill: col, stroke: 'none' }, target);
      H.make('path', { d: TORSO_D, fill: col, stroke: 'none' }, target);
      H.make('path', { d: H.poly([[-3, -78], [0, -74], [3, -78]]), fill: col, stroke: 'none' }, target);
      var armW = 6.2 + extra;
      var legW = 7.2 + extra;
      pose.arms.forEach(function (pts) {
        H.make('path', {
          d: H.poly(pts), fill: 'none', stroke: col, 'stroke-width': armW,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }, target);
      });
      pose.legs.forEach(function (pts) {
        H.make('path', {
          d: H.poly(pts), fill: 'none', stroke: col, 'stroke-width': legW,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }, target);
        // 脚
        var f = pts[pts.length - 1];
        H.make('path', {
          d: 'M' + f[0] + ' ' + f[1] + ' L' + (f[0] + 7) + ' ' + f[1],
          stroke: col, 'stroke-width': legW * 0.7, 'stroke-linecap': 'round'
        }, target);
      });
    }

    // 轮廓光（粗一圈，垫在身后）→ 本体（近黑）
    var rimWrap = H.make('g', { opacity: o.rimOpacity != null ? o.rimOpacity : 0.6 }, body);
    draw(rimWrap, rim, 3.2);
    var ink = H.make('g', {}, body);
    draw(ink, color, 0);

    return {
      group: wrap,
      update: function (t, pulse) {
        var bob = (o.bob != null ? o.bob : 1.0) * Math.sin(t * 2.2) + (pulse || 0) * 1.4;
        body.setAttribute('transform', 'translate(0,' + bob.toFixed(2) + ')');
      }
    };
  };

  /* ------------------------------------------------------------ 光斑/爆点 */
  /** 发光圆球（渐变球，不是模糊） */
  A.orb = function (g, defs, x, y, r, color, opt) {
    opt = opt || {};
    var grad = H.radial(defs, [
      [0, '#ffffff', 0.95],
      [0.28, color, 0.8],
      [0.62, color, 0.32],
      [1, color, 0]
    ], { cx: 0.5, cy: 0.5, r: 0.5 });
    var el = H.make('circle', { cx: x, cy: y, r: r, fill: 'url(#' + grad + ')', opacity: opt.opacity != null ? opt.opacity : 1 }, g);
    return el;
  };

  /** 镜头光晕（四芒星 + 光斑） */
  A.flare = function (g, defs, x, y, s, color, opt) {
    opt = opt || {};
    var wrap = H.make('g', { transform: 'translate(' + x + ',' + y + ')', opacity: opt.opacity != null ? opt.opacity : 1 }, g);
    var halo = A.rad(defs, color, [[0, 0.55], [0.4, 0.14], [1, 0]]);
    H.make('circle', { cx: 0, cy: 0, r: s * 2.6, fill: 'url(#' + halo + ')' }, wrap);
    var core = H.radial(defs, [[0, '#ffffff', 0.95], [0.35, color, 0.5], [1, color, 0]], { cx: 0.5, cy: 0.5, r: 0.5 });
    H.make('circle', { cx: 0, cy: 0, r: s * 0.55, fill: 'url(#' + core + ')' }, wrap);
    // 十字光芒
    H.make('path', {
      d: 'M' + (-s * 3.4) + ' 0 L' + (-s * 0.25) + ' 0 L0 ' + (-s * 0.5) + ' L0 0 Z',
      fill: color, opacity: 0.55
    }, wrap);
    H.make('path', {
      d: 'M' + (s * 3.4) + ' 0 L' + (s * 0.25) + ' 0 L0 ' + (-s * 0.5) + ' L0 0 Z',
      fill: color, opacity: 0.55
    }, wrap);
    H.make('path', {
      d: 'M0 ' + (-s * 3.0) + ' L0 ' + (-s * 0.3) + ' L' + (s * 0.35) + ' 0 L0 0 Z',
      fill: color, opacity: 0.55
    }, wrap);
    H.make('path', {
      d: 'M0 ' + (s * 3.0) + ' L0 ' + (s * 0.3) + ' L' + (s * 0.35) + ' 0 L0 0 Z',
      fill: color, opacity: 0.55
    }, wrap);
    return wrap;
  };

  /** 心跳光环：pulse 时向外扩散一圈 */
  A.ripple = function (g, defs, x, y, color, opt) {
    opt = opt || {};
    var wrap = H.make('g', {}, g);
    var circles = [];
    var n = opt.count || 3;
    for (var i = 0; i < n; i++) {
      circles.push(H.make('circle', {
        cx: x, cy: y, r: 40, fill: 'none', stroke: color,
        'stroke-width': opt.width || 2, opacity: 0
      }, wrap));
    }
    return {
      group: wrap,
      update: function (t, pulse) {
        for (var i = 0; i < circles.length; i++) {
          var ph = H.fract(t / (opt.period || 0.4615) + i / circles.length);
          var r = (opt.r0 || 30) + ph * (opt.r1 || 220);
          circles[i].setAttribute('r', r.toFixed(1));
          circles[i].setAttribute('opacity', ((1 - ph) * 0.5 * (opt.alpha || 1)).toFixed(3));
        }
      }
    };
  };

  /* ------------------------------------------------------------ 杂项工具 */
  /** 一条渐隐的光束（三角形光柱） */
  A.beam = function (g, defs, x, y, w, len, color, op, angle) {
    var grad = H.grad(defs, [[0, color, 0.55], [0.55, color, 0.18], [1, color, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
    var el = H.make('polygon', {
      points: (-w / 2) + ',0 ' + (w / 2) + ',0 0,' + (-len),
      fill: 'url(#' + grad + ')',
      opacity: op != null ? op : 0.6,
      transform: 'translate(' + x + ',' + y + ') rotate(' + (angle || 0) + ')'
    }, g);
    return el;
  };

  /** 小英文标签（HUD / 装饰文字） */
  A.tag = function (g, str, x, y, color, opt) {
    opt = opt || {};
    return H.label(g, str, {
      x: x, y: y, anchor: opt.anchor || 'start',
      size: opt.size || 13, weight: opt.weight || 600,
      fill: color, spacing: opt.spacing != null ? opt.spacing : 4,
      opacity: opt.opacity != null ? opt.opacity : 0.8,
      font: '"Bahnschrift","DIN Alternate","Microsoft YaHei",sans-serif',
      glow: opt.glow
    });
  };

  /** 数字/刻度风格化小字 */
  A.num = function (g, n, x, y, color, opt) {
    opt = opt || {};
    return H.label(g, String(n).padStart(2, '0'), {
      x: x, y: y, anchor: opt.anchor || 'middle',
      size: opt.size || 12, weight: 700, fill: color, spacing: 2, opacity: opt.opacity != null ? opt.opacity : 0.7,
      font: '"Bahnschrift","DIN Alternate",Consolas,monospace'
    });
  };

  /** 心形路径 */
  A.heartPath = function (cx, cy, s) {
    return 'M' + cx + ' ' + (cy - 0.1 * s) +
      ' C' + (cx - 0.62 * s) + ' ' + (cy - 0.92 * s) + ' ' + (cx - 1.55 * s) + ' ' + (cy - 0.32 * s) + ' ' + (cx - 0.86 * s) + ' ' + (cy + 0.48 * s) +
      ' L' + (cx - 0.03 * s) + ' ' + (cy + 1.18 * s) +
      ' L' + (cx + 0.86 * s) + ' ' + (cy + 0.48 * s) +
      ' C' + (cx + 1.55 * s) + ' ' + (cy - 0.32 * s) + ' ' + (cx + 0.62 * s) + ' ' + (cy - 0.92 * s) + ' ' + cx + ' ' + (cy - 0.1 * s) + ' Z';
  };

  /** 六芒星评分? 不需要。留一个通用的“折线生长”工具：按进度设置 path 的 stroke-dashoffset */
  A.draw = function (pathEl, progress, totalLen) {
    var L = totalLen || 1000;
    pathEl.setAttribute('stroke-dasharray', String(L));
    pathEl.setAttribute('stroke-dashoffset', String((1 - clamp(progress, 0, 1)) * L));
  };

  /** 场景进出场统一缓冲：入场 0.35s / 出场 0.3s，返回 0..1 可见度系数 */
  A.enter = function (t, dur, inT, outT) {
    inT = inT != null ? inT : Math.min(0.5, dur * 0.16);
    outT = outT != null ? outT : Math.min(0.42, dur * 0.14);
    var inn = H.clamp(t / Math.max(0.001, inT), 0, 1);
    var out = H.clamp((dur - t) / Math.max(0.001, outT), 0, 1);
    return H.E.outCubic(inn) * H.E.inOutCubic(out);
  };

  global.A = A;
})(typeof window !== 'undefined' ? window : this);
