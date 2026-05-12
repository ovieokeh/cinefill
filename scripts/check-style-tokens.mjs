#!/usr/bin/env node
// Pre-commit guard: rejects inline style literals that should route through theme/tokens.ts.
// Receives a list of staged files (passed by lint-staged) and exits non-zero on violation.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const EXEMPT_FILES = new Set([
  'theme/tokens.ts',
  'scripts/check-style-tokens.mjs',
  // Expo build configuration — its color literals (adaptive icon bg, splash bg)
  // are consumed by the native build, not RN runtime style code.
  'app.config.ts',
]);

const FORBIDDEN_NUMERIC_PROPERTIES = [
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'padding',
  'paddingHorizontal',
  'paddingVertical',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingEnd',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'gap',
  'rowGap',
  'columnGap',
];

const numericPropPattern = new RegExp(
  `\\b(${FORBIDDEN_NUMERIC_PROPERTIES.join('|')}):\\s*([1-9]\\d*(\\.\\d+)?|0\\.\\d+)\\b`,
);
const hexColorPattern = /#[0-9A-Fa-f]{3,8}\b/;
const rgbaHslaPattern = /\b(rgba|hsla)\(/;

function relPath(file) {
  return path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');
}

const files = process.argv.slice(2).filter((f) => /\.tsx?$/.test(f));
const violations = [];

for (const file of files) {
  const rel = relPath(file);
  if (EXEMPT_FILES.has(rel)) continue;

  let content;
  try {
    content = await readFile(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    if (hexColorPattern.test(line)) {
      violations.push({ file: rel, line: i + 1, kind: 'inline hex color', text: trimmed });
    }
    if (rgbaHslaPattern.test(line)) {
      violations.push({ file: rel, line: i + 1, kind: 'inline rgba()/hsla()', text: trimmed });
    }
    const m = numericPropPattern.exec(line);
    if (m) {
      violations.push({
        file: rel,
        line: i + 1,
        kind: `inline ${m[1]} literal`,
        text: trimmed,
      });
    }
  }
}

if (violations.length > 0) {
  console.error('\nInline style literals found — route values through theme/tokens.ts.\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.kind}`);
    console.error(`    ${v.text}`);
  }
  console.error('');
  process.exit(1);
}
