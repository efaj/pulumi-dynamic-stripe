.PHONY: all install build lint test clean

all: install build lint test

install:
	npm install

build:
	npm run build

lint:
	npm run lint

test:
	npm test

clean:
	rm -rf dist node_modules package-lock.json
