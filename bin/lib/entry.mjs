/**
 * Detect whether this module is the Node process entry point.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Compare two filesystem paths after resolving symlinks.
 *
 * @param {string} a
 * @param {string} b
 */
function sameResolvedPath(a, b) {
  let left = a;
  let right = b;
  try {
    left = realpathSync(a);
  } catch {
    // argv[1] may be missing on disk in tests; keep the raw path.
  }
  try {
    right = realpathSync(b);
  } catch {
    // Keep the raw module path when realpath fails.
  }
  if (process.platform === "win32") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

/**
 * True when `argv1` points at the CLI module (direct invoke or npm/npx bin shim).
 *
 * npm links `node_modules/.bin/balakit` → `../balakit/bin/cli.mjs`. On Linux, macOS,
 * and WSL, `process.argv[1]` is the symlink path while `import.meta.url` is the target.
 * Resolving both paths before comparing keeps `npx balakit` and global installs working.
 *
 * @param {string} importMetaUrl Value of `import.meta.url` for the CLI module.
 * @param {string | undefined} [argv1] Usually `process.argv[1]`.
 */
export function isCliEntry(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  return sameResolvedPath(argv1, fileURLToPath(importMetaUrl));
}
