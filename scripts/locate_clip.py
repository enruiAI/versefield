#!/usr/bin/env python
"""Locate a short clip inside a longer track by onset-envelope cross-correlation."""
import sys, wave
import numpy as np

def load(path):
    with wave.open(path, 'rb') as w:
        sr = w.getframerate(); ch = w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768.0
    if ch == 2:
        x = x.reshape(-1, 2).mean(axis=1)
    return x, sr

def onset_env(x, sr, fps=100):
    nfft, hop = 2048, int(sr / fps)
    win = np.hanning(nfft).astype(np.float32)
    frames = 1 + (len(x) - nfft) // hop
    S = np.zeros((frames, nfft // 2 + 1), dtype=np.float32)
    for i in range(frames):
        S[i] = np.abs(np.fft.rfft(x[i*hop:i*hop+nfft] * win))
    e = np.log1p(S.sum(axis=1) * 3)
    flux = np.concatenate([[0], np.maximum(0, np.diff(e))])
    env = flux / (flux.std() + 1e-9)
    return env

full, sr1 = load(sys.argv[1])
clip, sr2 = load(sys.argv[2])
assert sr1 == sr2
fps = 100
ef = onset_env(full, sr1, fps)
ec = onset_env(clip, sr2, fps)
# normalize clip
ec = ec - ec.mean()
best = None
N = len(ec)
for i in range(0, len(ef) - N):
    seg = ef[i:i+N]
    seg = seg - seg.mean()
    denom = (np.linalg.norm(seg) * np.linalg.norm(ec))
    if denom < 1e-9: continue
    score = float(np.dot(seg, ec) / denom)
    if best is None or score > best[1]:
        best = (i, score)
print('full %.2fs clip %.2fs' % (len(full)/sr1, len(clip)/sr2))
print('best offset %.2fs  correlation %.3f' % (best[0] / fps, best[1]))
# top 5 local peaks
scores = []
step = 1
for i in range(0, len(ef) - N, step):
    seg = ef[i:i+N]; seg = seg - seg.mean()
    d = (np.linalg.norm(seg) * np.linalg.norm(ec))
    if d < 1e-9: continue
    scores.append((float(np.dot(seg, ec) / d), i / fps))
scores.sort(reverse=True)
seen = []
for sc, t in scores:
    if all(abs(t - s) > 2 for s in seen):
        seen.append(t)
        print('  peak corr %.3f at %.2fs' % (sc, t))
    if len(seen) >= 5: break
