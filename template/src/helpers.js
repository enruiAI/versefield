/* =========================================================================
 * helpers.js — 全局动画/绘图工具库（window.H）
 * 提供给所有 SVG 场景使用。除了这里的工具，场景不要依赖其它第三方库。
 * ========================================================================= */
(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var W = 1600, HGT = 900;
  var _uid = 0;

  /* ---------- DOM ---------- */
  function make(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) set(el, attrs);
    if (parent) parent.appendChild(el);
    return el;
  }
  function set(el, attrs) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v == null || v === false) continue;
      el.setAttribute(k, v);
    }
    return el;
  }
  /** 每帧安全设置属性：只有变化时才写 DOM（减少 layout 抖动） */
  function setf(el, attrs) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v == null) continue;
      v = String(v);
      if (el.getAttribute(k) !== v) el.setAttribute(k, v);
    }
    return el;
  }
  function text(parent, str, attrs) {
    var t = make('text', attrs || {}, parent);
    t.textContent = str;
    return t;
  }
  function uid(prefix) { _uid += 1; return (prefix || 'id') + '_' + _uid; }

  /* ---------- 数学 / 缓动 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function invLerp(a, b, v) { return a === b ? 0 : (v - a) / (b - a); }
  function map(v, a, b, c, d) { return c + (d - c) * clamp(invLerp(a, b, v), 0, 1); }
  function fract(x) { return x - Math.floor(x); }
  function mod(x, n) { return ((x % n) + n) % n; }

  var E = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    inCubic: function (t) { return t * t * t; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    inQuart: function (t) { return t * t * t * t; },
    outQuart: function (t) { return 1 - Math.pow(1 - t, 4); },
    inOutQuart: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; },
    outQuint: function (t) { return 1 - Math.pow(1 - t, 5); },
    inExpo: function (t) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
    outExpo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    inOutExpo: function (t) {
      if (t === 0 || t === 1) return t;
      return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outSine: function (t) { return Math.sin(t * Math.PI / 2); },
    outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      var c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    /** 0→1→0 的钟形，最常用：entrance + exit */
    bell: function (t) { return Math.sin(Math.PI * clamp(t, 0, 1)); }
  };

  /** 在 [t0,t1] 内做 0→1 的缓动进度；两端外分别钳制为 0 / 1 */
  function ramp(t, t0, t1, ease) {
    var p = clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
    return (ease || E.inOutCubic)(p);
  }
  /** 在 [t0,t1] 内 0→1→0 */
  function pulse(t, t0, t1) {
    var p = clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
    return Math.sin(Math.PI * p);
  }
  /** 关键帧插值：keys=[[time,value],...] */
  function key(t, keys, ease) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var p = invLerp(keys[i - 1][0], keys[i][0], t);
        return lerp(keys[i - 1][1], keys[i][1], (ease || E.inOutCubic)(clamp(p, 0, 1)));
      }
    }
    return keys[keys.length - 1][1];
  }

  /* ---------- 确定性随机 ---------- */
  function rng(seed) {
    var s = (seed >>> 0) || 123456789;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  /** 确定性一维噪声（0..1），用于飘动/闪烁 */
  function noise(x, seed) {
    var s = Math.sin(x * 127.1 + (seed || 0) * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  /** 平滑噪声（两段插值） */
  function snoise(x, seed) {
    var i = Math.floor(x), f = x - i;
    var a = noise(i, seed), b = noise(i + 1, seed);
    var u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  }

  /* ---------- 颜色 ---------- */
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = Math.round(clamp(v, 0, 255)).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }
  function mix(a, b, t) {
    var A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t));
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }
  function shade(hex, amt) { // amt: -1..1
    return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt);
  }

  /* ---------- 常用 defs 构造 ---------- */
  function grad(defs, stops, opt) {
    opt = opt || {};
    var id = uid(opt.prefix || 'lg');
    var g = make('linearGradient', {
      id: id,
      x1: opt.x1 != null ? opt.x1 : 0,
      y1: opt.y1 != null ? opt.y1 : 0,
      x2: opt.x2 != null ? opt.x2 : 0,
      y2: opt.y2 != null ? opt.y2 : 1,
      gradientUnits: opt.units || 'objectBoundingBox'
    }, defs);
    stops.forEach(function (s) {
      make('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] != null ? s[2] : 1 }, g);
    });
    return id;
  }
  function radial(defs, stops, opt) {
    opt = opt || {};
    var id = uid(opt.prefix || 'rg');
    var g = make('radialGradient', {
      id: id,
      cx: opt.cx != null ? opt.cx : 0.5,
      cy: opt.cy != null ? opt.cy : 0.5,
      r: opt.r != null ? opt.r : 0.5,
      fx: opt.fx != null ? opt.fx : (opt.cx != null ? opt.cx : 0.5),
      fy: opt.fy != null ? opt.fy : (opt.cy != null ? opt.cy : 0.5),
      gradientUnits: opt.units || 'objectBoundingBox'
    }, defs);
    stops.forEach(function (s) {
      make('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] != null ? s[2] : 1 }, g);
    });
    return id;
  }
  function glow(defs, opt) {
    opt = opt || {};
    var id = uid('glow');
    var f = make('filter', {
      id: id,
      x: '-60%', y: '-60%', width: '220%', height: '220%',
      filterUnits: 'objectBoundingBox',
      colorInterpolationFilters: 'sRGB'
    }, defs);
    make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: opt.blur != null ? opt.blur : 6, result: 'b' }, f);
    if (opt.merge === false) return id;
    var m = make('feMerge', {}, f);
    make('feMergeNode', { in: 'b' }, m);
    make('feMergeNode', { in: 'SourceGraphic' }, m);
    return id;
  }
  function blur(defs, dev) {
    var id = uid('blur');
    var f = make('filter', { id: id, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: dev }, f);
    return id;
  }

  /* ---------- 文字 ---------- */
  var FONT_SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun",serif';
  var FONT_SANS = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  var FONT_HAND = '"STKaiti","KaiTi","Noto Serif SC",serif';

  function label(parent, str, opt) {
    opt = opt || {};
    var t = text(parent, str, {
      x: opt.x != null ? opt.x : 0,
      y: opt.y != null ? opt.y : 0,
      'text-anchor': opt.anchor || 'middle',
      'font-family': opt.font || FONT_SERIF,
      'font-size': opt.size || 28,
      'font-weight': opt.weight || 400,
      fill: opt.fill || '#ffffff',
      'letter-spacing': opt.spacing != null ? opt.spacing : 2,
      opacity: opt.opacity != null ? opt.opacity : 1
    });
    if (opt.glow) t.setAttribute('filter', 'url(#' + opt.glow + ')');
    return t;
  }

  /* ---------- 路径 ---------- */
  function poly(points, close) {
    var d = 'M' + points.map(function (p) { return p[0] + ' ' + p[1]; }).join('L');
    return close ? d + 'Z' : d;
  }
  function smoothPath(points, tension) {
    // Catmull-Rom → Bezier
    if (points.length < 2) return '';
    var t = tension == null ? 0.5 : tension;
    var d = 'M' + points[0][0] + ' ' + points[0][1];
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6 * t * 2;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6 * t * 2;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6 * t * 2;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6 * t * 2;
      d += 'C' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + p2[0] + ' ' + p2[1];
    }
    return d;
  }

  /* ---------- 粒子（一次性生成 structure，返回 update(t)） ---------- */
  /**
   * H.particleField(parent, {count, seed, x:[a,b], y:[a,b], r:[a,b], colors:[], opacity, drift, twinkle})
   * 返回 { nodes, update(t, speed) }
   */
  function particleField(parent, o) {
    o = o || {};
    var count = o.count || 40;
    var rand = rng(o.seed || 7);
    var nodes = [];
    var mk = o.el || 'circle';
    for (var i = 0; i < count; i++) {
      var x = lerp(o.x[0], o.x[1], rand());
      var y = lerp(o.y[0], o.y[1], rand());
      var r = lerp(o.r[0], o.r[1], rand());
      var col = (o.colors && o.colors.length) ? o.colors[Math.floor(rand() * o.colors.length)] : '#fff';
      var el = make(mk, {
        cx: x, cy: y, r: r,
        fill: col,
        opacity: (o.opacity != null ? o.opacity : 0.7) * (0.4 + rand() * 0.6)
      }, parent);
      nodes.push({ el: el, x: x, y: y, r: r, sp: 0.3 + rand() * 0.9, ph: rand() * 6.283, amp: 4 + rand() * 18 });
    }
    return {
      nodes: nodes,
      update: function (t, speed) {
        speed = speed == null ? 1 : speed;
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var ny = n.y - t * n.sp * 18 * speed;
          var nx = n.x + Math.sin(t * 0.6 + n.ph) * n.amp;
          ny = mod(ny - (o.y[1] + 40), (o.y[1] - o.y[0]) + 80) - 40 + o.y[0];
          setf(n.el, { cx: nx, cy: ny });
        }
      }
    };
  }

  /* ---------- 文本拆字（用于逐字动画） ---------- */
  function splitChars(parent, str, opt) {
    opt = opt || {};
    var chars = [];
    var x = opt.x || 0, y = opt.y || 0;
    var size = opt.size || 40;
    var spacing = opt.spacing != null ? opt.spacing : size * 1.18;
    var total = (str.length - 1) * spacing;
    var startX = x - total / 2;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === ' ') continue;
      var t = label(parent, ch, {
        x: startX + i * spacing, y: y,
        size: size, fill: opt.fill || '#fff', font: opt.font,
        weight: opt.weight, spacing: 0, opacity: opt.opacity != null ? opt.opacity : 1
      });
      chars.push({ el: t, index: i, x: startX + i * spacing, y: y });
    }
    return chars;
  }

  global.H = {
    SVGNS: SVGNS, W: W, H: HGT,
    make: make, set: set, setf: setf, text: text, uid: uid, label: label,
    clamp: clamp, lerp: lerp, invLerp: invLerp, map: map, fract: fract, mod: mod,
    E: E, ramp: ramp, pulse: pulse, key: key,
    rng: rng, noise: noise, snoise: snoise,
    hexToRgb: hexToRgb, rgbToHex: rgbToHex, mix: mix, rgba: rgba, shade: shade,
    grad: grad, radial: radial, glow: glow, blur: blur,
    poly: poly, smoothPath: smoothPath,
    particleField: particleField, splitChars: splitChars,
    FONT_SERIF: FONT_SERIF, FONT_SANS: FONT_SANS, FONT_HAND: FONT_HAND
  };
})(typeof window !== 'undefined' ? window : this);
