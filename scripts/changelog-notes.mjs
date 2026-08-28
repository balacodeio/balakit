#!/usr/bin/env node
/**
 * Print the CHANGELOG.md section body for a version (with or without leading v).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const raw = process.argv[2];
if (!raw) {
  console.error("Usage: node scripts/changelog-notes.mjs <version>");
  process.exit(1);
}
const version = raw.replace(/^v/, "");
const md = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = new RegExp(`## \\[v?${escaped}\\]\\s*\\n([\\s\\S]*?)(?=\\n## \\[|$)`);
const m = md.match(re);
if (!m) {
  console.error(`No CHANGELOG.md section for ${raw} (tried ## [v${version}] and ## [${version}]).`);
  process.exit(1);
}
process.stdout.write(m[1].trim() + "\n");
