/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "src");

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
]);

const REPLACEMENTS = [
  // Double-encoded punctuation/symbols
  ["Ã¢â€ â€™", "→"],
  ["Ã¢â€ â€", "←"],
  ["Ã¢â‚¬â„¢", "’"],
  ["Ã¢â‚¬â€œ", "–"],
  ["Ã¢â‚¬â€�", "—"],
  ["Ã¢â‚¬Â¦", "…"],
  ["Ã¢â‚¬Å“", "“"],
  ["Ã¢â‚¬Â", "”"],
  ["Ã¢â‚¬Ëœ", "‘"],

  // Common mojibake punctuation/symbols
  ["â†’", "→"],
  ["â†", "←"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["â€™", "’"],
  ["â€˜", "‘"],
  ["â€œ", "“"],
  ["â€�", "”"],
  ["â€¦", "…"],

  // Double-encoded accented letters (UTF-8 bytes decoded twice)
  ["ÃƒÂ€", "À"],
  ["ÃƒÂ‰", "É"],
  ["ÃƒÂˆ", "È"],
  ["ÃƒÂŠ", "Ê"],
  ["ÃƒÂ ", "à"],
  ["ÃƒÂ¢", "â"],
  ["ÃƒÂ§", "ç"],
  ["ÃƒÂ¨", "è"],
  ["ÃƒÂ©", "é"],
  ["ÃƒÂª", "ê"],
  ["ÃƒÂ«", "ë"],
  ["ÃƒÂ®", "î"],
  ["ÃƒÂ¯", "ï"],
  ["ÃƒÂ´", "ô"],
  ["ÃƒÂ¹", "ù"],
  ["ÃƒÂ»", "û"],

  // Single-encoded accented letters (UTF-8 bytes decoded as Latin-1 once)
  ["Ã€", "À"],
  ["Ã‰", "É"],
  ["Ãˆ", "È"],
  ["ÃŠ", "Ê"],
  ["Ã‚", "Â"],
  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã§", "ç"],
  ["Ã¨", "è"],
  ["Ã©", "é"],
  ["Ãª", "ê"],
  ["Ã«", "ë"],
  ["Ã®", "î"],
  ["Ã¯", "ï"],
  ["Ã´", "ô"],
  ["Ã¹", "ù"],
  ["Ã»", "û"],
  ["Ã¼", "ü"],
];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function applyReplacements(input) {
  let text = input.replace(/\u00A0/g, " "); // NBSP -> space
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const [from, to] of REPLACEMENTS) {
      if (text.includes(from)) {
        text = text.split(from).join(to);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return text;
}

function main() {
  const files = walk(ROOT).filter(shouldProcessFile);
  let changedCount = 0;

  for (const filePath of files) {
    const buf = fs.readFileSync(filePath);
    const original = buf.toString("utf8");
    const fixed = applyReplacements(original);
    if (fixed !== original) {
      fs.writeFileSync(filePath, fixed, "utf8");
      changedCount++;
      console.log(`fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  console.log(`done. files changed: ${changedCount}`);
}

main();

