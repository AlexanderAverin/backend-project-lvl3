BIN=$(wildcard bin/*.js)
SRC=$(wildcard src/*.js)
BUILD_DIR=./build

lint:
	npx eslint .

publish:
	npm publish --dry-run

test:
	NODE_OPTIONS=--experimental-vm-modules npx jest

test-coverage:
	NODE_OPTIONS=--experimental-vm-modules npx jest --coverage

build: 
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)
	npx babel $(BIN) $(SRC) --out-dir $(BUILD_DIR) --source-maps inline
	npx pkg -t node18-linux,node18-mac,node18-win --compress --out-path $(BUILD_DIR)/ $(BUILD_DIR)/page-loader.js 

.PHONY: build