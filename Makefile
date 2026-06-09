vpath %.css public/static/css
vpath %.styl stylus
vpath %.plim src

KILL ?= 0

.css:
	mkdir -p .css

svgfiles := $(wildcard public/*/*.svg)
mdfiles := $(wildcard public/static/markdown/*.md)
public/%.html: src/%.plim src/defs.plim $(svgfiles) $(mdfiles)
	@echo Compiling $< to $@
	@mkdir -p $$(dirname $@)
ifeq ($(DEBUG),1)
	@uv run pudb3 $$(which plimc) -H -p extensions:preprocessor -o $@ $<
else
	@uv run plimc -H -p extensions:preprocessor -o $@ $<
endif

app.css: stylus/*.styl

css: export PYTHONWARNINGS=ignore
css: public/static/css/app.css

nothtml=%/defs.html %/sitemap.html
htmlfiles := $(filter-out $(nothtml),$(subst src,public,$(patsubst %.plim,%.html,$(wildcard src/*/*.plim)))) $(filter-out $(nothtml),$(subst src,public,$(patsubst %.plim,%.html,$(wildcard src/*/*/*.plim)))) $(filter-out $(nothtml),$(subst src,public,$(patsubst %.plim,%.html,$(wildcard src/*.plim))))
html: export PYTHONWARNINGS=ignore
html: $(htmlfiles)

# XML
public/%.xml: export PYTHONWARNINGS=ignore
public/%.xml: export DEPLOY_URL=https://lowtechguys.com
public/%.xml: src/xml/%.plim $(htmlfiles)
	@echo Compiling $< to $@
	@mkdir -p $$(dirname $@)
ifeq ($(DEBUG),1)
	@uv run pudb $$(which plimc) -H -p extensions:preprocessor -o $@ $<
else
	@uv run plimc -H -p extensions:preprocessor -o $@ $<
endif

xmlfiles := $(subst src/xml,public,$(patsubst %.plim,%.xml,$(wildcard src/xml/*/*.plim))) $(subst src/xml,public,$(patsubst %.plim,%.xml,$(wildcard src/xml/*.plim)))
xml: $(xmlfiles)


crank-presskit-zip: public/crank/presskit/crank-presskit.zip
public/crank/presskit/crank-presskit.zip: src/crank/presskit/crank-presskit.md src/crank/presskit/crank-icon-shadow.png public/static/img/crank-icon.png public/static/img/crank-screenshot.png public/static/img/crank-ui.png public/static/video/crank.mp4 public/static/video/crank-focus-reading.mp4
	@echo Building Crank press kit zip
	@mkdir -p public/crank/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/crank/presskit/crank-presskit.md "$$tmp/" && \
	 cp src/crank/presskit/crank-icon-shadow.png "$$tmp/" && \
	 cp public/static/img/crank-icon.png "$$tmp/" && \
	 cp public/static/img/crank-screenshot.png "$$tmp/" && \
	 cp public/static/img/crank-ui.png "$$tmp/" && \
	 cp public/static/video/crank.mp4 "$$tmp/crank-demo.mp4" && \
	 cp public/static/video/crank-focus-reading.mp4 "$$tmp/" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

pipiri-presskit-zip: public/pipiri/presskit/pipiri-presskit.zip
public/pipiri/presskit/pipiri-presskit.zip: src/pipiri/presskit/pipiri-presskit.md src/pipiri/presskit/pipiri-icon-shadow.png public/static/img/pipiri-icon.png public/static/img/pipiri-screenshot.png public/static/img/pipiri-ui.png public/static/video/pipiri.mp4 public/static/video/pipiri-fn-doubleclick.mp4 public/static/video/pipiri-idle-detection-ci.mp4 public/static/video/pipiri-spreadsheet-reference.mp4
	@echo Building Pipiri press kit zip
	@mkdir -p public/pipiri/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/pipiri/presskit/pipiri-presskit.md "$$tmp/" && \
	 cp src/pipiri/presskit/pipiri-icon-shadow.png "$$tmp/" && \
	 cp public/static/img/pipiri-icon.png "$$tmp/" && \
	 cp public/static/img/pipiri-screenshot.png "$$tmp/" && \
	 cp public/static/img/pipiri-ui.png "$$tmp/" && \
	 cp public/static/video/pipiri.mp4 "$$tmp/pipiri-demo.mp4" && \
	 cp public/static/video/pipiri-fn-doubleclick.mp4 "$$tmp/pipiri-quick-region-capture.mp4" && \
	 cp public/static/video/pipiri-idle-detection-ci.mp4 "$$tmp/pipiri-idle-detection.mp4" && \
	 cp public/static/video/pipiri-spreadsheet-reference.mp4 "$$tmp/pipiri-floating-reference.mp4" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

keylume-presskit-zip: public/keylume/presskit/keylume-presskit.zip
public/keylume/presskit/keylume-presskit.zip: src/keylume/presskit/keylume-presskit.md src/keylume/presskit/keylume-icon-shadow.png public/static/img/keylume-icon.png public/static/img/keylume-screenshot.png public/static/img/keylume-ui.png public/static/img/keylume-themes.png public/static/img/keylume-pixelmator-base-layer.png public/static/img/keylume-cheatsheet-pixelmator.png public/static/img/keylume-finder-cmd-layer.png public/static/img/keylume-rcmd-app-layer.png public/static/img/keylume-qwertz-layout.png public/static/img/keylume-alternate-symbols-layer.png
	@echo Building Keylume press kit zip
	@mkdir -p public/keylume/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/keylume/presskit/keylume-presskit.md "$$tmp/" && \
	 cp src/keylume/presskit/keylume-icon-shadow.png "$$tmp/" && \
	 cp public/static/img/keylume-icon.png "$$tmp/" && \
	 cp public/static/img/keylume-screenshot.png "$$tmp/" && \
	 cp public/static/img/keylume-ui.png "$$tmp/" && \
	 cp public/static/img/keylume-themes.png "$$tmp/" && \
	 cp public/static/img/keylume-pixelmator-base-layer.png "$$tmp/" && \
	 cp public/static/img/keylume-cheatsheet-pixelmator.png "$$tmp/" && \
	 cp public/static/img/keylume-finder-cmd-layer.png "$$tmp/" && \
	 cp public/static/img/keylume-rcmd-app-layer.png "$$tmp/" && \
	 cp public/static/img/keylume-qwertz-layout.png "$$tmp/" && \
	 cp public/static/img/keylume-alternate-symbols-layer.png "$$tmp/" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

rcmd-presskit-zip: public/rcmd/presskit/rcmd-presskit.zip
public/rcmd/presskit/rcmd-presskit.zip: src/rcmd/presskit/rcmd-presskit.md src/rcmd/presskit/rcmd-icon-shadow.png public/static/img/rcmd-icon.png public/static/img/rcmd-screenshot.png public/static/img/rcmd-app-switcher-ui.png public/static/img/rcmd-themes-and-styling.png public/static/img/rcmd-theme-noir.png public/static/img/rcmd-theme-warm.png public/static/img/rcmd-theme-frost.png public/static/video/rcmd-demo-app-switch-assign.mp4 public/static/video/rcmd-demo-fuzzy-search.mp4 public/static/video/rcmd-demo-space-switching.mp4
	@echo Building rcmd press kit zip
	@mkdir -p public/rcmd/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/rcmd/presskit/rcmd-presskit.md "$$tmp/" && \
	 cp src/rcmd/presskit/rcmd-icon-shadow.png "$$tmp/" && \
	 cp public/static/img/rcmd-icon.png "$$tmp/" && \
	 cp public/static/img/rcmd-screenshot.png "$$tmp/" && \
	 cp public/static/img/rcmd-app-switcher-ui.png "$$tmp/" && \
	 cp public/static/img/rcmd-themes-and-styling.png "$$tmp/" && \
	 cp public/static/img/rcmd-theme-noir.png "$$tmp/" && \
	 cp public/static/img/rcmd-theme-warm.png "$$tmp/" && \
	 cp public/static/img/rcmd-theme-frost.png "$$tmp/" && \
	 cp public/static/video/rcmd-demo-app-switch-assign.mp4 "$$tmp/" && \
	 cp public/static/video/rcmd-demo-fuzzy-search.mp4 "$$tmp/" && \
	 cp public/static/video/rcmd-demo-space-switching.mp4 "$$tmp/" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

clop-presskit-zip: public/clop/presskit/clop-presskit.zip
public/clop/presskit/clop-presskit.zip: src/clop/presskit/clop-presskit.md src/clop/presskit/clop-icon-shadow.png public/static/img/clop-icon.png public/static/img/clop-screenshot.png public/static/img/screenshot-clipboard.png public/static/img/screen-recordings.png public/static/img/downscale-images.png public/static/img/clop-integrations-file-shelf.jpeg public/static/img/clop-crop-pdf.png public/static/img/clop-hat.png public/static/video/screenshot-copy-optimise-paste-in-email.mp4 public/static/video/screenshot-downscale-in-email.mp4 public/static/video/clop-presets.mp4 public/static/video/clop-pdf-h264.mp4
	@echo Building Clop press kit zip
	@mkdir -p public/clop/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/clop/presskit/clop-presskit.md "$$tmp/" && \
	 cp src/clop/presskit/clop-icon-shadow.png "$$tmp/" && \
	 cp public/static/img/clop-icon.png "$$tmp/" && \
	 cp public/static/img/clop-screenshot.png "$$tmp/" && \
	 cp public/static/img/screenshot-clipboard.png "$$tmp/clop-clipboard.png" && \
	 cp public/static/img/screen-recordings.png "$$tmp/clop-screen-recordings.png" && \
	 cp public/static/img/downscale-images.png "$$tmp/clop-downscale.png" && \
	 cp public/static/img/clop-integrations-file-shelf.jpeg "$$tmp/clop-file-shelf.jpeg" && \
	 cp public/static/img/clop-crop-pdf.png "$$tmp/" && \
	 cp public/static/img/clop-hat.png "$$tmp/" && \
	 cp public/static/video/screenshot-copy-optimise-paste-in-email.mp4 "$$tmp/clop-clipboard-demo.mp4" && \
	 cp public/static/video/screenshot-downscale-in-email.mp4 "$$tmp/clop-downscale-demo.mp4" && \
	 cp public/static/video/clop-presets.mp4 "$$tmp/" && \
	 cp public/static/video/clop-pdf-h264.mp4 "$$tmp/clop-pdf-demo.mp4" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

cling-presskit-zip: public/cling/presskit/cling-presskit.zip
public/cling/presskit/cling-presskit.zip: src/cling/presskit/cling-presskit.md src/cling/presskit/cling-icon-shadow.png public/static/img/cling-icon.png public/static/img/cling-screenshot.png public/static/img/cling-ui.png public/static/img/cling-actions.png public/static/img/cling-quick-filters.png public/static/img/cling-folder-filters.png public/static/img/cling-scripts.png public/static/video/cling-demo.mp4 public/static/video/cling-raycast-screencast.mp4
	@echo Building Cling press kit zip
	@mkdir -p public/cling/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/cling/presskit/cling-presskit.md "$$tmp/" && \
	 cp src/cling/presskit/cling-icon-shadow.png "$$tmp/" && \
	 cp public/static/img/cling-icon.png "$$tmp/" && \
	 cp public/static/img/cling-screenshot.png "$$tmp/" && \
	 cp public/static/img/cling-ui.png "$$tmp/" && \
	 cp public/static/img/cling-actions.png "$$tmp/" && \
	 cp public/static/img/cling-quick-filters.png "$$tmp/" && \
	 cp public/static/img/cling-folder-filters.png "$$tmp/" && \
	 cp public/static/img/cling-scripts.png "$$tmp/" && \
	 cp public/static/video/cling-demo.mp4 "$$tmp/" && \
	 cp public/static/video/cling-raycast-screencast.mp4 "$$tmp/" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

# Subset the Hugeicons font to only the icons used in src and self-host it, so no
# page blocks on cdn.hugeicons.com. Outputs are committed; run after adding icons.
icons:
	@python3 scripts/build-hugeicons.py

presskits: crank-presskit-zip pipiri-presskit-zip keylume-presskit-zip rcmd-presskit-zip clop-presskit-zip cling-presskit-zip

all: html xml css presskits

# OG / social-card images (1200x630). Override CHROME/OG_PORT/OG_SCALE as needed.
OG_APPS := rcmd clop cling crank pipiri keylume volum grila gammadimmer istherenet musicdecoy startupfolder studioicc yellowdot zoomhider
OG_HTML := $(foreach a,$(OG_APPS),public/$(a)/og.html)
CHROME ?= /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
OG_PORT ?= 8765
OG_SIZE ?= 1200,630
OG_SCALE ?= 2
OG_JOBS ?= 8
OG_TIMEOUT ?= 30
OG_PROFILES := /tmp/ltg-og-profiles
# --virtual-time-budget makes headless capture and exit even if a resource (CDN font,
# livereload, analytics) never settles, so the batch can't block on a stuck tab.
OG_CHROME_FLAGS := --headless --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check --disable-extensions --run-all-compositor-stages-before-draw --virtual-time-budget=8000 --force-device-scale-factor=$(OG_SCALE) --window-size=$(OG_SIZE)

og: $(OG_HTML)

# Render each /<app>/og page into /tmp/ltg-og/ so you can preview before overwriting.
# One HTTP server for the whole run; Chrome instances launched $(OG_JOBS) at a time.
og-preview: $(OG_HTML)
	@mkdir -p /tmp/ltg-og $(OG_PROFILES)
	@python3 -m http.server $(OG_PORT) -d public >/dev/null 2>&1 & srv=$$!; \
	 trap "kill $$srv 2>/dev/null; rm -rf $(OG_PROFILES)" EXIT; sleep 2; \
	 echo "Rendering OG previews ($(OG_JOBS) at a time)..."; \
	 pids=; n=0; \
	 for app in $(OG_APPS); do \
	   "$(CHROME)" $(OG_CHROME_FLAGS) --user-data-dir=$(OG_PROFILES)/$$app --screenshot="/tmp/ltg-og/$$app.png" "http://localhost:$(OG_PORT)/$$app/og.html" >/dev/null 2>&1 & \
	   pids="$$pids $$!"; n=$$((n + 1)); \
	   if [ $$((n % $(OG_JOBS))) -eq 0 ]; then ( sleep $(OG_TIMEOUT); kill $$pids 2>/dev/null ) & wd=$$!; wait $$pids 2>/dev/null; kill $$wd 2>/dev/null; pids=; fi; \
	 done; \
	 if [ -n "$$pids" ]; then ( sleep $(OG_TIMEOUT); kill $$pids 2>/dev/null ) & wd=$$!; wait $$pids 2>/dev/null; kill $$wd 2>/dev/null; fi; \
	 echo "Done. Review the images in /tmp/ltg-og/"

# Render each /<app>/og page straight into the <app>-screenshot image used by defs:head screenshot=
og-screenshots: $(OG_HTML)
	@mkdir -p $(OG_PROFILES)
	@python3 -m http.server $(OG_PORT) -d public >/dev/null 2>&1 & srv=$$!; \
	 trap "kill $$srv 2>/dev/null; rm -rf $(OG_PROFILES)" EXIT; sleep 2; \
	 echo "Rendering OG images ($(OG_JOBS) at a time)..."; \
	 pids=; n=0; \
	 for app in $(OG_APPS); do \
	   "$(CHROME)" $(OG_CHROME_FLAGS) --user-data-dir=$(OG_PROFILES)/$$app --screenshot="public/static/img/$$app-screenshot.png" "http://localhost:$(OG_PORT)/$$app/og.html" >/dev/null 2>&1 & \
	   pids="$$pids $$!"; n=$$((n + 1)); \
	   if [ $$((n % $(OG_JOBS))) -eq 0 ]; then ( sleep $(OG_TIMEOUT); kill $$pids 2>/dev/null ) & wd=$$!; wait $$pids 2>/dev/null; kill $$wd 2>/dev/null; pids=; fi; \
	 done; \
	 if [ -n "$$pids" ]; then ( sleep $(OG_TIMEOUT); kill $$pids 2>/dev/null ) & wd=$$!; wait $$pids 2>/dev/null; kill $$wd 2>/dev/null; fi; \
	 echo "Done. Overwrote public/static/img/<app>-screenshot.png"

build: export NODE_ENV=production
build: export TAILWIND_MODE=build
build: export PYTHONWARNINGS=ignore
build: export DEPLOY_URL=https://lowtechguys.com
build: all

watch-css: export TAILWIND_MODE=watch
watch-css:
	npx -y tailwindcss --postcss --jit -i .css/app.css -o public/static/css/app.css -w

dev: export NODE_ENV=development
dev: export TAILWIND_MODE=watch
dev: export PYTHONWARNINGS=ignore
dev:
	touch DEVMODE
	uv run mp --auto-collapse \
	    'cd public/ && npx -y livereloadx --static' \
	    'make watch-css' \
	    "open https://lowtechguys/; rg --files --type-add 'plim:*.plim' -t plim -t stylus -t coffeescript -t svg -t md | entr -s 'make -j html css js'"


watch: export NODE_ENV=production
watch: export TAILWIND_MODE=build
watch: export PYTHONWARNINGS=ignore
watch:
	rg --files --type-add 'plim:*.plim' -t plim -t stylus -t coffeescript -t svg -t md | entr -s 'test -f DEVMODE || make -j build'

watch-dev: export NODE_ENV=production
watch-dev: export TAILWIND_MODE=build
watch-dev: export PYTHONWARNINGS=ignore
watch-dev:
	rg --files --type-add 'plim:*.plim' -t plim -t stylus -t coffeescript -t svg -t md | entr -s 'make -j build'

.css/%.css: %.styl $(wildcard stylus/*.styl)
	@echo Compiling $< to $@
	@npx -y stylus -u rupture -c -m -o .css/ $<
stylus: .css/app.css

clean:
	rm public/*.html || true
	rm public/**/*.html || true
	rm public/*.xml 2>/dev/null || true
	rm public/**/*.xml 2>/dev/null || true
	rm public/static/css/* || true

python-deps:
	uv sync
node-deps:
	npm i --save postcss-cli@latest tailwindcss@latest postcss@latest autoprefixer@latest stylus@latest coffeescript@latest livereloadx@latest postcss-easings@latest postcss-easing-gradients@latest
deps: python-deps node-deps

public/static/css/%.css: export TAILWIND_MODE=build
public/static/css/%.css: %.styl $(wildcard stylus/*.styl) .css tailwind.config.js # $(wildcard public/*.html) $(wildcard public/**/*.html)
	@echo Compiling $< to $@
	@npx -y stylus -u rupture -c -m -o .css/ $<
	@npx -y tailwindcss --postcss --jit -i .css/$*.css -o $@


rebuild:
ifeq ($(KILL),1)
	pkill -9 -f -l 'livereload|/bin/sh -c livereload|inlets|npm exec tailwindcss' || true
endif
	rm DEVMODE || true
	sleep 5
	@if [ -z "$$(tail -c 2 ./src/clop/defs.plim)" ]; then \
		c="$$(cat ./src/clop/defs.plim)"; printf '%s\n' "$$c" > ./src/clop/defs.plim; \
	else \
		echo '' >> ./src/clop/defs.plim; \
	fi
	cfcli -d lowtechguys.com purge

release: rebuild
