#!/usr/bin/env node

/**
 * Extract Ferlium code snippets from the Ferlium test suite and generate
 * .fer files for TextMate grammar validation.
 *
 * Usage: node scripts/extract-test-snippets.js [ferlium-path]
 *   ferlium-path: Path to the ferlium repository (default: ../ferlium)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get ferlium path from command line or use default
const ferliumPath = process.argv[2] || '../ferlium';
const testsDir = join(ferliumPath, 'tests/language');
const outputDir = join(__dirname, '../tests/extracted');

// Function to find the test function name for a given position in content
function findTestFunctionName(content, position) {
  // Get content up to the position
  const beforePosition = content.substring(0, position);

  // Look for the most recent `fn name(` pattern that comes after a #[test] attribute
  // We search backwards from the position
  const lines = beforePosition.split('\n');

  let lastFnName = null;
  let sawTestAttr = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for #[test] attribute
    if (line === '#[test]') {
      sawTestAttr = true;
    }

    // Check for function definition
    const fnMatch = line.match(/^fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (fnMatch) {
      if (sawTestAttr) {
        lastFnName = fnMatch[1];
      }
      sawTestAttr = false;
    }
  }

  return lastFnName || 'unknown';
}

// Function to extract code snippets from Rust test files
function extractCodeSnippets(content) {
  const snippets = [];
  const patterns = [
    // Regular run() calls without indoc
    { regex: /run\s*\(\s*"([^"\\]*(\\.[^"\\]*)*)"\s*\)/g, isIndoc: false, stringType: 'regular' },
    { regex: /run\s*\(\s*r"([^"\\]*(\\.[^"\\]*)*)"\s*\)/g, isIndoc: false, stringType: 'raw' },
    { regex: /run\s*\(\s*r#"([^"]*(?:"(?!#)[^"]*)*)"#\s*\)/g, isIndoc: false, stringType: 'raw_hash' },

    // indoc! calls with different string literal types
    { regex: /run\s*\(\s*indoc!\s*\{\s*"([^"\\]*(\\.[^"\\]*)*)"\s*\}\s*\)/g, isIndoc: true, stringType: 'regular' },
    { regex: /run\s*\(\s*indoc!\s*\{\s*r"([^"\\]*(\\.[^"\\]*)*)"\s*\}\s*\)/g, isIndoc: true, stringType: 'raw' },
    { regex: /run\s*\(\s*indoc!\s*\{\s*r#"([^"]*(?:"(?!#)[^"]*)*)"#\s*\}\s*\)/g, isIndoc: true, stringType: 'raw_hash' },

    // let mod_src = patterns without indoc
    { regex: /let\s+mod_src\s*=\s*"([^"\\]*(\\.[^"\\]*)*)"\s*;/g, isIndoc: false, stringType: 'regular' },
    { regex: /let\s+mod_src\s*=\s*r"([^"\\]*(\\.[^"\\]*)*)"\s*;/g, isIndoc: false, stringType: 'raw' },
    { regex: /let\s+mod_src\s*=\s*r#"([^"]*(?:"(?!#)[^"]*)*)"#\s*;/g, isIndoc: false, stringType: 'raw_hash' },

    // let mod_src = indoc! patterns with different string literal types
    { regex: /let\s+mod_src\s*=\s*indoc!\s*\{\s*"([^"\\]*(\\.[^"\\]*)*)"\s*\}\s*;/g, isIndoc: true, stringType: 'regular' },
    { regex: /let\s+mod_src\s*=\s*indoc!\s*\{\s*r"([^"\\]*(\\.[^"\\]*)*)"\s*\}\s*;/g, isIndoc: true, stringType: 'raw' },
    { regex: /let\s+mod_src\s*=\s*indoc!\s*\{\s*r#"([^"]*(?:"(?!#)[^"]*)*)"#\s*\}\s*;/g, isIndoc: true, stringType: 'raw_hash' },
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      let code = match[1];

      // Process escape sequences based on the string literal type
      if (pattern.stringType === 'regular') {
        code = unescapeString(code);
      }

      // Apply indoc processing if this is an indoc! pattern
      if (pattern.isIndoc) {
        code = unindent(code);
      }

      // Skip empty or very short snippets
      if (code.trim().length > 0) {
        snippets.push({
          code: code.trim(),
          line: getLineNumber(content, match.index),
          testFn: findTestFunctionName(content, match.index)
        });
      }
    }
  }

  return snippets;
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Function to unindent strings like Rust's indoc! macro
function unindent(text) {
  const lines = text.split('\n');

  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length > 0) {
      const indent = line.match(/^[ \t]*/)[0].length;
      minIndent = Math.min(minIndent, indent);
    }
  }

  if (minIndent === Infinity || minIndent === 0) {
    return text;
  }

  return lines.map(line => {
    if (line.trim().length === 0) {
      return line;
    }
    return line.slice(minIndent);
  }).join('\n');
}

