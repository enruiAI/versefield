/* =========================================================================
 * audio.js — 真实音轨版 AudioEngine（cici_ DJ 版 53.7s 截段）
 *
 * 音源：assets/song_dj_clip.mp3（cici_《把回忆拼好给你》DJ 版，DJ 阿卓 Remix 完整曲 2:51.5
 *       的截段：01:09.60 → 02:03.30，从「我们都是渺小真实存在」到「爱炙热的你却忘了爱自己」）
 *   - 53.70s / 128kbps / 44.1kHz 立体声，峰值约 -1dBFS
 *   - 音频已 base64 内联在 src/audio-data.js（window.__SONG_AUDIO_DATA_URL）
 *
 * 接口与 CONTRACT.md 第 5 节完全一致：
 *   window.AudioEngine = { duration, ready, init(), start(offset), pause(), resume(),
 *                          stop(), now(), isPlaying(), analyser, levels() }
 * 画面主循环只用 now() / levels()，与具体实现无关。
 * ========================================================================= */
(function (global) {
  'use strict';

  var DATA_URL = global.__SONG_AUDIO_DATA_URL || '';
  var FALLBACK_DURATION = 53.70;

  var _ctx = null;
  var _gain = null;
  var _analyser = null;
  var _buffer = null;
  var _src = null;
  var _freq = null;
  var _time = null;
  var _decodePromise = null;
  var _pendingStart = null;
  var _state = 'idle';        // idle | playing | paused | ended
  var _startCtxTime = 0;      // 播放位置为 0 时的 ctx.currentTime
  var _pausedAt = 0;
  var _lv = { energy: 0, bass: 0, mid: 0, treble: 0, kick: 0 };
  var _kAnalyser = null;
  var _kfreq = null;
  var _nyquist = 22050;
  var _bandIdx = null;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function duration() { return _buffer ? _buffer.duration : FALLBACK_DURATION; }

  /* ------------------------------------------------------------------ */
  function init() {
    if (_ctx) return _ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) {
      console.warn('[AudioEngine] 当前环境不支持 Web Audio API');
      return null;
    }
    _ctx = new AC();
    _gain = _ctx.createGain();
    _gain.gain.value = 1.0;
    _analyser = _ctx.createAnalyser();
    _analyser.fftSize = 2048;
    _analyser.smoothingTimeConstant = 0.72;
    _gain.connect(_analyser);
    _analyser.connect(_ctx.destination);
    _freq = new Uint8Array(_analyser.frequencyBinCount);
    // 专用于鼓点检测的分析器：不做时间平滑，保留 kick 的瞬态
    _kAnalyser = _ctx.createAnalyser();
    _kAnalyser.fftSize = 1024;
    _kAnalyser.smoothingTimeConstant = 0.15;
    _gain.connect(_kAnalyser);
    _kfreq = new Uint8Array(_kAnalyser.frequencyBinCount);
    _time = new Float32Array(_analyser.fftSize);
    var nyquist = _ctx.sampleRate / 2;
    _nyquist = nyquist;
    var bins = _analyser.frequencyBinCount;
    _bandIdx = {
      bassEnd: Math.max(1, Math.round(250 / nyquist * bins)),
      midEnd: Math.max(2, Math.round(2000 / nyquist * bins)),
      trebEnd: Math.max(3, Math.round(8000 / nyquist * bins))
    };
    decodeAsync();
    return _ctx;
  }

  /** 页面加载时就解码（无需用户手势），点击开始时通常已就绪 */
  function decodeAsync() {
    if (_decodePromise || !_ctx) return _decodePromise;
    if (!DATA_URL) {
      console.warn('[AudioEngine] 缺少内联音频数据');
      return null;
    }
    var b64 = DATA_URL.split(',')[1] || '';
    var bin = global.atob(b64);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    _decodePromise = _ctx.decodeAudioData(bytes.buffer).then(function (buf) {
      _buffer = buf;
      if (_pendingStart != null) {
        var off = _pendingStart;
        _pendingStart = null;
        _playOffset(off);
      }
    }).catch(function (e) {
      console.error('[AudioEngine] 音频解码失败：', e);
    });
    return _decodePromise;
  }

  function stopSource() {
    if (_src) {
      try { _src.onended = null; _src.stop(); } catch (e) { /* ignore */ }
      try { _src.disconnect(); } catch (e) { /* ignore */ }
      _src = null;
    }
  }

  function _playOffset(offset) {
    if (!_ctx) return;
    offset = clamp(Number(offset) || 0, 0, Math.max(0, duration() - 0.01));
    if (!_buffer) { _pendingStart = offset; return; }
    stopSource();
    _src = _ctx.createBufferSource();
    _src.buffer = _buffer;
    _src.connect(_gain);
    _startCtxTime = _ctx.currentTime - offset;
    try { _src.start(0, offset); } catch (e) { console.warn('[AudioEngine] 起播失败', e); }
    _state = 'playing';
  }

  /* ------------------------------------------------------------------ */
  function start(offsetSeconds) {
    if (!_ctx) init();
    if (!_ctx) return;
    var offset = Number(offsetSeconds) || 0;
    var pr = _ctx.resume();
    if (pr && pr.catch) pr.catch(function () {});
    if (!_buffer) { _pendingStart = clamp(offset, 0, duration()); _state = 'playing'; return; }
    _playOffset(offset);
  }

  function pause() {
    if (_state !== 'playing') return;
    _pausedAt = now();
    _state = 'paused';
    if (_ctx && _ctx.suspend) {
      var p = _ctx.suspend();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function resume() {
    if (_state !== 'paused') return;
    _state = 'playing';
    if (_ctx && _ctx.resume) {
      var p = _ctx.resume();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function stop() {
    stopSource();
    _state = 'idle';
    _pausedAt = 0;
    _pendingStart = null;
    _lv.energy = _lv.bass = _lv.mid = _lv.treble = 0; _lv.kick = 0; _kick.env = 0;
    if (_ctx && _ctx.state === 'running' && _ctx.suspend) {
      var p = _ctx.suspend();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function now() {
    if (_state === 'idle') return null;
    if (_state === 'paused') return _pausedAt;
    if (_state === 'ended') return duration();
    if (!_ctx) return null;
    return clamp(_ctx.currentTime - _startCtxTime, 0, duration());
  }

  function isPlaying() {
    return _state === 'playing';
  }

  // 这段 DJ 混音低频很满，归一化系数按实测校准（tools/probe-raw-levels.mjs）：
  // 原始频段均值 bass .78 / mid .58 / treble .41 → 映射到 0..1 后保留起伏
  var _kick = { env: 0, base: 0.55, last: -1, lastT: 0 };

  function levels() {
    if (!_analyser || _state !== 'playing') {
      _lv.energy *= 0.9;
      _lv.bass *= 0.9;
      _lv.mid *= 0.9;
      _lv.treble *= 0.9;
      _lv.kick *= 0.8;
      return _lv;
    }
    _analyser.getByteFrequencyData(_freq);
    _analyser.getFloatTimeDomainData(_time);
    var i;
    var bass = 0, mid = 0, treb = 0;
    for (i = 1; i < _bandIdx.bassEnd; i++) bass += _freq[i];
    for (i = _bandIdx.bassEnd; i < _bandIdx.midEnd; i++) mid += _freq[i];
    for (i = _bandIdx.midEnd; i < _bandIdx.trebEnd; i++) treb += _freq[i];
    var nb = Math.max(1, _bandIdx.bassEnd - 1);
    var nm = Math.max(1, _bandIdx.midEnd - _bandIdx.bassEnd);
    var nt = Math.max(1, _bandIdx.trebEnd - _bandIdx.midEnd);
    var b = Math.min(1, Math.pow(bass / nb / 255, 1.5) * 0.85);
    var m = Math.min(1, Math.pow(mid / nm / 255, 1.1) * 0.95);
    var t = Math.min(1, Math.pow(treb / nt / 255, 1.0) * 1.2);
    // 时域 RMS 补充“响度”感
    var rms = 0;
    for (i = 0; i < _time.length; i++) { var v = _time[i]; rms += v * v; }
    rms = Math.sqrt(rms / _time.length);
    var e = Math.min(1, rms * 1.9 + b * 0.24 + m * 0.22 + t * 0.12);
    _lv.energy += (e - _lv.energy) * 0.25;
    _lv.bass += (b - _lv.bass) * 0.3;
    _lv.mid += (m - _lv.mid) * 0.28;
    _lv.treble += (t - _lv.treble) * 0.22;

    // ---- 鼓点检测：专用无平滑分析器（1024 点）的低频瞬态抬升 ----
    var nowT = _ctx ? _ctx.currentTime : 0;
    var dt = Math.max(0, Math.min(0.1, nowT - _kick.lastT));
    _kick.lastT = nowT;
    var kb = 0;
    if (_kAnalyser) {
      _kAnalyser.getByteFrequencyData(_kfreq);
      var kEnd = Math.max(4, Math.round(180 / _nyquist * _kfreq.length));
      for (var ki = 1; ki < kEnd; ki++) kb += _kfreq[ki];
      kb = kb / (kEnd - 1) / 255;
    }
    _kick.kb = kb;
    _kick.base += (kb - _kick.base) * 0.04;
    var thr = _kick.base * 1.30 + 0.02;
    _lv.kickStrength = kb;
    if (kb > thr && nowT - _kick.last > 0.18) {
      _kick.env = 1;
      _kick.last = nowT;
      _kick.hits = (_kick.hits || 0) + 1;
    } else {
      _kick.env *= Math.pow(0.0015, dt / 0.24);
    }
    _lv.kick = _kick.env;
    return _lv;
  }

  /* ------------------------------------------------------------------ */
  var API = {
    init: init,
    start: start,
    pause: pause,
    resume: resume,
    stop: stop,
    now: now,
    isPlaying: isPlaying,
    levels: levels
  };
  Object.defineProperty(API, 'duration', { get: function () { return duration(); }, enumerable: true });
  Object.defineProperty(API, 'ready', { get: function () { return !!_buffer; }, enumerable: true });
  Object.defineProperty(API, 'analyser', { get: function () { return _analyser; }, enumerable: true });
  Object.defineProperty(API, 'context', { get: function () { return _ctx; }, enumerable: true });

  global.AudioEngine = API;
})(typeof window !== 'undefined' ? window : this);
