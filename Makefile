.PHONY: all install build lint test clean

all: install build lint test

install:
	npm install

build:
	npm run build

lint:
	npm run lint

lint-fix:
	npm run lint:fix

test:
	npm run test

test-integration:
	npm run build
	npm run test:integration

clean:
	rm -rf dist node_modules package-lock.json
