/**
 * Cursor-native skill links and user-local plugin copies.
 *
 * skills.sh Cursor project target is `.agents/skills`. Cursor also loads
 * `.cursor/skills`, so we symlink after a project install.
 * User-scope plugins land in `~/.cursor/plugins/local/` as copies (npx cache
 * is ephemeral; a symlink from the npm store would break).
 */
import {
  mkdirSync,
  symlinkSync,
  lstatSync,
  rmSync,
  cpSync,
  existsSync,
  readdirSync,
  readlinkSync,
} from "node:fs";
import { join, relative } from "node:path";
import { homedir } from "node:os";
import { PKG_ROOT } from "./pkg.mjs";
import { rel } from "./render.mjs";

/**
 * Symlink `.cursor/skills/<name>` → `.agents/skills/<name>` after skills.sh.
 * Falls back to a copy when the platform refuses symlinks.
 * @param {string[]} skillNames
 * @returns {{ written: string[], notes: string[] }}
 */
export function linkCursorProjectSkills(skillNames, { cwd = process.cwd(), dryRun = false } = {}) {
  const written = [];
  const notes = [];
  if (!skillNames?.length) return { written, notes };

  const destDir = join(cwd, ".cursor", "skills");
  if (!dryRun) mkdirSync(destDir, { recursive: true });

  for (const name of skillNames) {
    const target = join(cwd, ".agents", "skills", name);
    const link = join(destDir, name);
    if (!existsSync(target)) {
      notes.push(`Skipped Cursor skill link for ${name}: ${rel(target)} not present.`);
      continue;
    }
    const relTarget = relative(destDir, target);
    if (dryRun) {
      written.push(rel(link));
      continue;
    }
    try {
      if (existsSync(link) || isSymlink(link)) {
        const st = lstatSync(link);
        if (st.isSymbolicLink() && readlinkSync(link) === relTarget) {
          written.push(rel(link));
          continue;
        }
        rmSync(link, { recursive: true, force: true });
      }
      symlinkSync(relTarget, link);
      written.push(rel(link));
    } catch {
      rmSync(link, { recursive: true, force: true });
      cpSync(target, link, { recursive: true });
      written.push(rel(link));
      notes.push(`Copied ${name} into .cursor/skills (symlink unavailable).`);
    }
  }
  return { written, notes };
}

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Copy bundled domain plugins into Cursor's local plugin folder.
 * @returns {{ written: string[], notes: string[] }}
 */
export function copyCursorLocalPlugins({
  home = homedir(),
  dryRun = false,
  srcRoot = join(PKG_ROOT, "plugins"),
} = {}) {
  const written = [];
  const notes = [];
  if (!existsSync(srcRoot)) {
    notes.push("No plugins/ in this package — skipped Cursor local plugins.");
    return { written, notes };
  }
  const destRoot = join(home, ".cursor", "plugins", "local");
  const names = readdirSync(srcRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (!dryRun) mkdirSync(destRoot, { recursive: true });
  for (const name of names) {
    const dest = join(destRoot, name);
    if (!dryRun) {
      rmSync(dest, { recursive: true, force: true });
      cpSync(join(srcRoot, name), dest, { recursive: true });
    }
    written.push(dest);
  }
  if (names.length) {
    notes.push(
      "Cursor plugins copied to ~/.cursor/plugins/local/. Reload the window, then check Customize. Customize → User Rules is account UI and is not written by this CLI.",
    );
  }
  return { written, notes };
}

/**
 * List plugin ids currently copied under ~/.cursor/plugins/local.
 * @param {string} [home]
 */
export function listCursorLocalPlugins(home = homedir()) {
  const destRoot = join(home, ".cursor", "plugins", "local");
  if (!existsSync(destRoot)) return [];
  return readdirSync(destRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * Remove a Cursor project skill link (or copy) for the given names.
 * @param {string[]} skillNames
 */
export function unlinkCursorProjectSkills(skillNames, { cwd = process.cwd(), dryRun = false } = {}) {
  const removed = [];
  for (const name of skillNames) {
    const link = join(cwd, ".cursor", "skills", name);
    if (!existsSync(link) && !isSymlink(link)) continue;
    if (!dryRun) rmSync(link, { recursive: true, force: true });
    removed.push(rel(link));
  }
  return removed;
}
