/**
 * Machine-wide git excludes for `.mental/` — never a repo `.gitignore`.
 *
 * The mental rule promises `.mental/` stays out of git via core.excludesfile.
 * If that promise isn't kept, a private continuity log can be `git add -A`'d and
 * pushed. These helpers make the guarantee real, idempotent, and testable.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

export const MENTAL_IGNORE_LINE = ".mental/";
export const MENTAL_IGNORE_COMMENT =
  "# balakit: private project continuity (mental skill) — never commit";

/** Run a git command (honors GIT_CONFIG_GLOBAL in tests). */
export function runGit(...args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

/** True when git is on PATH and runnable. */
export function gitAvailable() {
  const r = runGit("--version");
  return !r.error && r.status === 0;
}

/** Expand a leading `~` in a git-config path value to the home dir. */
export function expandHome(p, home) {
  if (p === "~") return home;
  if (p.startsWith("~/") || p.startsWith("~\\")) return join(home, p.slice(2));
  return p;
}

/**
 * Git's default global excludes file when `core.excludesfile` is unset:
 * `$XDG_CONFIG_HOME/git/ignore`, else `<home>/.config/git/ignore`.
 */
export function defaultExcludesFile(home) {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() ? xdg : join(home, ".config");
  return join(base, "git", "ignore");
}

/**
 * Resolve the active global excludes file to an absolute path.
 * Honors an existing `core.excludesfile` (never overwrites the user's choice).
 */
export function resolveGlobalExcludesFile({ create = false, home = homedir() } = {}) {
  if (!gitAvailable()) return null;
  const configured = (runGit("config", "--global", "--get", "core.excludesfile").stdout || "").trim();
  if (configured) return { file: expandHome(configured, home), created: false };
  if (!create) return { file: null, created: false };
  const file = defaultExcludesFile(home);
  runGit("config", "--global", "core.excludesfile", file.split("\\").join("/"));
  return { file, created: true };
}

/**
 * Idempotently guarantee `.mental/` is in the machine-wide git excludes.
 */
export function ensureMentalExcluded({ home = homedir() } = {}) {
  const resolved = resolveGlobalExcludesFile({ create: true, home });
  if (!resolved) return { ok: false, reason: "git-unavailable" };
  const { file, created } = resolved;
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  const present = cur.split(/\r?\n/).some((l) => l.trim() === MENTAL_IGNORE_LINE);
  if (!present) {
    mkdirSync(dirname(file), { recursive: true });
    const gap = cur && !cur.endsWith("\n") ? "\n" : "";
    writeFileSync(file, `${cur}${gap}${MENTAL_IGNORE_COMMENT}\n${MENTAL_IGNORE_LINE}\n`);
  }
  return { ok: true, file, created, appended: !present };
}

/**
 * Read-only check that the `.mental/` global exclude is in force.
 */
export function checkMentalExcluded({ home = homedir() } = {}) {
  if (!gitAvailable()) return { ok: false, reason: "git-unavailable" };
  const configured = (runGit("config", "--global", "--get", "core.excludesfile").stdout || "").trim();
  const file = configured ? expandHome(configured, home) : defaultExcludesFile(home);
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  const hasLine = cur.split(/\r?\n/).some((l) => l.trim() === MENTAL_IGNORE_LINE);
  const ci = runGit("check-ignore", "-q", ".mental/probe");
  const liveIgnored = ci.status === 128 ? null : ci.status === 0;
  return { ok: hasLine && liveIgnored !== false, file, hasLine, configured: !!configured, liveIgnored };
}

/**
 * Verify (and repair) the `.mental/` global git-exclude.
 * Prefer `runPolicyDoctor` from mental-policy.mjs for mode-aware checks.
 * @returns {number} Process exit code (0 = secured).
 */
export function runDoctor() {
  if (!gitAvailable()) {
    console.error("✖ git is not on PATH — cannot verify or set the .mental/ global exclude.");
    return 1;
  }
  ensureMentalExcluded();
  const check = checkMentalExcluded();
  const mark = (b) => (b ? "✓" : "✖");
  console.log(
    `${mark(check.configured)} core.excludesfile ${check.configured ? "is set" : "is UNSET (using git's XDG default path)"}`,
  );
  console.log(
    `${mark(check.hasLine)} ${check.file} ${check.hasLine ? "contains" : "is MISSING"} a \`.mental/\` line`,
  );
  if (check.liveIgnored === true)
    console.log("✓ git check-ignore confirms .mental/ is ignored in this repo");
  else if (check.liveIgnored === false)
    console.log("✖ git check-ignore says .mental/ is NOT ignored here");
  else console.log("· run inside a git repo to live-verify with check-ignore");
  const ok = check.hasLine && check.liveIgnored !== false;
  console.log(ok ? "\n✓ .mental/ is protected from git." : "\n✖ .mental/ is NOT protected — see above.");
  return ok ? 0 : 1;
}
