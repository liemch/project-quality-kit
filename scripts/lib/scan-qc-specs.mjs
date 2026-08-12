#!/usr/bin/env node
/**
 * Scan e2e/specs for qcId bindings and classify stub vs implemented.
 * Heuristic "suspiciousEmpty": real test(...) whose body has no expect( / assert.
 *
 * Strategy: find `description: "TC_*"` annotations, then look backward for
 * test.fixme( vs test(, then extract the following function body.
 */
import fs from "node:fs";
import path from "node:path";

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(spec|test)\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function extractBody(src, openBraceIdx) {
  let depth = 0;
  for (let i = openBraceIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(openBraceIdx + 1, i);
    }
  }
  return "";
}

function findTestCallStart(src, annIndex) {
  const windowStart = Math.max(0, annIndex - 800);
  const window = src.slice(windowStart, annIndex);
  const fixme = [...window.matchAll(/\btest\.fixme\s*\(/g)];
  const skip = [...window.matchAll(/\btest\.skip\s*\(/g)];
  const plain = [...window.matchAll(/\btest\s*\(/g)].filter((m) => {
    // exclude test.fixme / test.skip / test.describe / test.beforeEach / test.info
    const before = window.slice(Math.max(0, m.index - 12), m.index);
    if (/\.(fixme|skip|describe|beforeEach|afterEach|beforeAll|afterAll|info|step)\s*$/.test(before + "test")) {
      return false;
    }
    // if match is test.fixme the regex \btest\s*\( still matches inside? 
    // Actually test.fixme: \btest\s*\( does NOT match "test.fixme(" because of the dot.
    return true;
  });

  const candidates = [
    ...fixme.map((m) => ({ kind: "stub", index: windowStart + m.index })),
    ...skip.map((m) => ({ kind: "stub", index: windowStart + m.index })),
    ...plain.map((m) => ({ kind: "implemented", index: windowStart + m.index })),
  ].sort((a, b) => a.index - b.index);

  return candidates.length ? candidates[candidates.length - 1] : null;
}

/**
 * @param {string} kitRoot
 * @returns {{ byId: Map<string, object>, files: string[] }}
 */
export function scanQcSpecs(kitRoot) {
  const specsDir = path.join(kitRoot, "e2e/specs");
  const files = walk(specsDir);
  const byId = new Map();

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const annRe = /description:\s*["'](TC_[\d.]+)["']/g;
    let am;
    while ((am = annRe.exec(src))) {
      const id = am[1];
      const call = findTestCallStart(src, am.index);
      const kind = call?.kind || "stub";
      let body = "";
      if (call) {
        // find opening brace of the test callback after the call
        const afterCall = src.slice(call.index, am.index + 50);
        // Prefer the `{` that starts the async callback: async ({ page }) => {
        const arrowBrace = afterCall.search(/=>\s*\{/);
        let openBrace = -1;
        if (arrowBrace >= 0) {
          openBrace = call.index + afterCall.indexOf("{", arrowBrace);
        } else {
          // fall back: first { after test(
          openBrace = src.indexOf("{", call.index);
        }
        if (openBrace >= 0) body = extractBody(src, openBrace);
      }
      const hasExpect = /\bexpect\s*\(/.test(body) || /\bassert\w*\s*\(/.test(body);
      const suspiciousEmpty = kind === "implemented" && !hasExpect;
      const line = src.slice(0, am.index).split(/\n/).length;
      const prev = byId.get(id);
      if (!prev || (prev.kind === "stub" && kind === "implemented")) {
        byId.set(id, {
          id,
          kind,
          title: id,
          file: path.relative(kitRoot, file),
          line,
          suspiciousEmpty,
          hasExpect,
        });
      }
    }
  }

  return { byId, files };
}
