#!/bin/bash
# Publishes release-notes/release.css, the stylesheet every app's release notes and changelog link.
# It is served from two hosts, and each app's Makefile links it as release.css?v=<first 8 hex of the
# live copy's md5> when it builds a page, so Cloudflare holds a copy at the bare URL and one per hash.
# release-notes/published-hashes lists those hashes and gains the new one here: commit it with the
# stylesheet. A purge takes at most 30 URLs, so it covers the bare URL and the newest 29 hashes.
set -euo pipefail
cd "$(dirname "$0")/.."

src=release-notes/release.css
hashes=release-notes/published-hashes
cf=${CF:-cf}
new=$(md5 -q "$src" | cut -c1-8)
grep -qx "$new" "$hashes" || echo "$new" >> "$hashes"

publish() { # zone, url, path on the server
    local zone=$1 url=$2 path=$3 files
    rsync -a "$src" "hetzner:$path"
    files="\"$url\""
    while read -r h; do
        [ -n "$h" ] && files="$files,\"$url?v=$h\""
    done < <(tail -n 29 "$hashes")
    "$cf" cache purge -z "$zone" --force --body "{\"files\":[$files]}" > /dev/null
    echo "$url: $new"
}

publish lowtechguys.com https://files.lowtechguys.com/release.css /static/lowtechguys/release.css
publish lunar.fyi https://files.lunar.fyi/ReleaseNotes/release.css /static/Lunar/ReleaseNotes/release.css
