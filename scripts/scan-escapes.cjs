/**
 * Finds backslashes that will silently disappear.
 *
 * The admin UI ships its CSS, markup and client JavaScript as template
 * literals exported from TypeScript, so a `\d` written the natural way is not
 * a regex escape at all: the template turns `\d` into the letter `d`, and the
 * browser then sees `/^+251d{9}$/` and throws. The same applies to ordinary
 * '…' / "…" strings. Backslashes are only left alone inside real regex
 * literals and comments.
 *
 * Run: node scripts/scan-escapes.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'admin-ui');
/** Escapes whose backslash actually survives in a template/string literal. */
const KEEP = new Set(['b', 'f', 'n', 'r', 't', 'v', '0', 'x', 'u', '\\', '"', "'", '`', '$', '\n', '\r']);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
})(ROOT);

let hits = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const state = { mode: 'code', brace: 0 };
  let line = 1;
  let col = 0;

  const report = (index) => {
    hits += 1;
    const start = source.lastIndexOf('\n', index) + 1;
    const end = source.indexOf('\n', index);
    const text = source.slice(start, end === -1 ? source.length : end).trim();
    console.log(`${path.relative(process.cwd(), file)}:${line}:${col}\n    ${text}`);
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '\n') { line += 1; col = 0; continue; }
    col += 1;

    if (state.mode === 'line') { if (char === '\n') state.mode = 'code'; continue; }
    if (state.mode === 'block') { if (char === '*' && next === '/') { state.mode = 'code'; i += 1; col += 1; } continue; }
    if (state.mode === 'sq' || state.mode === 'dq') {
      if (char === '\\') {
        if (!KEEP.has(next)) report(i);
        i += 1; col += 1;
        continue;
      }
      if ((state.mode === 'sq' && char === "'") || (state.mode === 'dq' && char === '"')) state.mode = 'code';
      continue;
    }
    if (state.mode === 'template') {
      if (char === '\\') {
        if (!KEEP.has(next)) report(i);
        i += 1; col += 1;
        continue;
      }
      if (char === '`') state.mode = 'code';
      else if (char === '$' && next === '{') { state.mode = 'code'; state.brace = 1; i += 1; col += 1; }
      continue;
    }
    if (state.mode === 'regex') {
      // Escapes here are the real thing; only the closing delimiter matters.
      if (char === '\\') { i += 1; col += 1; continue; }
      if (char === '[') state.inClass = true;
      else if (char === ']') state.inClass = false;
      else if (char === '/' && !state.inClass) state.mode = 'code';
      continue;
    }

    // Plain code.
    if (char === '/' && next === '/') { state.mode = 'line'; i += 1; col += 1; continue; }
    if (char === '/' && next === '*') { state.mode = 'block'; i += 1; col += 1; continue; }
    if (char === "'") { state.mode = 'sq'; continue; }
    if (char === '"') { state.mode = 'dq'; continue; }
    if (char === '`') { state.mode = 'template'; continue; }
    if (char === '/') {
      // A slash is a regex when what precedes it cannot end an expression.
      const head = source.slice(0, i).replace(/[\s)A-Za-z0-9_$'"`\]]+$/, '');
      if (/[=(,:!&|?{;+\-*%~^<>]$/.test(head) || head.length === 0) { state.mode = 'regex'; state.inClass = false; continue; }
    }
    if (char === '}' && state.brace > 0) { state.brace -= 1; if (state.brace === 0) { state.mode = 'template'; continue; } }
    if (char === '{' && state.brace > 0) state.brace += 1;
  }
}

console.log(`\n${hits} suspicious escape(s) across ${files.length} files`);
process.exit(hits ? 1 : 0);
