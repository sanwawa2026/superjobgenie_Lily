#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 narration.txt 自動切句並估算時間碼，產出繁體中文字幕 .srt。
閱讀速度預設 3.5 字/秒（台灣腔、沉穩說書節奏），每個【停頓】+1.2 秒。"""
import re, os

base = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(base, "narration.txt")
out = os.path.join(base, "第1集_白眉先生_字幕.srt")

with open(src, encoding="utf-8") as f:
    text = f.read()

# 把【停頓】轉成內部暫停標記，便於計數與清除
text = text.replace("【停頓】", "\u0001")

# 以句尾標點切 cue，保留標點
cues = re.split(r"(?<=[。！？])", text)
cues = [c.strip() for c in cues if c.strip()]

CHARS_PER_SEC = 3.5
PAUSE_SEC = 1.2
GAP_SEC = 0.3

def fmt(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    sec = int(s)
    ms = int(round((s - sec) * 1000))
    if ms == 1000:
        sec += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"

t = 0.0
lines = []
for i, cue in enumerate(cues, 1):
    pauses = cue.count("\u0001")
    disp = cue.replace("\u0001", "")
    n = len(disp)
    dur = n / CHARS_PER_SEC + pauses * PAUSE_SEC
    start = t
    end = t + dur
    lines.append(str(i))
    lines.append(f"{fmt(start)} --> {fmt(end)}")
    lines.append(disp)
    lines.append("")
    t = end + GAP_SEC

with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"字幕已產出：{out}")
print(f"總時長約：{fmt(t)}（{len(cues)} 句）")
