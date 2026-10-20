/* =========================================================================
 * core.js — 播放器核心（霓虹回忆 · DJ Remix 版）
 * 职责：
 *   - 按 timeline.js 在每一句起唱点硬切场景 + 卡点闪白
 *   - 音频驱动：kick 检测出 pulse，传给每个场景做鼓点同步
 *   - 歌词逐字点亮 / 进度条 / 开始与结束遮罩 / 自动播放探测
 *   - 测试钩子：?t=<秒> 冻结画面（无音频，确定性渲染），?debug=1 输出状态
 * ========================================================================= */
(function (global) {
  'use strict';

  var TL = global.TL;
  var H = global.H;
  var A = global.A;
  var W = 1600, HGT = 900;

  var state = {
    booted: false,
    started: false,
    playing: false,
    ended: false,
    audioOn: false,
    t: 0,
    lastNow: 0,
    idleTimer: 0,
    activeId: null,
    prevId: null,
    litCount: -1,
    frames: 0,
    flash: 0
  };

  var instances = {};
  var els = {};
  var globalDefs, sceneRoot, fxRoot;
  var levelSmooth = { energy: 0.5, bass: 0.4, mid: 0.4, treble: 0.3 };
  var pulseState = { v: 0.3, base: 0.35, lastKick: -10 };
  var QS = (function () {
    try {
      var s = (location.search || '').replace(/^\?/, '');
      var h = (location.hash || '').replace(/^#/, '');
      return new URLSearchParams(s + (s && h ? '&' : '') + h);
    } catch (e) {
      return { get: function () { return null; }, has: function () { return false; } };
    }
  })();
  var debugTick = 0;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmtTime(s) {
    s = Math.max(0, s);
    var m = Math.floor(s / 60);
    var ss = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function raf(fn) { return requestAnimationFrame(fn); }

  /* ------------------------------ 错误收集 ------------------------------ */
  var errorLog = [];
  function logError(msg) {
    errorLog.push(String(msg));
    try {
      var box = document.getElementById('__errlog');
      if (!box) {
        box = document.createElement('pre');
        box.id = '__errlog';
        box.style.cssText = 'display:none;white-space:pre-wrap';
        document.body.appendChild(box);
      }
      box.textContent = errorLog.join('\n');
      window.__errors = errorLog;
    } catch (e) { /* ignore */ }
  }
  window.addEventListener('error', function (e) {
    logError('window.error: ' + (e.message || '') + ' @' + (e.filename || '') + ':' + (e.lineno || ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    logError('unhandledrejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason));
  });

  function writeDebug() {
    var box = document.getElementById('__debug');
    if (!box) {
      box = document.createElement('pre');
      box.id = '__debug';
      box.style.cssText = 'display:none';
      document.body.appendChild(box);
    }
    var ae = global.AudioEngine;
    var info = {
      t: +state.t.toFixed(2),
      playing: state.playing,
      audioOn: state.audioOn,
      started: state.started,
      ended: state.ended,
      active: state.activeId,
      pulse: +pulseState.v.toFixed(3),
      levels: levelSmooth,
      audioNow: (ae && typeof ae.now === 'function') ? ae.now() : null,
      audioPlaying: (ae && typeof ae.isPlaying === 'function') ? ae.isPlaying() : null,
      ctxState: (function () { try { var c = ae && ae.context; return c ? c.state : null; } catch (e) { return null; } })(),
      errors: errorLog
    };
    try { box.textContent = 'DEBUG_JSON:' + JSON.stringify(info); } catch (e) {}
  }

  /* ------------------------------- 启动 ------------------------------- */
  function boot() {
    if (state.booted) return;
    state.booted = true;

    els.frame = $('frame');
    els.stage = $('stage');
    els.globalDefs = $('globalDefs');
    els.sceneRoot = $('sceneRoot');
    els.fxRoot = $('fxRoot');
    els.lyricLayer = $('lyricLayer');
    els.lyricIndex = $('lyricIndex');
    els.lyricLine = $('lyricLine');
    els.lyricSub = $('lyricSub');
    els.playBtn = $('playBtn');
    els.replayBtn = $('replayBtn');
    els.progressFill = $('progressFill');
    els.progressHead = $('progressHead');
    els.progressWrap = $('progressWrap');
    els.timeLabel = $('timeLabel');
    els.startOverlay = $('startOverlay');
    els.startBtn = $('startBtn');
    els.endOverlay = $('endOverlay');
    els.replayBtn2 = $('replayBtn2');

    globalDefs = els.globalDefs;
    sceneRoot = els.sceneRoot;
    fxRoot = els.fxRoot;

    layout();
    try {
      document.body.setAttribute('data-qs', String(location.search));
      document.body.setAttribute('data-hash', String(location.hash));
      document.body.setAttribute('data-flag', QS.has('debug') ? 'dbg' : 'nodbg');
    } catch (e) {}

    buildGlobalFx();
    buildTicks();
    bindUI();
    buildAllScenes();
    render(0, 0);

    window.addEventListener('resize', layout);
    if (window.ResizeObserver) new ResizeObserver(layout).observe(els.frame);

    state.lastNow = performance.now();
    raf(tick);
    testHook();

    if (QS.get('audio') === '1') {
      startPlayback(true);
    } else {
      setTimeout(tryAutoplay, 80);
    }
    if (QS.has('debug')) {
      writeDebug();
      setInterval(writeDebug, 120);
    }
  }

  function testHook() {
    var qs;
    try { qs = new URLSearchParams(location.search); } catch (e) { return; }
    if (!qs.has('t')) return;
    var tt = clamp(parseFloat(qs.get('t')) || 0, 0, TL.duration);
    state.started = true;
    state.static = qs.has('export');   // 视频导出：由外部逐帧设置时间，主循环不再推进
    state.playing = qs.get('play') === '1';
    state.t = tt;
    state.activeId = null;
    state.prevId = null;
    els.frame.classList.add('instant');
    els.startOverlay.classList.add('hide');
    els.startOverlay.style.display = 'none';
    els.endOverlay.classList.remove('show');
    // 冻结帧使用确定性“满能量”状态，保证截图里的画面是亮起来的
    levelSmooth.energy = 0.72; levelSmooth.bass = 0.66; levelSmooth.mid = 0.52; levelSmooth.treble = 0.42;
    pulseState.v = 0.78;
    state.flash = 0;
    updatePlayIcon();
    render(tt, 0);
    els.frame.style.setProperty('--pulse', pulseState.v.toFixed(3));
    if (tt >= TL.duration - 0.01) {
      state.t = TL.duration;
      render(TL.duration, 0);
      endPlayback();
    }
  }

  function layout() {
    var w = els.frame ? els.frame.clientWidth : window.innerWidth;
    if (w > 0) els.frame.style.setProperty('--u', String(w / W));
  }

  /* ----------------------------- 全局图层 ----------------------------- */
  function buildGlobalFx() {
    var d = globalDefs;

    // 四角暗角
    var vign = H.radial(d, [[0, '#000', 0], [0.56, '#000', 0.05], [0.82, '#000', 0.34], [1, '#000', 0.72]],
      { cx: 0.5, cy: 0.46, r: 0.8 });
    // 底部歌词区压暗
    var bottom = H.grad(d, [[0, '#05040c', 0], [0.55, '#05040c', 0.34], [1, '#05040c', 0.62]], { y1: 0, y2: 1 });
    // 主色律动光晕（每帧按场景调色）
    var bloom = H.radial(d, [[0, '#54e6ff', 0.6], [0.42, '#54e6ff', 0.18], [1, '#54e6ff', 0]], { cx: 0.5, cy: 0.5, r: 0.6 });
    // 扫描线
    var scanId = H.uid('scan');
    var scan = H.make('pattern', { id: scanId, width: 4, height: 4, patternUnits: 'userSpaceOnUse' }, d);
    H.make('rect', { x: 0, y: 0, width: 4, height: 1, fill: '#a8ecff', opacity: 0.05 }, scan);
    // 颗粒
    var grainId = H.uid('grain');
    var gf = H.make('filter', { id: grainId, x: 0, y: 0, width: '100%', height: '100%' }, d);
    H.make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: 2, seed: 5, stitchTiles: 'stitch' }, gf);
    H.make('feColorMatrix', { type: 'saturate', values: '0' }, gf);
    var ct = H.make('feComponentTransfer', {}, gf);
    H.make('feFuncA', { type: 'linear', slope: 0.06, intercept: 0 }, ct);

    els.bloomRect = H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: H.rgba('#54e6ff', 0.5), opacity: 0.10 }, fxRoot);
    H.make('rect', { x: 0, y: 650, width: W, height: 250, fill: 'url(#' + bottom + ')' }, fxRoot);
    H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + vign + ')', opacity: 0.95 }, fxRoot);
    H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: 'url(#' + scanId + ')', opacity: 0.7 }, fxRoot);
    H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: '#ffffff', filter: 'url(#' + grainId + ')', opacity: 0.5 }, fxRoot);
    // 卡点闪白（场景硬切时）
    els.cutFlash = H.make('rect', { x: 0, y: 0, width: W, height: HGT, fill: '#ffffff', opacity: 0 }, fxRoot);
  }

  function buildTicks() {
    var wrap = els.progressWrap;
    var bg = $('progressBg');
    if (!bg) return;
    TL.all.forEach(function (s, i) {
      if (i === 0) return;
      var tick = document.createElement('div');
      tick.className = 'tick' + (s.index % 5 === 0 || s.index === 15 ? ' major' : '');
      tick.style.left = (s.start / TL.duration * 100) + '%';
      wrap.appendChild(tick);
    });
  }

  /* ------------------------------- 场景 ------------------------------- */
  function getScene(scene) {
    if (instances[scene.id]) return instances[scene.id];
    var def = (global.SCENES || {})[scene.id];
    var inst = {
      id: scene.id,
      scene: scene,
      def: def,
      palette: (def && def.palette) || scene.palette,
      dur: scene.end - scene.start,
      api: null,
      layer: null
    };
    var layer = H.make('g', { 'class': 'scene-layer', 'data-scene': scene.id, opacity: 0, style: 'display:none' }, sceneRoot);
    inst.layer = layer;
    var sdefs = H.make('defs', {}, layer);
    var g = H.make('g', {}, layer);

    // 统一舞台底色（15 个镜头共享同一套灯光/构图基准）
    try {
      if (A && typeof A.frame === 'function') A.frame(g, sdefs, inst.palette);
    } catch (e) { console.error('[frame]', scene.id, e); }

    if (def && typeof def.build === 'function') {
      try {
        inst.api = def.build(g, sdefs, H, W, HGT, scene);
      } catch (e) {
        console.error('[scene build failed]', scene.id, e);
        logError('scene build failed: ' + scene.id + ' ' + (e && e.stack || e));
        inst.api = fallbackScene(g, sdefs, inst.palette);
      }
    } else {
      console.warn('[scene missing]', scene.id);
      logError('scene missing: ' + scene.id);
      inst.api = fallbackScene(g, sdefs, inst.palette);
    }
    if (!inst.api || typeof inst.api.update !== 'function') {
      inst.api = fallbackScene(g, sdefs, inst.palette);
    }
    instances[scene.id] = inst;
    return inst;
  }

  function fallbackScene(g, sdefs, pal) {
    var glow = A.rad(sdefs, pal.accent, [[0, 0.5], [1, 0]]);
    H.make('circle', { cx: 800, cy: 430, r: 360, fill: 'url(#' + glow + ')' }, g);
    A.tag(g, 'PLACEHOLDER', 800, 470, pal.accent2 || pal.accent, { anchor: 'middle', size: 20 });
    return { update: function () {} };
  }

  function buildAllScenes() {
    TL.all.forEach(function (scene) { getScene(scene); });
  }

  function ensureVisible(inst, visible) {
    if (visible) {
      if (inst.layer.style.display === 'none') inst.layer.style.display = '';
    } else if (inst.layer.style.display !== 'none') {
      inst.layer.style.display = 'none';
    }
  }

  function render(t, dt) {
    var active = TL.sceneAt(t);
    var activeInst = instances[active.id] || getScene(active);
    var local = clamp(t - active.start, 0, activeInst.dur);

    if (state.activeId !== active.id) {
      state.prevId = state.activeId;
      state.activeId = active.id;
      onSceneChange(active, activeInst);
      if (state.started) state.flash = 0.62;
    }

    // DJ 版：每一句的起唱点直接硬切，不做长交叉淡化，只留一帧闪白
    ensureVisible(activeInst, true);
    activeInst.layer.setAttribute('opacity', '1');
    for (var lid in instances) {
      if (!Object.prototype.hasOwnProperty.call(instances, lid)) continue;
      if (lid !== active.id) ensureVisible(instances[lid], false);
    }

    var levels = readLevels(t, dt);
    // 卡点以真实音轨离线分析出的脉冲表为准（与音频逐帧对齐，截图也一致）
    if (typeof TL.pulseAt === 'function') pulseState.v = clamp(TL.pulseAt(t), 0, 1);
    var info = {
      t: t,
      local: local,
      duration: activeInst.dur,
      progress: local / activeInst.dur,
      pulse: pulseState.v,
      energy: levels.energy,
      bass: levels.bass,
      mid: levels.mid,
      treble: levels.treble,
      beat: t / TL.beat,
      bar: t / TL.bar,
      index: active.index,
      playing: state.playing
    };
    if (activeInst.api && typeof activeInst.api.update === 'function') {
      try { activeInst.api.update(local, info); }
      catch (e) {
        console.error('[scene update]', active.id, e);
        logError('scene update: ' + active.id + ' ' + (e && e.stack || e));
        activeInst.api = { update: function () {} };
      }
    }

    // 全局律动
    if (els.bloomRect) {
      els.bloomRect.setAttribute('opacity', (0.05 + levels.bass * 0.16 + pulseState.v * 0.05).toFixed(3));
      var ac = activeInst.palette.accent;
      if (els.bloomRect._color !== ac) {
        els.bloomRect._color = ac;
        els.bloomRect.setAttribute('fill', H.rgba(ac, 0.5));
      }
    }
    if (els.cutFlash) {
      var op = state.flash * 0.5;
      if (state.flash > 0.001) {
        els.cutFlash.setAttribute('opacity', op.toFixed(3));
        els.cutFlash.setAttribute('fill', activeInst.palette.accent2 || activeInst.palette.accent);
        state.flash *= Math.pow(0.0005, dt / 0.16);
      } else if (els.cutFlash.getAttribute('opacity') !== '0') {
        els.cutFlash.setAttribute('opacity', '0');
      }
    }
    if (els.frame) els.frame.style.setProperty('--pulse', pulseState.v.toFixed(3));

    updateLyricHighlight(local, activeInst);
    updateProgress(t);
  }

  function readLevels(t, dt) {
    var lv = null;
    if (state.audioOn && global.AudioEngine && typeof global.AudioEngine.levels === 'function') {
      try { lv = global.AudioEngine.levels(); } catch (e) { lv = null; }
    }
    if (lv && typeof lv === 'object') {
      levelSmooth.energy += (clamp(lv.energy || 0, 0, 1) - levelSmooth.energy) * 0.26;
      levelSmooth.bass += (clamp(lv.bass || 0, 0, 1) - levelSmooth.bass) * 0.34;
      levelSmooth.mid += (clamp(lv.mid || 0, 0, 1) - levelSmooth.mid) * 0.28;
      levelSmooth.treble += (clamp(lv.treble || 0, 0, 1) - levelSmooth.treble) * 0.22;
      // 鼓点包络：优先用 AudioEngine 内部基于瞬时低频的 kick 检测
      if (typeof lv.kick === 'number') {
        pulseState.v = clamp(lv.kick, 0, 1);
      } else {
        var bass = levelSmooth.bass;
        pulseState.base += (bass - pulseState.base) * 0.07;
        var thr = pulseState.base * 1.18 + 0.035;
        if (bass > thr && t - pulseState.lastKick > 0.21) {
          pulseState.v = 1;
          pulseState.lastKick = t;
        } else {
          pulseState.v *= Math.pow(0.0015, Math.max(dt, 1 / 240) / 0.26);
        }
      }
    } else {
      // 无音频（截图/预览）时用名义 BPM 的确定性呼吸
      var ph = H.fract(t / TL.beat);
      pulseState.v = Math.pow(1 - ph, 2.3);
      levelSmooth.energy = 0.44 + 0.16 * pulseState.v;
      levelSmooth.bass = 0.34 + 0.30 * pulseState.v;
      levelSmooth.mid = 0.36 + 0.12 * pulseState.v;
      levelSmooth.treble = 0.28 + 0.08 * pulseState.v;
    }
    return levelSmooth;
  }

  /* ------------------------------- 歌词 ------------------------------- */
  function onSceneChange(scene, inst) {
    els.lyricIndex.textContent = (scene.index < 10 ? '0' : '') + scene.index + ' / ' +
      (TL.all.length < 10 ? '0' : '') + TL.all.length + (TL.lineLabel ? ' · ' + TL.lineLabel : '');
    els.lyricLine.innerHTML = '';
    els.lyricLine.className = '';
    var text = scene.lyric || '';
    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === ' ') {
        var sp = document.createElement('span');
        sp.className = 'sep';
        els.lyricLine.appendChild(sp);
        continue;
      }
      var span = document.createElement('span');
      span.className = 'ch';
      span.style.setProperty('--i', String(i));
      span.textContent = ch;
      els.lyricLine.appendChild(span);
      chars.push(span);
    }
    els.lyricSub.textContent = scene.sub || '';
    state.litCount = -1;
    state.chars = chars;
    var line = els.lyricLine;
    raf(function () { raf(function () { line.classList.add('in'); }); });
  }

  function updateLyricHighlight(local, inst) {
    var chars = state.chars;
    if (!chars || !chars.length) return;
    var dur = (inst && inst.dur) || 4;
    var span = Math.max(0.6, dur * 0.66);
    var step = chars.length > 1 ? span / (chars.length - 1) : 0;
    var lit = 0;
    for (var i = 0; i < chars.length; i++) {
      if (local >= 0.1 + i * step) lit++;
    }
    if (lit === state.litCount) return;
    state.litCount = lit;
    for (var j = 0; j < chars.length; j++) {
      chars[j].classList.toggle('lit', j < lit);
    }
  }

  /* ----------------------------- 进度 / UI ----------------------------- */
  function updateProgress(t) {
    var p = clamp(t / TL.duration, 0, 1);
    els.progressFill.style.width = (p * 100).toFixed(3) + '%';
    els.progressHead.style.left = (p * 100).toFixed(3) + '%';
    els.timeLabel.textContent = fmtTime(t) + ' / ' + fmtTime(TL.duration);
  }

  function bindUI() {
    els.startBtn.addEventListener('click', function (e) { e.stopPropagation(); startPlayback(false); });
    els.startOverlay.addEventListener('click', function () { startPlayback(false); });
    els.playBtn.addEventListener('click', togglePlay);
    els.replayBtn.addEventListener('click', replay);
    if (els.replayBtn2) els.replayBtn2.addEventListener('click', replay);

    var fsBtn = $('fsBtn');
    if (fsBtn) fsBtn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        (els.frame.requestFullscreen || function () {}).call(els.frame);
      } else if (document.exitFullscreen) document.exitFullscreen();
    });

    document.addEventListener('keydown', function (e) {
      if (!state.started && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault(); startPlayback(false); return;
      }
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'KeyR') replay();
      if (e.code === 'KeyF') { var b = $('fsBtn'); if (b) b.click(); }
    });

    function poke() {
      els.frame.classList.remove('idle');
      clearTimeout(state.idleTimer);
      state.idleTimer = setTimeout(function () {
        if (state.started) els.frame.classList.add('idle');
      }, 3200);
    }
    window.addEventListener('mousemove', poke, { passive: true });
    window.addEventListener('touchstart', poke, { passive: true });
    poke();
  }

  /* ----------------------------- 播放控制 ----------------------------- */
  function tryAutoplay() {
    if (state.started) return;
    if (!global.AudioEngine) { showStart(); return; }
    var ctx = null;
    try { ctx = global.AudioEngine.init(); } catch (e) { console.warn('audio init failed', e); }
    if (ctx && ctx.state === 'running') {
      startPlayback(true);
    } else {
      showStart();
    }
  }

  function showStart() {
    els.startOverlay.classList.remove('hide');
  }

  function startPlayback(isAuto) {
    if (state.started) return;
    state.started = true;

    function actuallyStart() {
      state.t = 0;
      state.ended = false;
      state.playing = true;
      state.prevId = null;
      state.activeId = null;
      state.litCount = -1;
      state.flash = 0;
      els.startOverlay.classList.add('hide');
      els.endOverlay.classList.remove('show');
      updatePlayIcon();
      state.lastNow = performance.now();
      els.frame.classList.remove('idle');
      state.idleTimer = setTimeout(function () {
        if (state.started) els.frame.classList.add('idle');
      }, 3200);
    }

    if (global.AudioEngine) {
      try {
        var ctx = global.AudioEngine.init();
        if (ctx && ctx.state === 'suspended' && ctx.resume) {
          var p = ctx.resume();
          if (p && p.catch) p.catch(function () {});
        }
        if (global.AudioEngine.ready === false) {
          var waited = 0;
          var iv = setInterval(function () {
            waited += 60;
            if (global.AudioEngine.ready !== false || waited > 2000) {
              clearInterval(iv);
              try { global.AudioEngine.start(0); state.audioOn = true; }
              catch (e) { console.warn('audio start failed', e); state.audioOn = false; }
              actuallyStart();
            }
          }, 60);
          return;
        }
        global.AudioEngine.start(0);
        state.audioOn = true;
      } catch (e) {
        console.warn('audio start failed', e);
        state.audioOn = false;
      }
    }
    actuallyStart();
  }

  function togglePlay() {
    if (!state.started) { startPlayback(false); return; }
    if (state.ended) { replay(); return; }
    state.playing = !state.playing;
    if (state.audioOn && global.AudioEngine) {
      try { state.playing ? global.AudioEngine.resume() : global.AudioEngine.pause(); } catch (e) {}
    }
    updatePlayIcon();
    state.lastNow = performance.now();
  }

  function updatePlayIcon() {
    var ico = els.playBtn.querySelector('.ico');
    if (ico) ico.textContent = state.playing ? '❚❚' : '▶';
    els.playBtn.setAttribute('aria-label', state.playing ? '暂停' : '播放');
  }

  function endPlayback() {
    state.ended = true;
    state.playing = false;
    updatePlayIcon();
    els.endOverlay.classList.add('show');
  }

  function replay() {
    state.t = 0;
    state.ended = false;
    state.playing = true;
    state.activeId = null;
    state.prevId = null;
    state.litCount = -1;
    state.flash = 0;
    els.endOverlay.classList.remove('show');
    els.frame.classList.remove('idle');
    if (global.AudioEngine) {
      try {
        global.AudioEngine.stop();
        global.AudioEngine.start(0);
        state.audioOn = true;
      } catch (e) { console.warn('audio replay failed', e); }
    }
    updatePlayIcon();
    state.lastNow = performance.now();
  }

  /* ------------------------------ 主循环 ------------------------------ */
  function tick(now) {
    if (state.static) {
      // 视频导出模式：只渲染 renderAt() 设定的时间，不推进动画/音频
      render(state.t, 0);
      raf(tick);
      return;
    }
    var dt = Math.min(0.06, Math.max(0, (now - state.lastNow) / 1000));
    state.lastNow = now;

    if (state.playing && !state.ended) {
      state.t += dt;
      if (state.audioOn && global.AudioEngine) {
        try {
          var an = global.AudioEngine.now();
          if (an != null && isFinite(an) && Math.abs(an - state.t) > 0.12) {
            state.t = clamp(an, 0, TL.duration);
          }
        } catch (e) { /* ignore */ }
      }
      if (state.t >= TL.duration) {
        state.t = TL.duration;
        endPlayback();
      }
    }
    render(state.t, dt);
    if (QS.has('debug') && (++debugTick % 10 === 0)) writeDebug();
    raf(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  global.__player = {
    start: startPlayback,
    replay: replay,
    toggle: togglePlay,
    state: state,
    renderAt: function (t) {
      state.t = clamp(Number(t) || 0, 0, TL.duration);
      render(state.t, 0);
      return state.t;
    }
  };
})(typeof window !== 'undefined' ? window : this);
