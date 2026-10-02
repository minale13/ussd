#!/usr/bin/env node
/**
 * Dev helper: parse-check the composed admin client script.
 *
 *   npx tsx scripts/syntax-check-client.mjs        # bracket stack report
 *   npx tsx scripts/syntax-check-client.mjs 36 60  # print a line range
 *
 * The client ships as one template literal per part, so tsc never sees the
 * JavaScript it produces. This tokenises the composed string - handling strings,
 * comments and regex literals - and keeps a stack of open brackets, reporting
 * the first closer that does not match the bracket on top. That pinpoints a lost
 * or extra brace where the totals alone cannot. It must run through tsx because
 * it imports the TypeScript source.
 */
import { CLIENT_SCRIPT } from "../src/admin-ui/client-script.js";

const from = Number(process.argv[2] || 0);
const to = Number(process.argv[3] || 0);

if (from) {
  const lines = CLIENT_SCRIPT.split("\n");
  for (let i = from - 1; i < to && i < lines.length; i++) {
    console.log(String(i + 1).padStart(4) + "| " + lines[i]);
  }
  console.log("(total " + lines.length + " lines)");
  process.exit(0);
}

let i = 0;
let line = 1;
let last = "";                 // last significant character
let mismatch = null;
const stack = [];
// A `/` is division only when it follows something that can end an expression
// (identifier, number, `)`, `]` or `}`); otherwise it starts a regex literal.
const isDivision = () => /[\w$)\]}'"]/.test(last);

const report = (message, at) => {
  console.log(`MISMATCH at line ${at}: ${message}`);
  const lines = CLIENT_SCRIPT.split("\n");
  for (let n = at - 4; n <= at + 3; n++) {
    if (n < 1 || n > lines.length) continue;
    console.log(String(n).padStart(4) + (n === at ? " >>" : "   ") + "| " + lines[n - 1]);
  }
  process.exit(1);
};

while (i < CLIENT_SCRIPT.length) {
  const ch = CLIENT_SCRIPT[i];
  const next = CLIENT_SCRIPT[i + 1];
  if (ch === "\n") { line++; i++; continue; }
  if (ch === " " || ch === "\t" || ch === "\r") { i++; continue; }
  if (ch === "/" && next === "/") { while (i < CLIENT_SCRIPT.length && CLIENT_SCRIPT[i] !== "\n") i++; continue; }
  if (ch === "/" && next === "*") {
    i += 2;
    while (i < CLIENT_SCRIPT.length && !(CLIENT_SCRIPT[i] === "*" && CLIENT_SCRIPT[i + 1] === "/")) {
      if (CLIENT_SCRIPT[i] === "\n") line++;
      i++;
    }
    i += 2;
    continue;
  }
  if (ch === "/" && !isDivision()) {
    i++;
    let inClass = false;
    while (i < CLIENT_SCRIPT.length) {
      const c = CLIENT_SCRIPT[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "\n") { line++; i++; continue; }
      if (c === "[") inClass = true;
      else if (c === "]") inClass = false;
      else if (c === "/" && !inClass) { i++; break; }
      i++;
    }
    while (i < CLIENT_SCRIPT.length && /[a-z]/.test(CLIENT_SCRIPT[i])) i++;
    last = "x";
    continue;
  }
  if (ch === "'" || ch === '"' || ch === "`") {
    const quote = ch;
    i++;
    while (i < CLIENT_SCRIPT.length) {
      const c = CLIENT_SCRIPT[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "\n") line++;
      if (c === quote) { i++; break; }
      i++;
    }
    last = "x";
    continue;
  }
  if (ch === "{" || ch === "(" || ch === "[") {
    stack.push({ ch, line });
  } else if (ch === "}" || ch === ")" || ch === "]") {
    const want = { "}": "{", ")": "(", "]": "[" }[ch];
    const top = stack.pop();
    if (!top || top.ch !== want) {
      // A closer that does not match the top of the stack means something above
      // it was never closed. Fall through so the report below lists the culprit.
      mismatch = mismatch ?? `line ${line}: ${ch} does not close ${top ? top.ch + " from line " + top.line : "nothing"}`;
    }
    if (process.env.TRACE_TAIL && line >= Number(process.env.TRACE_TAIL)) {
      console.log(`line ${line}: ${ch} closed ${top ? top.ch + " from line " + top.line : "nothing"} (${stack.length} open)`);
    }
  }

  if (/[\w$]/.test(ch)) {
    while (i < CLIENT_SCRIPT.length && /[\w$]/.test(CLIENT_SCRIPT[i])) i++;
    last = "x";
    continue;
  }
  last = ch;
  i++;
}

if (stack.length) {
  console.log("Still open at end of script (outermost last):");
  for (const open of stack) console.log(`  ${open.ch} from line ${open.line}`);
  if (mismatch) console.log("First mismatch:", mismatch);
  process.exitCode = 1;
} else if (mismatch) {
  console.log("Bracket mismatch:", mismatch);
  process.exitCode = 1;
} else {
  console.log("CLIENT-SYNTAX-OK");
}
