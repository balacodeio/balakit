/**
 * Install manifest — tracks what balakit owns so status/remove/update work.
 *
 * Project: `.balakit/installed.json`
 * Personal/global: `~/.balakit/installed.json`
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { VERSION, MANIFEST_SCHEMA, canonicalizeRuleNames } from "./pkg.mjs";

/**
 * @typedef {{
 *   schema: number,
 *   rules: string[],
 *   skills: string[],
 *   agents: string[],
 *   surfaces: string[],
 *   mentalTooling: string|null,
 *   mentalDataPolicy: string|null,
 *   updatedAt: string,
 *   version: string,
 * }} Manifest
 */

/** @returns {Manifest} */
function empty() {
  return {
    schema: MANIFEST_SCHEMA,
    rules: [],
    skills: [],
    agents: [],
    surfaces: [],
    mentalTooling: null,
    mentalDataPolicy: null,
    updatedAt: new Date().toISOString(),
    version: VERSION,
  };
}

/**
 * Normalize a raw JSON object to the current Manifest schema.
 * Legacy Mental policy fields are preserved when present so old files stay readable.
 * @param {object} data
 * @returns {Manifest}
 */
export function migrateManifest(data) {
  const rules = canonicalizeRuleNames(Array.isArray(data.rules) ? data.rules : []);
  const skills = Array.isArray(data.skills) ? data.skills : [];
  return {
    schema: MANIFEST_SCHEMA,
    rules,
    skills,
    agents: Array.isArray(data.agents) ? data.agents : [],
    surfaces: Array.isArray(data.surfaces) ? data.surfaces : [],
    mentalTooling: data.mentalTooling ?? null,
    mentalDataPolicy: data.mentalDataPolicy ?? null,
    updatedAt: data.updatedAt ?? "",
    version: data.version ?? "",
  };
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
    return migrateManifest(data);
  } catch {
    return { ...empty(), _corrupt: true };
  }
}

/**
 * True when the manifest file was unreadable (treated as empty).
 * @param {Manifest & {_corrupt?: boolean}} m
 */
export function isCorruptManifest(m) {
  return m?._corrupt === true;
}

/** @param {string} file @param {Partial<Manifest>} data */
export function writeManifest(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const out = {
    schema: MANIFEST_SCHEMA,
    rules: canonicalizeRuleNames(data.rules ?? []).sort(),
    skills: [...new Set(data.skills ?? [])].sort(),
    agents: [...new Set(data.agents ?? [])].sort(),
    surfaces: [...new Set(data.surfaces ?? [])].sort(),
    mentalTooling: data.mentalTooling ?? null,
    mentalDataPolicy: data.mentalDataPolicy ?? null,
    updatedAt: new Date().toISOString(),
    version: VERSION,
  };
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  return out;
}

/**
 * Merge names into a manifest file.
 * @param {"project"|"global"} scope
 */
export function recordInstall(scope, patch, { cwd = process.cwd(), home = homedir(), dryRun = false } = {}) {
  const file = scope === "global" ? globalManifestPath(home) : projectManifestPath(cwd);
  const cur = readManifest(file);
  const next = {
    rules: [...cur.rules, ...(patch.rules ?? [])],
    skills: [...cur.skills, ...(patch.skills ?? [])],
    agents: [...(cur.agents ?? []), ...(patch.agents ?? [])],
    surfaces: [...(cur.surfaces ?? []), ...(patch.surfaces ?? [])],
    mentalTooling: cur.mentalTooling,
    mentalDataPolicy: cur.mentalDataPolicy,
  };
  if (dryRun) return { file, ...next };
  return { file, ...writeManifest(file, next) };
}

/**
 * Remove names from a manifest file.
 * @param {"project"|"global"} scope
 */
export function recordRemove(scope, names, { cwd = process.cwd(), home = homedir(), dryRun = false } = {}) {
  const file = scope === "global" ? globalManifestPath(home) : projectManifestPath(cwd);
  const cur = readManifest(file);
  const dropR = new Set(canonicalizeRuleNames(names.rules ?? []));
  const dropS = new Set(names.skills ?? []);
  const nextRules = cur.rules.filter((r) => !dropR.has(r));
  const nextSkills = cur.skills.filter((s) => !dropS.has(s));
  const stillMental = nextRules.includes("mental") || nextSkills.includes("mental");
  const next = {
    rules: nextRules,
    skills: nextSkills,
    agents: cur.agents ?? [],
    surfaces: cur.surfaces ?? [],
    mentalTooling: stillMental ? cur.mentalTooling : null,
    mentalDataPolicy: stillMental ? cur.mentalDataPolicy : null,
  };
  if (dryRun) return { file, ...next };
  if (!existsSync(file) && !cur.rules.length && !cur.skills.length) return { file, ...next };
  return { file, ...writeManifest(file, next) };
}
