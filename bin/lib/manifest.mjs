/**
 * Install manifest — tracks what balakit owns so status/remove/update work.
 *
 * Project: `.balakit/installed.json`
 * Personal/global: `~/.balakit/installed.json`
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { VERSION } from "./pkg.mjs";

/**
 * @typedef {{ rules: string[], skills: string[], updatedAt: string, version: string }} Manifest
 */

/** @returns {Manifest} */
function empty() {
  return { rules: [], skills: [], updatedAt: new Date().toISOString(), version: VERSION };
}

export function projectManifestPath(cwd = process.cwd()) {
  return join(cwd, ".balakit", "installed.json");
}

export function globalManifestPath(home = homedir()) {
  return join(home, ".balakit", "installed.json");
}

/** @param {string} file @returns {Manifest} */
export function readManifest(file) {
  if (!existsSync(file)) return empty();
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return {
      rules: Array.isArray(data.rules) ? data.rules : [],
      skills: Array.isArray(data.skills) ? data.skills : [],
      updatedAt: data.updatedAt ?? "",
      version: data.version ?? "",
    };
  } catch {
    return empty();
  }
}

/** @param {string} file @param {Manifest} data */
export function writeManifest(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const out = {
    rules: [...new Set(data.rules)].sort(),
    skills: [...new Set(data.skills)].sort(),
    updatedAt: new Date().toISOString(),
    version: VERSION,
  };
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  return out;
}

/**
 * Merge names into a manifest file.
 * @param {"project"|"global"} scope
 * @param {{ rules?: string[], skills?: string[] }} names
 */
export function recordInstall(scope, names, { cwd = process.cwd(), home = homedir(), dryRun = false } = {}) {
  const file = scope === "global" ? globalManifestPath(home) : projectManifestPath(cwd);
  const cur = readManifest(file);
  const next = {
    rules: [...cur.rules, ...(names.rules ?? [])],
    skills: [...cur.skills, ...(names.skills ?? [])],
  };
  if (dryRun) return { file, ...next };
  return { file, ...writeManifest(file, next) };
}

/**
 * Remove names from a manifest file.
 * @param {"project"|"global"} scope
 * @param {{ rules?: string[], skills?: string[] }} names
 */
export function recordRemove(scope, names, { cwd = process.cwd(), home = homedir(), dryRun = false } = {}) {
  const file = scope === "global" ? globalManifestPath(home) : projectManifestPath(cwd);
  const cur = readManifest(file);
  const dropR = new Set(names.rules ?? []);
  const dropS = new Set(names.skills ?? []);
  const next = {
    rules: cur.rules.filter((r) => !dropR.has(r)),
    skills: cur.skills.filter((s) => !dropS.has(s)),
  };
  if (dryRun) return { file, ...next };
  if (!existsSync(file) && !cur.rules.length && !cur.skills.length) return { file, ...next };
  return { file, ...writeManifest(file, next) };
}
