.PHONY: all build typecheck lint test check pack clean watch

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

clean:
	rm -rf dist

watch:
	npm run test:watch
