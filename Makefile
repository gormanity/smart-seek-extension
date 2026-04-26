.PHONY: all build build-dev typecheck lint format format-check test check pack safari clean watch

all: build

build:
	npm run build

build-dev:
	npm run build:dev

typecheck:
	npm run typecheck

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

test:
	npm test

## typecheck + lint + format-check + test — full local check before committing
check: typecheck lint format-check test

pack:
	npm run pack

## Build Safari app (macOS only; requires Xcode)
safari: build
	bash scripts/build-safari.sh

clean:
	rm -rf dist dist-dev

watch:
	npm run test:watch
