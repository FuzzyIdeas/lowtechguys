#!/usr/bin/env python3
"""Chapter thumbs under the Cling film, generated from the film's scenes.json.

    python3 tools/cling-film-scenes.py [path/to/cling-showcase-v2]   # scenes.json + posters from the film
    python3 tools/cling-chapters.py [path/to/scenes.json]

Writes a retina WebP thumb per section to public/static/img/cling-chapters/<id>.webp (any ICC profile kept)
and rewrites the block between the `/ chapters:begin` and `/ chapters:end` markers in
src/cling/index.plim. Re-run it whenever the film is re-rendered: section times, titles and posters all
come from scenes.json. The end card is not a section, so it gets no thumb.
"""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENES = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Temp/.claude-work/cling-showcase-v2/web/scenes.json"
THUMBS = ROOT / "public/static/img/cling-chapters"
PAGE = ROOT / "src/cling/index.plim"
SKIP = {"end"}
# Thumbs show at up to 120 css px wide; 2x for retina.
WIDTH, HEIGHT = 240, 135

scenes = [s for s in json.loads(SCENES.read_text()) if s["id"] not in SKIP]
THUMBS.mkdir(parents=True, exist_ok=True)
for old in THUMBS.glob("*.webp"):
    if old.stem not in {s["id"] for s in scenes}:
        old.unlink()

lines = []
for s in scenes:
    src = SCENES.parent / s["poster"]
    out = THUMBS / f"{s['id']}.webp"
    # vips keeps the embedded ICC profile (Display P3) unless told to strip it
    subprocess.run(
        ["vips", "thumbnail", str(src), f"{out}[Q=82,smart_subsample=true,effort=6]", str(WIDTH),
         "--height", str(HEIGHT), "--crop", "centre"],
        check=True,
    )
    version = hashlib.sha1(out.read_bytes()).hexdigest()[:8]
    title = s["title"].replace('"', "&quot;")
    lines += [
        (2, 'li'),
        (3, f'button.chapter type="button" data-start="{s["start"]:.3f}" data-end="{s["end"]:.3f}" aria-label="{title}"'),
        (4, f'img src="/static/img/cling-chapters/{s["id"]}.webp?v={version}" alt="" width="{WIDTH // 2}" height="{HEIGHT // 2}" loading="lazy" decoding="async"'),
        (4, 'span.chapter-title'),
        (5, f'| {s["title"]}'),
    ]

page = PAGE.read_text()
pattern = re.compile(r"(^([ \t]*)/ chapters:begin[^\n]*\n).*?(^[ \t]*/ chapters:end)", re.S | re.M)
m = pattern.search(page)
if not m:
    sys.exit(f"no '/ chapters:begin' ... '/ chapters:end' markers in {PAGE}")
# the nav sits at the markers' own indent: anything deeper would be read as part of the comment
pad = m.group(2)
block = "\n".join(pad + "    " * depth + text for depth, text in [(0, 'nav#chapters aria-label="Chapters"'), (1, "ol.chapter-row"), *lines])
PAGE.write_text(page[: m.start()] + m.group(1) + block + "\n" + m.group(3) + page[m.end():])
print(f"{len(scenes)} chapters from {SCENES}")
