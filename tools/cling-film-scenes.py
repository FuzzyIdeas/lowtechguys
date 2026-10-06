#!/usr/bin/env python3
"""Scene list of the Cling film, read from its HyperFrames project, with a poster per scene.

    python3 tools/cling-film-scenes.py [path/to/cling-showcase-v2]

Reads hf/scenes.js (each `SC.push({ id, dur })` in frames at 60 fps, its `makeHead` titles), checks
the frame total against final.mp4, grabs a poster from the middle of each scene with ffmpeg, and
writes web/scenes.json + web/posters/ inside the film project. A scene with a second on-screen title
(this.h2) becomes two sections, split just before that title rises. Then run tools/cling-chapters.py.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

FILM = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Temp/.claude-work/cling-showcase-v2"
FPS = 60
# Second halves get their own id; scenes without a title on screen get one here
# (the wording lives in ~/Temp/.claude-work/cling-site-copy.md).
SECOND_ID = {"drives": "disconnected", "stash": "scripts"}
NAMED = {"speed": "Speed and memory", "end": "Cling"}

src = (FILM / "hf/scenes.js").read_text()
blocks = re.split(r"\nSC\.push\(\{", src)[1:]
scenes = []
t = 0
for b in blocks:
    m = re.match(r'\s*id: "([^"]+)", dur: (\d+)', b)
    if not m:
        sys.exit(f"cannot read the id and dur of: {b[:80]!r}")
    sid, dur = m.group(1), int(m.group(2))
    # a title set on two lines (["Search your Mac", "from your phone"]) reads as one
    heads = {k: " ".join(re.findall(r'"([^"]+)"', v)) for k, v in re.findall(r'this\.(h2?) = makeHead\(Rg, \[([^\]]+)\]\)', b)}
    title = heads.get("h") or NAMED.get(sid)
    if not title:
        sys.exit(f"scene {sid} has no title on screen: add it to NAMED")
    h2 = re.search(r"drawHead\(this\.h2, l, [\d.]+, [\d.]+, (\d+)", b)
    if "h2" in heads and h2:
        cut = int(h2.group(1)) - 6
        scenes.append((sid, title, t, t + cut))
        scenes.append((SECOND_ID.get(sid, sid + "2"), heads["h2"], t + cut, t + dur))
    else:
        scenes.append((sid, title, t, t + dur))
    t += dur

video = FILM / "final.mp4"
duration = float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
    check=True, capture_output=True, text=True).stdout)
if abs(duration - t / FPS) > 1.5 / FPS:
    sys.exit(f"hf/scenes.js adds up to {t / FPS:.3f}s but final.mp4 is {duration:.3f}s: render the film first")

posters = FILM / "web/posters"
# seconds before the scene ends to grab its poster, for scenes whose middle is mid-animation
SETTLED = {"speed": 0.4, "fileserver": 0.55}  # fileserver: the timelapse playing in the installed app
posters.mkdir(parents=True, exist_ok=True)
out = []
for n, (sid, title, a, b) in enumerate(scenes, 1):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    poster = f"posters/{n:02d}-{slug}.jpg"
    mid = (a + b) / 2 / FPS
    if sid in SETTLED:  # stats that count up in sequence, a phone that keeps moving: take a settled frame near the end
        mid = b / FPS - SETTLED[sid]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{mid:.3f}", "-i", str(video), "-frames:v", "1",
                    "-q:v", "2", str(FILM / "web" / poster)], check=True)
    out.append({"n": n, "id": sid, "title": title, "start": round(a / FPS, 3), "end": round(b / FPS, 3), "poster": poster})

(FILM / "web/scenes.json").write_text(json.dumps(out, indent=1) + "\n")
print(f"{len(out)} scenes, {t / FPS:.3f}s, written to {FILM / 'web/scenes.json'}")
