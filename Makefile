vpath %.css public/static/css
vpath %.styl stylus
vpath %.plim src

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
public/crank/presskit/crank-presskit.zip: src/crank/presskit/crank-presskit.md public/static/img/crank-icon.png public/static/img/crank-screenshot.png public/static/img/crank-ui.png public/static/video/crank.mp4 public/static/video/crank-focus-reading.mp4
	@echo Building Crank press kit zip
	@mkdir -p public/crank/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/crank/presskit/crank-presskit.md "$$tmp/" && \
	 cp public/static/img/crank-icon.png "$$tmp/" && \
	 cp public/static/img/crank-screenshot.png "$$tmp/" && \
	 cp public/static/img/crank-ui.png "$$tmp/" && \
	 cp public/static/video/crank.mp4 "$$tmp/crank-demo.mp4" && \
	 cp public/static/video/crank-focus-reading.mp4 "$$tmp/" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

pipiri-presskit-zip: public/pipiri/presskit/pipiri-presskit.zip
public/pipiri/presskit/pipiri-presskit.zip: src/pipiri/presskit/pipiri-presskit.md public/static/img/pipiri-icon.png public/static/img/pipiri-screenshot.png public/static/img/pipiri-ui.png public/static/video/pipiri.mp4
	@echo Building Pipiri press kit zip
	@mkdir -p public/pipiri/presskit
	@rm -f $@
	@tmp=$$(mktemp -d) && \
	 cp src/pipiri/presskit/pipiri-presskit.md "$$tmp/" && \
	 cp public/static/img/pipiri-icon.png "$$tmp/" && \
	 cp public/static/img/pipiri-screenshot.png "$$tmp/" && \
	 cp public/static/img/pipiri-ui.png "$$tmp/" && \
	 cp public/static/video/pipiri.mp4 "$$tmp/pipiri-demo.mp4" && \
	 cd "$$tmp" && zip -j $(CURDIR)/$@ * && \
	 rm -rf "$$tmp"

all: html xml css crank-presskit-zip pipiri-presskit-zip

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
	pkill -9 -f -l 'livereload|/bin/sh -c livereload|inlets|npm exec tailwindcss' || true
	rm DEVMODE || true
	sleep 5
	echo '' >> ./src/clop/defs.plim
	cfcli -d lowtechguys.com purge

release: rebuild