// Function to unescape string literals
function unescapeString(str) {
  return str.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      case '0': return '\0';
      default: return char;
    }
  });
}

// Function to recursively find all .rs files
function findRustFiles(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findRustFiles(fullPath));
      } else if (entry.endsWith('.rs')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
  }
  return files;
}

// Generate a valid filename from source file, test function name, and index within that test
function generateFilename(sourceFile, testFn, index) {
  const baseName = sourceFile
    .replace(testsDir + '/', '')
    .replace(/\//g, '_')
    .replace(/\.rs$/, '');
  return `${baseName}_${testFn}_${String(index).padStart(3, '0')}.fer`;
}

// Main execution
console.log(`🔍 Extracting Ferlium code snippets from ${testsDir}...`);

// Check if tests directory exists
try {
  statSync(testsDir);
} catch {
  console.error(`❌ Error: Tests directory not found at ${testsDir}`);
  console.error(`   Make sure the ferlium repository is at: ${ferliumPath}`);
  console.error(`   Or specify the path: node scripts/extract-test-snippets.js /path/to/ferlium`);
  process.exit(1);
}

const rustFiles = findRustFiles(testsDir);
console.log(`📄 Found ${rustFiles.length} Rust test files`);

// Collect all snippets
let allSnippets = [];
for (const file of rustFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    const snippets = extractCodeSnippets(content);

    for (const snippet of snippets) {
      snippet.sourceFile = file;
      allSnippets.push(snippet);
    }
  } catch (error) {
    console.error(`❌ Error reading ${file}: ${error.message}`);
  }
}

console.log(`📊 Total extracted snippets: ${allSnippets.length}`);

if (allSnippets.length === 0) {
  console.log('⚠️  No code snippets found.');
  process.exit(1);
}

// Clear and recreate output directory
try {
  rmSync(outputDir, { recursive: true, force: true });
} catch {
  // Directory might not exist
}
mkdirSync(outputDir, { recursive: true });

// Group snippets by source file and test function for better organization
const snippetsByFileAndTest = new Map();
for (const snippet of allSnippets) {
  const key = `${snippet.sourceFile}::${snippet.testFn}`;
  if (!snippetsByFileAndTest.has(key)) {
    snippetsByFileAndTest.set(key, []);
  }
  snippetsByFileAndTest.get(key).push(snippet);
}

// Write each snippet to a separate .fer file with the SYNTAX TEST header
let fileCount = 0;
for (const [key, snippets] of snippetsByFileAndTest) {
  const [sourceFile, testFn] = key.split('::');
  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    const filename = generateFilename(sourceFile, testFn, i + 1);
    const filePath = join(outputDir, filename);

    // Add the SYNTAX TEST header required by vscode-tmgrammar-test
    const relativePath = sourceFile.replace(testsDir + '/', '');
    const content = `// SYNTAX TEST "source.ferlium" "Extracted from ${relativePath}:${testFn}:${snippet.line}"

${snippet.code}
`;

    writeFileSync(filePath, content);
    fileCount++;
  }
}

console.log(`✅ Generated ${fileCount} test files in ${outputDir}`);
console.log(`\n💡 Run 'make validate-grammar' to test these against the TextMate grammar`);
