.PHONY: all build build-dev listings typecheck lint lint-addons format format-check test test-e2e check pack safari clean watch

all: build

build:
	npm run build

build-dev:
	npm run build:dev

## Generate per-store listing copy from store/listing.data.js → dist/store/
listings:
	npm run build:listings

typecheck:
	npm run typecheck

lint:
	npm run lint

lint-addons:
	npm run lint:addons

format:
	npm run format

format-check:
	npm run format:check

test:
	npm test

test-e2e:
	npm run test:e2e

## typecheck + lint + extension lint + format-check + test + e2e — full local check before committing
check: typecheck lint lint-addons format-check test test-e2e

pack:
	npm run pack

## Build Safari app (macOS only; requires Xcode)
safari: build
	bash scripts/build-safari.sh

clean:
	rm -rf dist dist-dev

watch:
	npm run test:watch
