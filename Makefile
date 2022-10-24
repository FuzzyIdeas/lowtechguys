vpath %.css public/static/css
vpath %.styl stylus
vpath %.plim src

.css:
	mkdir -p .css

svgfiles := $(wildcard public/*/*.svg)
public/%.html: src/%.plim src/defs.plim $(svgfiles)
	@echo Compiling $< to $@
	@mkdir -p $$(dirname $@)
ifeq ($(DEBUG),1)
	@pudb3 $$(which plimc) -H -p extensions:preprocessor -o $@ $<
else
	@plimc -H -p extensions:preprocessor -o $@ $<
endif

app.css: stylus/*.styl

css: export PYTHONWARNINGS=ignore
css: public/static/css/app.css

htmlfiles := $(filter-out %/defs.html,$(subst src,public,$(patsubst %.plim,%.html,$(wildcard src/*/*.plim)))) $(filter-out %/defs.html,$(subst src,public,$(patsubst %.plim,%.html,$(wildcard src/*.plim))))
html: export PYTHONWARNINGS=ignore
html: $(htmlfiles)

all: html css

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
	fish run.fish

watch: export NODE_ENV=production
watch: export TAILWIND_MODE=build
watch: export PYTHONWARNINGS=ignore
watch:
	rg --files --type-add 'plim:*.plim' -t plim -t stylus -t coffeescript -t svg | entr -s 'test -f DEVMODE || make -j build'

.css/%.css: %.styl $(wildcard stylus/*.styl)
	@echo Compiling $< to $@
	@npx -y stylus -u rupture -c -m -o .css/ $<
stylus: .css/app.css

clean:
	rm public/*.html || true
	rm public/**/*.html || true
	rm public/static/css/* || true

python-deps:
	pip install -r requirements.txt
node-deps:
	npm i --save postcss-cli@latest tailwindcss@latest postcss@latest autoprefixer@latest stylus@latest coffeescript@latest livereloadx@latest
deps: python-deps node-deps

public/static/css/%.css: export TAILWIND_MODE=build
public/static/css/%.css: %.styl $(wildcard stylus/*.styl) .css tailwind.config.js # $(wildcard public/*.html) $(wildcard public/**/*.html)
	@echo Compiling $< to $@
	@npx -y stylus -u rupture -c -m -o .css/ $<
	@npx -y tailwindcss --postcss --jit -i .css/$*.css -o $@

