#!/usr/bin/env python
"""Check that a track's vocal onsets align with given lyric line timestamps."""
import sys, wave
import numpy as np

path = sys.argv[1]
targets = [70.05, 73.41, 76.86, 80.28, 84.15, 87.60, 91.05, 94.02, 97.26, 100.14, 103.62, 107.01, 110.43, 113.88, 117.24]

with wave.open(path, 'rb') as w:
    sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768.0
if ch == 2:
    x = x.reshape(-1, 2).mean(axis=1)

nfft, hop = 2048, 256
win = np.hanning(nfft).astype(np.float32)
frames = 1 + (len(x) - nfft) // hop
S = np.zeros((frames, nfft // 2 + 1), dtype=np.float32)
for i in range(frames):
    S[i] = np.abs(np.fft.rfft(x[i*hop:i*hop+nfft] * win))
freqs = np.fft.rfftfreq(nfft, 1.0/sr)
t = (np.arange(frames) * hop) / sr
band = (freqs >= 500) & (freqs < 4000)
e = np.log1p(S[:, band].sum(axis=1) * 3)
flux = np.maximum(0, np.diff(e))
k = np.hanning(11); k /= k.sum()
env = np.convolve(flux, k, mode='same')
tt = t[:len(env)]
# adaptive peaks
base = np.zeros_like(env)
for i in range(1, len(env)):
    base[i] = base[i-1] + (env[i] - base[i-1]) * 0.02
thr = base * 1.7 + 0.02
peaks = []
for i in range(2, len(env) - 2):
    if env[i] > thr[i] and env[i] >= env[i-1] and env[i] >= env[i+1]:
        if not peaks or tt[i] - peaks[-1] > 0.22:
            peaks.append(tt[i])
peaks = np.array(peaks)
print('peaks in 65..130s:', ' '.join('%.2f' % p for p in peaks[(peaks > 65) & (peaks < 130)]))
print('target -> nearest peak, delta:')
hit = 0
for tg in targets:
    cand = peaks[np.abs(peaks - tg) < 1.2]
    if len(cand) == 0:
        print('  %.2f -> none' % tg)
        continue
    near = cand[np.argmin(np.abs(cand - tg))]
    d = near - tg
    if abs(d) < 0.35: hit += 1
    print('  %.2f -> %.2f (%+.2f)' % (tg, near, d))
print('hits within 0.35s: %d / %d' % (hit, len(targets)))
