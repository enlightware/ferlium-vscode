.PHONY: install validate-grammar package publish clean update-test-snippets

# Path to ferlium repository (can be overridden: make update-test-snippets FERLIUM_PATH=/path/to/ferlium)
FERLIUM_PATH ?= ../ferlium

install:
	npm install

validate-grammar: install
	npm run validate-grammar

package: install
	npm run package

publish: install
	npm run publish

test: install
	npm run validate-grammar

# Extract test snippets from ferlium test suite
# Run this periodically and commit the generated files
update-test-snippets: install
	node scripts/extract-test-snippets.js $(FERLIUM_PATH)

clean:
	rm -rf node_modules *.vsix
