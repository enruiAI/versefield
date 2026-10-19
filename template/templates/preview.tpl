<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Scene Preview · {{SONG}}</title>
<style>
  html, body { margin:0; padding:0; background:#05040c; color:#eaf6ff; overflow:hidden;
    font-family:"Microsoft YaHei",sans-serif; }
  #wrap { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; }
  #stage { width:min(100vw, calc(100vh * 16 / 9)); height:min(100vh, calc(100vw * 9 / 16));
    box-shadow:0 0 80px rgba(0,0,0,.85); background:#05040c; }
  #hud { position:fixed; left:12px; top:10px; font-size:12px; line-height:1.6;
    background:rgba(2,8,16,.72); border:1px solid rgba(80,220,255,.25); border-radius:8px;
    padding:8px 12px; pointer-events:none; z-index:9; }
  #hud b { color:#5fe8ff; }
  #err { position:fixed; left:12px; bottom:12px; max-width:70vw; color:#ff9a9a;
    font:12px/1.5 Consolas,monospace; white-space:pre-wrap; display:none;
    background:rgba(40,0,0,.88); border:1px solid #a33; border-radius:6px; padding:8px 10px; z-index:10; }
  #ctrl { position:fixed; right:12px; top:10px; z-index:9; display:flex; gap:8px; align-items:center;
    background:rgba(2,8,16,.72); border:1px solid rgba(80,220,255,.25); border-radius:8px; padding:6px 10px; }
  #ctrl input[type=range] { width:240px; }
  #ctrl button { background:#0c1a26; color:#cfefff; border:1px solid #274a5e; border-radius:5px; padding:3px 9px; cursor:pointer; }
  #ctrl button:hover { border-color:#5fe8ff; color:#fff; }
  #ctrl span { font-size:11px; color:#8fb6c8; min-width:64px; text-align:right; }
</style>
</head>
<body>
<div id="wrap">
  <svg id="stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs id="sceneDefs"></defs>
    <g id="guideLayer"></g>
    <g id="sceneRoot"></g>
    <g id="uiLayer"></g>
  </svg>
</div>
<div id="hud"></div>
<div id="err"></div>
<div id="ctrl">
  <button id="play">暂停</button>
  <input id="slider" type="range" min="0" max="3" step="0.01" value="0">
  <span id="tval">0.00s</span>
</div>

