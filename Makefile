lint:
	npx eslint .

publish:
	npm publish --dry-run

test:
	node --experimental-vm-modules "node_modules/.bin/jest"

test-coverage:
	node --experimental-vm-modules "node_modules/.bin/jest" --coverage