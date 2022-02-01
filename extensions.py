import atexit
import os
import re
from collections import defaultdict
from copy import deepcopy

from plim import preprocessor_factory
from plim.extensions import md_to_html

# icon#id.cls-[1rem]: filename
PARSE_SVG_PATH_RE = re.compile(
    r"icon(?:#(?P<id>[A-Za-z\-0-9]+))?(?P<cls>(?:\.[A-Za-z\-/0-9\[\]:]+)+)? : (?P<path>[A-Za-z\-0-9/_]+)"
)
PARSE_MDFILE_PATH_RE = re.compile(
    r"md(?:#(?P<id>[A-Za-z\-0-9]+))?(?P<cls>(?:\.[A-Za-z\-/0-9\[\]:]+)+)? : (?P<path>[A-Za-z\-0-9/_]+)"
)

PARSE_INDEX_RE = re.compile(
    r"index#(?P<id>[A-Za-z\-0-9\._]+?)\.(?P<index>[A-Za-z\-0-9]+)\s+:\s+(?P<title>[^\n]+)"
)

INDEX_DATA = defaultdict(list)


def send_indexes():
    global INDEX_DATA

    for index, db in INDEX_DATA.items():
        send_index(index, db)


atexit.register(send_indexes)


def send_index(index, db):
    try:
        API_KEY = os.getenv("MEILI_API_KEY")
        SEARCH_URL = os.getenv("MEILI_SEARCH_URL")

        if not API_KEY or not SEARCH_URL:
            return

        import requests

        requests.post(
            f"{SEARCH_URL}/indexes/{index}/documents",
            headers={"X-Meili-API-Key": API_KEY},
            json=db,
        )
    except:
        pass


INVALID_DOCUMENT_ID_RE = re.compile(r"[^A-Za-z0-9\-_]")


def parse_index(indent_level, current_line, matched, source, syntax):
    global INDEX_DATA

    API_KEY = os.getenv("MEILI_API_KEY")
    SEARCH_URL = os.getenv("MEILI_SEARCH_URL")

    title = matched.group("title")
    _id = matched.group("id")
    index = matched.group("index")

    md_lines = []
    level = indent_level + 4
    for _, line in deepcopy(source):
        if line != "\n" and (len(line) < level or line[level - 1] != " "):
            break
        source.__next__()
        md_lines.append(line if len(line) < level else line[level:])

    md_source = "".join(md_lines)
    html = md_to_html(md_source)

    if API_KEY and SEARCH_URL:
        # from lxml.html import fromstring

        # dom = fromstring(html)
        # html_text = dom.text_content()
        INDEX_DATA[index].append(
            {
                "id": INVALID_DOCUMENT_ID_RE.sub("_", _id),
                "title": title,
                "content": md_source,
            }
        )

    return (html, indent_level, "", source)


def parse_md_path(indent_level, current_line, matched, source, syntax):
    path = matched.group("path")
    md_id = matched.group("id") or ""
    md_class = (matched.group("cls") or "").replace(".", " ")
    md_file = f"public/static/markdown/{path}.md"

    if not os.path.exists(md_file):
        return "", indent_level, "", source

    with open(md_file) as f:
        rt = f.read()
    parsed = md_to_html(rt)
    return (
        f'<article id="{md_id}" class="{md_class}">{parsed}</article>',
        indent_level,
        "",
        source,
    )


def parse_svg_path(indent_level, current_line, matched, source, syntax):
    path = matched.group("path")
    svg_id = matched.group("id") or ""
    svg_class = (matched.group("cls") or "").replace(".", " ")
    svg_file = f"public/static/svg/{path}.svg"

    if not os.path.exists(svg_file):
        return "", indent_level, "", source

    with open(svg_file) as f:
        rt = f.read()
    return (
        rt.replace("<svg ", f'<svg id="{svg_id}" class="{svg_class}"'),
        indent_level,
        "",
        source,
    )


CUSTOM_PARSERS = [
    (PARSE_SVG_PATH_RE, parse_svg_path),
    (PARSE_MDFILE_PATH_RE, parse_md_path),
    (PARSE_INDEX_RE, parse_index),
]
preprocessor = preprocessor_factory(custom_parsers=CUSTOM_PARSERS, syntax="mako")
