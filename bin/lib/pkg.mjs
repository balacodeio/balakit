/**
 * Package identity and kit constants shared across the CLI.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the published package root (parent of `bin/`). */
export const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));

/** npm package name. */
export const NAME = pkg.name;

/** CLI binary name. */
export const CMD = Object.keys(pkg.bin ?? {})[0] ?? NAME;

/** Semver from package.json. */
export const VERSION = pkg.version;

/**
 * GitHub owner/repo slug for skills.sh, derived from package.json `repository.url`.
 */
export const REPO =
  (pkg.repository?.url ?? "")
    .replace(/^git\+/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "") || NAME;

export const RULES_DIR = join(PKG_ROOT, "rules");
export const SKILLS_DIR = join(PKG_ROOT, "skills");

/**
 * Rule → skills that must ship with it. The rule is the always-on pointer; the
 * skill carries the procedure. Selecting the rule always installs the skill.
 */
export const RULE_BUNDLED_SKILLS = { mental: ["mental"] };

/**
 * Rules that participate in the Mental role (rule + skill + data policy).
 * Tooling scope is chosen at install time (user-wide or project).
 */
export const PERSONAL_RULES = ["mental"];

/** Default team kit installed by `balakit init`. */
export const TEAM_INIT_RULES = ["global", "testing", "comments", "changelog"];

/** Manifest schema version for ownership ledger. */
export const MANIFEST_SCHEMA = 2;

/** Reverse map: skill name → rules that bundle it. */
export const SKILL_BUNDLED_BY = Object.entries(RULE_BUNDLED_SKILLS).reduce(
  (m, [rule, skills]) => {
    for (const s of skills) (m[s] ??= []).push(rule);
    return m;
  },
  {},
);

export const BEGIN = `<!-- BEGIN ${NAME} (managed — edits inside are overwritten on reinstall) -->`;
export const END = `<!-- END ${NAME} -->`;
