<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{SONG}} · 歌词视频</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div id="app">
  <div id="frame">
    <!-- SVG 舞台 1600x900 -->
    <svg id="stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs id="globalDefs"></defs>
      <g id="sceneRoot"></g>
      <g id="fxRoot"></g>
    </svg>

    <!-- HTML 覆盖层 -->
    <div id="overlay">
      <div id="lyricLayer">
        <div id="lyricIndex"></div>
        <div id="lyricLine"></div>
        <div id="lyricSub"></div>
      </div>

      <footer id="controls">
        <button class="ctrl-btn" id="playBtn" aria-label="播放"><span class="ico">▶</span></button>
        <button class="ctrl-btn" id="replayBtn">重播</button>
        <div id="progressWrap"><div id="progressBg"><div id="progressFill"></div><div id="progressHead"></div></div></div>
        <div id="timeLabel">00:00 / {{TOTAL_LABEL}}</div>
        <span id="audioTag">♪ {{AUDIO_LABEL}}</span>
        <button class="ctrl-btn" id="fsBtn">全屏</button>
      </footer>

      <div id="startOverlay">
        <div class="start-kicker">{{KICKER}}</div>
        <h1 class="start-title">{{SONG}}</h1>
        <div class="start-artist">{{START_ARTIST}}</div>
        <div class="start-divider"></div>
        <button id="startBtn">▶ 点击开始</button>
        <div class="start-eq">
          <i style="animation-delay:0s"></i><i style="animation-delay:.12s"></i><i style="animation-delay:.24s"></i>
          <i style="animation-delay:.36s"></i><i style="animation-delay:.48s"></i><i style="animation-delay:.60s"></i>
          <i style="animation-delay:.72s"></i><i style="animation-delay:.84s"></i><i style="animation-delay:.96s"></i>
          <i style="animation-delay:1.08s"></i><i style="animation-delay:1.20s"></i><i style="animation-delay:1.32s"></i>
        </div>
        <div class="start-note">{{START_NOTE}}</div>
      </div>

      <div id="endOverlay">
        <div class="end-kicker">THE END</div>
        <div class="end-title">{{SONG}}</div>
        <div class="end-msg">{{END_MSG}}</div>
        <button id="replayBtn2">↺ 再看一次</button>
      </div>

      <div id="rotateHint">请将设备横屏观看<br>以获得完整的 16:9 电影画面</div>
    </div>
  </div>
</div>

<script src="helpers.js"></script>
<script src="timeline.js"></script>
<script src="art.js"></script>
{{SCENE_SCRIPTS}}
<script src="audio-data.js"></script>
<script src="audio.js"></script>
<script src="core.js"></script>
</body>
</html>
