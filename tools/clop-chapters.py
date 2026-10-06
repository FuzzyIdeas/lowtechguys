#!/usr/bin/env python3
"""Chapter thumbs under the Clop film, generated from the film's scenes.json.

    python3 tools/clop-chapters.py [path/to/scenes.json]

Writes a retina WebP thumb per section to public/static/img/clop-chapters/<id>.webp (P3 profile kept)
and rewrites the block between the `/ chapters:begin` and `/ chapters:end` markers in
src/clop/index.plim. Re-run it whenever the film is re-rendered: section times, titles and posters all
come from scenes.json. The end card is not a section, so it gets no thumb.
"""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCENES = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Temp/.claude-work/clop-film/web/scenes.json"
THUMBS = ROOT / "public/static/img/clop-chapters"
PAGE = ROOT / "src/clop/index.plim"
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
        f'                    li',
        f'                        button.chapter type="button" data-start="{s["start"]:.3f}" data-end="{s["end"]:.3f}" aria-label="{title}"',
        f'                            img src="/static/img/clop-chapters/{s["id"]}.webp?v={version}" alt="" width="{WIDTH // 2}" height="{HEIGHT // 2}" loading="lazy" decoding="async"',
        f'                            span.chapter-title',
        f'                                | {s["title"]}',
    ]

block = "\n".join([
    '            nav#chapters aria-label="Chapters"',
    '                ol.chapter-row',
    *lines,
])
page = PAGE.read_text()
pattern = re.compile(r"(^[ \t]*/ chapters:begin[^\n]*\n).*?(^[ \t]*/ chapters:end)", re.S | re.M)
if not pattern.search(page):
    sys.exit(f"no '/ chapters:begin' ... '/ chapters:end' markers in {PAGE}")
PAGE.write_text(pattern.sub(lambda m: m.group(1) + block + "\n" + m.group(2), page, count=1))
print(f"{len(scenes)} chapters from {SCENES}")
