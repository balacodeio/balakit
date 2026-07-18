/**
 * Machine-wide git excludes for `.mental/` — never a repo `.gitignore` by default.
 *
 * The mental rule promises `.mental/` stays out of git via core.excludesfile
 * (or another chosen private policy). These helpers make the guarantee real,
 * idempotent, and testable — and can explicitly lift ignore lines when the
 * user switches to tracked mode.
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
 * Remove `.mental/` ignore lines (and the balakit comment) from a file.
 * @param {string} file
 * @returns {{ ok: boolean, file: string, removed: boolean, reason?: string }}
 */
export function removeMentalIgnoreLine(file) {
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {
    return { ok: false, file, removed: false, reason: "missing" };
  }
  const lines = cur.split(/\r?\n/);
  const next = [];
  let removed = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === MENTAL_IGNORE_LINE) {
      removed = true;
      if (next.length && next[next.length - 1].trim() === MENTAL_IGNORE_COMMENT) {
        next.pop();
      }
      continue;
    }
    next.push(lines[i]);
  }
  if (!removed) return { ok: true, file, removed: false };
  while (next.length && next[next.length - 1] === "") next.pop();
  writeFileSync(file, next.length ? next.join("\n") + "\n" : "");
  return { ok: true, file, removed: true };
}

/**
 * Classify an ignore source path.
 * @param {string} file
 */
function classifyIgnoreFile(file) {
  const norm = file.split("\\").join("/");
  if (norm.endsWith("/info/exclude") || norm.includes("/info/exclude")) return "clone-exclude";
  if (norm.endsWith("/.gitignore") || norm.endsWith(".gitignore")) return "repo-gitignore";
  return "global-exclude";
}

/**
 * Locate files that currently ignore `.mental/`.
 * @param {{ cwd?: string, home?: string }} [opts]
 * @returns {{ liveIgnored: boolean|null, sources: Array<{ kind: string, file: string, line?: string }> }}
 */
export function locateMentalIgnoreSources({ cwd = process.cwd(), home = homedir() } = {}) {
  /** @type {Array<{ kind: string, file: string, line?: string }>} */
  const sources = [];
  if (!gitAvailable()) return { liveIgnored: null, sources };

  const ci = runGit("-C", cwd, "check-ignore", "-v", ".mental/probe");
  const liveIgnored = ci.status === 128 ? null : ci.status === 0;
  if (ci.status === 0 && ci.stdout) {
    for (const row of ci.stdout.trim().split(/\r?\n/).filter(Boolean)) {
      const m = row.match(/^(.*):(\d+):(.*)\t/);
      if (!m) continue;
      const file = m[1];
      const pattern = m[3];
      sources.push({ kind: classifyIgnoreFile(file), file, line: pattern });
    }
  }

  const g = checkMentalExcluded({ home });
  if (g.hasLine && g.file && !sources.some((s) => s.file === g.file)) {
    sources.push({ kind: "global-exclude", file: g.file, line: MENTAL_IGNORE_LINE });
  }

  // Scan clone + repo even if check-ignore failed (e.g. not a repo)
  const cloneExclude = join(cwd, ".git", "info", "exclude");
  try {
    const cur = readFileSync(cloneExclude, "utf8");
    if (cur.split(/\r?\n/).some((l) => l.trim() === MENTAL_IGNORE_LINE)) {
      if (!sources.some((s) => s.file === cloneExclude)) {
        sources.push({ kind: "clone-exclude", file: cloneExclude, line: MENTAL_IGNORE_LINE });
      }
    }
  } catch {}
  const gi = join(cwd, ".gitignore");
  try {
    const cur = readFileSync(gi, "utf8");
    if (cur.split(/\r?\n/).some((l) => l.trim() === MENTAL_IGNORE_LINE)) {
      if (!sources.some((s) => s.file === gi)) {
        sources.push({ kind: "repo-gitignore", file: gi, line: MENTAL_IGNORE_LINE });
      }
    }
  } catch {}

  return { liveIgnored, sources };
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