<script src="helpers.js"></script>
<script src="timeline.js"></script>
<script src="art.js"></script>
{{SCENE_SCRIPTS}}
<script>
(function () {
  'use strict';
  var qs = new URLSearchParams(location.search);
  var H = window.H, A = window.A, TL = window.TL;
  var svg = document.getElementById('stage');
  var defs = document.getElementById('sceneDefs');
  var sceneRoot = document.getElementById('sceneRoot');
  var guideLayer = document.getElementById('guideLayer');
  var hud = document.getElementById('hud');
  var errBox = document.getElementById('err');
  var slider = document.getElementById('slider');
  var tval = document.getElementById('tval');
  var playBtn = document.getElementById('play');

  var guid = qs.get('scene') || TL.scenes[0].id;
  var t0 = parseFloat(qs.get('t') || '0');
  var animate = qs.get('anim') !== '0';
  var showGuides = qs.get('guides') !== '0';
  var scene = TL.scenes.filter(function (s) { return s.id === guid; })[0];
  var dur = scene ? scene.dur : 3;
  var def = (window.SCENES || {})[guid];
  var pal = scene ? scene.palette : TL.scenes[0].palette;

  slider.max = dur.toFixed(2);

  function showErr(msg) { errBox.style.display = 'block'; errBox.textContent = msg; }

  var api = null;
  var bg = H.make('g', {}, sceneRoot);
  var g = H.make('g', { 'class': 'scene' }, sceneRoot);
  if (!def) {
    showErr('找不到场景 "' + guid + '"（文件还没交付？已加载：' + Object.keys(window.SCENES || {}).join(', ') + '）');
  } else {
    try {
      A.frame(bg, defs, pal);
      api = def.build(g, defs, H, 1600, 900, scene);
    } catch (e) {
      showErr('build() 抛错: ' + (e && e.stack || e));
    }
  }

  if (showGuides) {
    var gg = guideLayer;
    H.make('rect', { x: 0, y: 0, width: 1600, height: 130, fill: 'rgba(255,255,255,0.03)' }, gg);
    H.text(gg, '顶部标题区 y:0–130（固定 HTML 标题）', { x: 30, y: 70, fill: 'rgba(150,240,255,0.5)', 'font-size': 18, 'font-family': H.FONT_SANS });
    H.make('rect', { x: 90, y: 150, width: 1420, height: 470, fill: 'none', stroke: 'rgba(120,255,200,0.16)', 'stroke-dasharray': '8 8' }, gg);
    H.text(gg, 'SAFE  x:90–1510  y:150–620', { x: 100, y: 175, fill: 'rgba(120,255,200,0.30)', 'font-size': 14, 'font-family': 'Consolas,monospace' }, gg);
    H.make('rect', { x: 0, y: 620, width: 1600, height: 280, fill: 'rgba(255,255,255,0.025)' }, gg);
    H.text(gg, '歌词区 y:620–900（固定 HTML 歌词）', { x: 30, y: 730, fill: 'rgba(255,255,255,0.18)', 'font-size': 18, 'font-family': H.FONT_SANS }, gg);
  }

  var swatches = ['accent', 'accent2', 'bg1', 'bg2'].map(function (k) {
    var c = pal[k] || '#000';
    return '<span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:' + c + ';margin-right:4px;vertical-align:-1px;border:1px solid #555"></span>' + k;
  }).join(' ');
  hud.innerHTML = '<b>' + guid + '</b> · ' + (def ? '已加载' : '未找到') +
    '<br>' + (scene ? scene.lyric : '') +
    '<br>时长 ' + dur.toFixed(2) + 's · t=<b id="hudT">' + t0.toFixed(2) + '</b>' +
    '<br>' + swatches +
    '<br><span style="opacity:.55">G 参考线 · 滑块 / ←→ 调时间 · 空格播放</span>';

  var T = t0;
  var playing = animate;
  var last = performance.now();

  function pulseOf(t) {
    if (typeof TL.pulseAt === 'function' && TL.pulseHex) return TL.pulseAt(t);
    var p = (t / TL.beat) % 1;
    return Math.pow(1 - p, 2.3);
  }
  function info() {
    var pulse = pulseOf(T);
    return {
      t: T, local: T, duration: dur, progress: T / dur,
      pulse: pulse, energy: 0.5 + pulse * 0.25, bass: 0.4 + pulse * 0.35,
      mid: 0.45, treble: 0.3, beat: T / TL.beat, bar: T / TL.bar, playing: playing
    };
  }
  function render() {
    if (!api) return;
    try { api.update(T, info()); }
    catch (e) { showErr('update() 抛错 @t=' + T.toFixed(2) + ': ' + (e && e.stack || e)); api = null; }
    slider.value = T;
    tval.textContent = T.toFixed(2) + 's';
    var ht = document.getElementById('hudT');
    if (ht) ht.textContent = T.toFixed(2);
  }
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) { T += dt; if (T >= dur) T = 0; }
    render();
    requestAnimationFrame(loop);
  }
  render();
  requestAnimationFrame(loop);

  slider.addEventListener('input', function () { T = parseFloat(slider.value); playing = false; playBtn.textContent = '播放'; render(); });
  playBtn.addEventListener('click', function () { playing = !playing; playBtn.textContent = playing ? '暂停' : '播放'; last = performance.now(); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'g' || e.key === 'G') guideLayer.style.display = guideLayer.style.display === 'none' ? '' : 'none';
    if (e.key === 'ArrowRight') { T = Math.min(dur, T + 0.05); playing = false; playBtn.textContent = '播放'; render(); }
    if (e.key === 'ArrowLeft') { T = Math.max(0, T - 0.05); playing = false; playBtn.textContent = '播放'; render(); }
    if (e.key === ' ') { playing = !playing; playBtn.textContent = playing ? '暂停' : '播放'; last = performance.now(); e.preventDefault(); }
  });
})();
</script>
</body>
</html>
