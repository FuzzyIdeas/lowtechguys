vpath %.css public/static/css
vpath %.styl stylus
vpath %.plim src

.css:
	mkdir -p .css

public/%.html: src/%.plim src/defs.plim
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

html: export PYTHONWARNINGS=ignore
html: public/index.html public/rcmd/index.html public/rcmd/privacy.html public/yellowdot/index.html public/yellowdot/privacy.html public/zoomhider/index.html public/zoomhider/privacy.html public/volum/index.html public/volum/privacy.html public/contact.html

all: html css

build: export NODE_ENV=production
build: export PYTHONWARNINGS=ignore
build: all

watch-css: export TAILWIND_MODE=watch
watch-css:
	npx -y tailwindcss --postcss --jit -i .css/app.css -o public/static/css/app.css -w

dev: export NODE_ENV=development
dev: export TAILWIND_MODE=watch
dev: export PYTHONWARNINGS=ignore
dev:
	fish run.fish

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
netlify-deps:
	npm i -g netlify-cli
node-deps:
	npm i --save postcss-cli@latest tailwindcss@latest postcss@latest autoprefixer@latest stylus@latest coffeescript@latest livereloadx@latest
deps: python-deps node-deps netlify-deps

public/static/css/%.css: export TAILWIND_MODE=build
public/static/css/%.css: %.styl $(wildcard stylus/*.styl) .css tailwind.config.js # $(wildcard public/*.html) $(wildcard public/**/*.html)
	@echo Compiling $< to $@
	@npx -y stylus -u rupture -c -m -o .css/ $<
	@npx -y tailwindcss --postcss --jit -i .css/$*.css -o $@

