<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>scene test runner · {{SONG}}</title>
<style>body{background:#0a0d14;color:#d9e8f5;font:12px Consolas,monospace} pre{white-space:pre-wrap}</style>
</head>
<body>
<pre id="out">RUNNING</pre>
<svg id="host" width="1600" height="900" viewBox="0 0 1600 900" style="position:fixed;left:-9999px;top:0"></svg>

<script src="helpers.js"></script>
<script src="timeline.js"></script>
<script src="art.js"></script>
{{SCENE_SCRIPTS}}
<script>
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var TL = window.TL;
  var A = window.A;
  var IDS = TL.scenes.map(function (s) { return s.id; });
  var ARGC = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  var badPaths = [];
  function validPath(d) {
    if (typeof d !== 'string') return true;
    var re = /([A-Za-z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
    var cmd = null, got = 0, m;
    while ((m = re.exec(d))) {
      if (m[1]) {
        var c = m[1].toUpperCase();
        if (!(c in ARGC)) return false;
        if (cmd !== null && ARGC[cmd] > 0 && got % ARGC[cmd] !== 0) return false;
        cmd = c; got = 0;
        if (c === 'Z') cmd = null;
      } else {
        if (cmd === null) return false;
        got++;
      }
    }
    if (cmd !== null && ARGC[cmd] > 0 && got % ARGC[cmd] !== 0) return false;
    return true;
  }
  (function () {
    var orig = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'd' && this.namespaceURI === SVGNS && !validPath(value)) {
        if (badPaths.length < 20) badPaths.push({ scene: window.__curScene || '?', d: String(value).slice(0, 400) });
      }
      return orig.apply(this, arguments);
    };
  })();

  function run() {
    var host = document.getElementById('host');
    var results = [];
    IDS.forEach(function (id) {
      window.__curScene = id;
      var scene = TL.scenes.filter(function (s) { return s.id === id; })[0];
      var dur = scene.dur;
      var r = { id: id, loaded: !!window.SCENES[id], ok: true, nodes: 0, msPerFrame: 0, errors: [] };
      var def = window.SCENES[id];
      if (!def) { r.ok = false; r.errors.push('scene not loaded'); results.push(r); return; }
      var dfs = document.createElementNS(SVGNS, 'defs');
      var g = document.createElementNS(SVGNS, 'g');
      host.appendChild(dfs); host.appendChild(g);
      var api = null;
      try {
        A.frame(g, dfs, scene.palette);
        api = def.build(g, dfs, window.H, 1600, 900, scene);
      } catch (e) {
        r.ok = false; r.errors.push('build: ' + (e && e.stack || e));
      }
      if (api && typeof api.update === 'function') {
        var frames = Math.round(dur / 0.05);
        var t0 = performance.now();
        for (var f = 0; f <= frames; f++) {
          var t = f * 0.05;
          var pulse = (typeof TL.pulseAt === 'function' && TL.pulseHex) ? TL.pulseAt(t) : Math.pow(1 - ((t / TL.beat) % 1), 2.3);
          try {
            api.update(t, {
              t: t, local: t, duration: dur, progress: t / dur,
              pulse: pulse, energy: 0.6, bass: 0.5, mid: 0.5, treble: 0.4,
              beat: t / TL.beat, bar: t / TL.bar, playing: true
            });
          } catch (e) {
            r.ok = false;
            r.errors.push('update@' + t.toFixed(2) + ': ' + (e && e.message || e));
            break;
          }
        }
        r.msPerFrame = +((performance.now() - t0) / (frames + 1)).toFixed(3);
        r.nodes = g.querySelectorAll('*').length + dfs.querySelectorAll('*').length;
      } else if (api) {
        r.ok = false; r.errors.push('no update() returned');
      }
      r.externalRefs = g.querySelectorAll('image,foreignObject').length;
      r.httpRefs = (g.outerHTML.match(/https?:\/\//g) || []).length;
      host.removeChild(g); host.removeChild(dfs);
      results.push(r);
    });
    var summary = {
      total: results.length,
      loaded: results.filter(function (x) { return x.loaded; }).length,
      failed: results.filter(function (x) { return !x.ok; }).length,
      maxNodes: Math.max.apply(null, results.map(function (x) { return x.nodes || 0; })),
      maxMs: Math.max.apply(null, results.map(function (x) { return x.msPerFrame || 0; })),
      badPaths: badPaths
    };
    document.getElementById('out').textContent = 'RESULT_JSON:' + JSON.stringify({ summary: summary, results: results }, null, 1);
  }
  try { run(); } catch (e) {
    document.getElementById('out').textContent = 'RESULT_JSON:{"fatal":"' + String(e && e.stack || e).replace(/"/g, "'") + '"}';
  }
})();
</script>
</body>
</html>
