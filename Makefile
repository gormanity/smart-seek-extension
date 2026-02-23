.PHONY: all build typecheck lint test check pack safari clean watch

all: build

build:
	npm run build

typecheck:
	npm run typecheck

lint:
	npm run lint

test:
	npm test

## typecheck + lint + test — full local check before committing
check: typecheck lint test

pack:
	npm run pack

## Build Safari app (macOS only; requires Xcode)
safari: build
	bash scripts/build-safari.sh

clean:
	rm -rf dist

watch:
	npm run test:watch
