/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const DEFAULT_ROOTS = [
  path.resolve(__dirname, "..", "src"),
  path.resolve(__dirname, "..", "public"),
  path.resolve(__dirname, "..", "..", "backend", "src"),
];

const TEXT_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".html",
  ".json",
  ".md",
  ".txt",
  ".java",
  ".yaml",
  ".yml",
  ".properties",
  ".sql",
  ".cjs",
  ".mjs",
]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "dev-dist",
  "coverage",
  "target",
  ".git",
  ".idea",
  ".vscode",
]);

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

// Characters with codepoints > 0xFF that are part of Windows-1252 byte values 0x80..0x9F.
// Needed because mojibake strings often include these characters (€, “, …) which represent single bytes.
const WIN1252_UNICODE_TO_BYTE = new Map([
  ["€", 0x80],
  ["‚", 0x82],
  ["ƒ", 0x83],
  ["„", 0x84],
  ["…", 0x85],
  ["†", 0x86],
  ["‡", 0x87],
  ["ˆ", 0x88],
  ["‰", 0x89],
  ["Š", 0x8a],
  ["‹", 0x8b],
  ["Œ", 0x8c],
  ["Ž", 0x8e],
  ["‘", 0x91],
  ["’", 0x92],
  ["“", 0x93],
  ["”", 0x94],
  ["•", 0x95],
  ["–", 0x96],
  ["—", 0x97],
  ["˜", 0x98],
  ["™", 0x99],
  ["š", 0x9a],
  ["›", 0x9b],
  ["œ", 0x9c],
  ["ž", 0x9e],
  ["Ÿ", 0x9f],
]);

const SUSPICIOUS_RE = /(?:[ÃÂÅÄ][^\x00-\x7F]|â€|â‚|â„|\uFFFD)/;
const SUSPICIOUS_SCORE_RE = /(?:[ÃÂÅÄ][^\x00-\x7F]|â€|â‚|â„|\uFFFD)/g;
const NON_ASCII_RUN_RE = /[^\x00-\x7F]{2,}/g;

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function suspiciousScore(text) {
  const matches = text.match(SUSPICIOUS_SCORE_RE);
  return matches ? matches.length : 0;
}

function bytesFromWin1252Text(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);

    if (code <= 0xff) {
      bytes[i] = code;
      continue;
    }

    const mapped = WIN1252_UNICODE_TO_BYTE.get(ch);
    bytes[i] = mapped != null ? mapped : 0x3f; // '?'
  }
  return Buffer.from(bytes);
}

function fixMojibakeOnce(input) {
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input; // BOM
  if (!SUSPICIOUS_RE.test(text)) return input;

  const replaced = text.replace(NON_ASCII_RUN_RE, (run) => {
    if (!SUSPICIOUS_RE.test(run)) return run;

    const before = suspiciousScore(run);
    if (before === 0) return run;

    const decoded = bytesFromWin1252Text(run).toString("utf8");
    if (decoded.includes("\uFFFD") && !run.includes("\uFFFD")) return run;

    const after = suspiciousScore(decoded);
    return after < before ? decoded : run;
  });

  return replaced === text ? input : replaced;
}

function fixMojibake(input) {
  let out = input;
  for (let i = 0; i < 3; i++) {
    const next = fixMojibakeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

function parseArgs(args) {
  const out = { write: false, roots: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--write") out.write = true;
    else if (a === "--root") {
      const v = args[i + 1];
      if (v) {
        out.roots.push(path.resolve(v));
        i++;
      }
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const write = args.write;
  const roots =
    args.roots.length > 0
      ? args.roots
      : DEFAULT_ROOTS.filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());

  const files = roots.flatMap((r) => walk(r)).filter(shouldProcessFile);
  let scannedCount = 0;
  let changedCount = 0;

  for (const filePath of files) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > MAX_BYTES) continue;

    const buf = fs.readFileSync(filePath);
    const original = buf.toString("utf8");
    scannedCount++;

    const fixed = fixMojibake(original);
    if (fixed !== original) {
      changedCount++;
      console.log(`fixed: ${path.relative(process.cwd(), filePath)}`);
      if (write) fs.writeFileSync(filePath, fixed, "utf8");
    }
  }

  console.log(write ? "done." : "dry-run done.");
  console.log(`files scanned: ${scannedCount}`);
  console.log(`files ${write ? "changed" : "to change"}: ${changedCount}`);
  if (!write) console.log("Run with --write to apply changes.");
}

main();
