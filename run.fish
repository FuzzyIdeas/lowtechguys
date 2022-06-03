#!/usr/bin/env fish

export DEPLOY_URL=https://ltg.tunnel.darkwoods.win

trap "pkill -9 -f -l 'caddy|livereload|/bin/sh -c livereload|inlets|npm exec tailwindcss'" INT EXIT
cd public/ && npx -y livereloadx --static &

cd - && caddy run -watch &

inlets client --url wss://inlets.darkwoods.win --upstream=ltg.tunnel.darkwoods.win=http://localhost:3998 --token=$INLETS_TOKEN &

kitty @ launch --keep-focus --location=vsplit --type=window --cwd=current fish -c 'make watch-css'

open http://localhost:3998
rg --files --type-add 'plim:*.plim' -t plim -t stylus -t coffeescript | entr -s 'make html stylus js'
