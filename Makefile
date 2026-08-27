.PHONY: all install build test clean

all: install build test

install:
	npm install

build:
	npm run build

test:
	npm test

clean:
	rm -rf dist node_modules package-lock.json
