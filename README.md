# Ferlium VS Code Extension

Syntax highlighting support for the [Ferlium](https://github.com/enlightware/ferlium) programming language.

## Features

- Syntax highlighting for `.fer` files
- Bracket matching and auto-closing
- Code folding
- Comment toggling (`//` and `/* */`)

## Installation

### From VS Code Marketplace

Search for "Ferlium" in the VS Code extensions panel.

### From VSIX

1. Download the `.vsix` file from the [releases page](https://github.com/enlightware/ferlium-vscode/releases)
2. In VS Code, go to Extensions → `...` menu → "Install from VSIX..."
3. Select the downloaded file

### From Source

```bash
git clone https://github.com/enlightware/ferlium-vscode.git
cd ferlium-vscode
npm install
npm run package
code --install-extension ferlium-*.vsix
```

## Development

### Prerequisites

- Node.js (v18 or later)
- npm

### Setup

```bash
npm install
```

### Validate Grammar

To test the TextMate grammar against test files:

```bash
npm run validate-grammar
```

### Package Extension

```bash
npm run package
```

### Publish Extension

```bash
npm run publish
```

## License

Apache-2.0 - See [LICENSE](LICENSE) for details.
