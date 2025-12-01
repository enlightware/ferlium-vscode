# Ferlium VS Code Extension

Syntax highlighting support for the [Ferlium](https://github.com/enlightware/ferlium) programming language.

## Features

- Syntax highlighting for `.fer` files
- Bracket matching and auto-closing
- Code folding
- Comment toggling (`//` and `/* */`)

## Installation

### From VS Code marketplace

Search for "Ferlium" in the VS Code extensions panel.

### From VSIX

1. Download the `.vsix` file from the [releases page](https://github.com/enlightware/ferlium-vscode/releases)
2. In VS Code, go to Extensions → `...` menu → "Install from VSIX..."
3. Select the downloaded file

### From source

```bash
git clone https://github.com/enlightware/ferlium-vscode.git
cd ferlium-vscode
npm install
npm run package
code --install-extension ferlium-*.vsix
```

## Development

A `Makefile` is provided for common tasks.

### Prerequisites

- Node.js (v18 or later)
- npm

### Setup

```bash
make install
```

### Update test files

To update the grammar test files from the unit tests from Ferlium repository, run:

```bash
make update-test-snippets
```

The `FERLIUM_PATH` variable in the `Makefile` should point to the local Ferlium repository.

### Validate grammar

To test the TextMate grammar against test files:

```bash
make test
```

### Package extension

```bash
make package
```

### Publish extension

```bash
make publish
```

## License

Apache-2.0 - See [LICENSE](LICENSE) for details.
