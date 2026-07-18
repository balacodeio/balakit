/**
 * Mental tooling scope and `.mental/` data-policy modes.
 *
 * Tooling scope (where rule/skill live) is independent of data policy
 * (how `.mental/` stays out of — or enters — git).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ensureMentalExcluded,
  checkMentalExcluded,
  MENTAL_IGNORE_LINE,
  MENTAL_IGNORE_COMMENT,
  gitAvailable,
  runGit,
} from "./mental-exclude.mjs";

/** @typedef {"user"|"project"} MentalToolingScope */
/** @typedef {"global-exclude"|"clone-exclude"|"repo-gitignore"|"tracked"} MentalDataPolicy */

export const MENTAL_TOOLING_SCOPES = /** @type {const} */ (["user", "project"]);
export const MENTAL_DATA_POLICIES = /** @type {const} */ ([
  "global-exclude",
  "clone-exclude",
  "repo-gitignore",
  "tracked",
]);

export const DEFAULT_MENTAL_TOOLING = "user";
export const DEFAULT_MENTAL_DATA_POLICY = "global-exclude";

/**
 * One-line consequence for each data policy (wizard + review).
 * @param {MentalDataPolicy} policy
 */
export function describeDataPolicy(policy) {
  switch (policy) {
    case "global-exclude":
      return "Private on this machine — appends .mental/ to your global git excludes (all repos).";
    case "clone-exclude":
      return "Private in this clone only — writes .git/info/exclude (not shared; re-run after clone).";
    case "repo-gitignore":
      return "Private by repo policy — commits .mental/ into .gitignore (visible to collaborators).";
    case "tracked":
      return "Shared/tracked — .mental/ may be committed; NO privacy promise (secrets/history risk).";
    default:
      return String(policy);
  }
}

/**
 * One-line consequence for tooling scope.
 * @param {MentalToolingScope} scope
 */
export function describeToolingScope(scope) {
  if (scope === "project") {
    return "Mental rule/skill install into this project (may be committed; collaborators see the wiring).";
  }
  return "Mental rule/skill install user-wide (~/.claude, ~/.codex, ~/.cursor + skills -g).";
}

/**
 * True when the policy requires interactive confirmation beyond -y.
 * @param {MentalDataPolicy} policy
 */
export function requiresHardConfirm(policy) {
  return policy === "repo-gitignore" || policy === "tracked";
}

/**
 * Append a line to a file if missing (idempotent).
 * @param {string} file
 * @param {string} line
 * @param {string} [comment]
 */
function ensureLineInFile(file, line, comment = MENTAL_IGNORE_COMMENT) {
  let cur = "";
  let existed = false;
  try {
    cur = readFileSync(file, "utf8");
    existed = true;
  } catch {}
  const present = cur.split(/\r?\n/).some((l) => l.trim() === line);
  if (present) return { ok: true, file, appended: false, created: false };
  mkdirSync(dirname(file), { recursive: true });
  const gap = cur && !cur.endsWith("\n") ? "\n" : "";
  const prefix = cur ? `${cur}${gap}` : "";
  writeFileSync(file, `${prefix}${comment}\n${line}\n`);
  return { ok: true, file, appended: true, created: !existed };
}

/**
 * Apply the chosen data policy. Never stages, commits, or deletes `.mental/` data.
 * Never silently removes a global exclude.
 *
 * @param {MentalDataPolicy} policy
 * @param {{ cwd?: string, home?: string, dryRun?: boolean }} [opts]
 */
export function applyDataPolicy(policy, { cwd = process.cwd(), home, dryRun = false } = {}) {
  if (dryRun) {
    return { ok: true, policy, dryRun: true, actions: [`Would apply data policy: ${policy}`] };
  }

  if (policy === "global-exclude") {
    const r = ensureMentalExcluded(home ? { home } : {});
    return { ok: r.ok, policy, mechanism: "global-exclude", ...r };
  }

  if (policy === "clone-exclude") {
    if (!gitAvailable()) return { ok: false, policy, reason: "git-unavailable" };
    const gitDir = runGit("-C", cwd, "rev-parse", "--git-dir");
    if (gitDir.status !== 0) {
      return { ok: false, policy, reason: "not-a-git-repo" };
    }
    const dir = (gitDir.stdout || "").trim();
    const excludeFile = dir.startsWith("/") || /^[A-Za-z]:/.test(dir)
      ? join(dir, "info", "exclude")
      : join(cwd, dir, "info", "exclude");
    const r = ensureLineInFile(excludeFile, MENTAL_IGNORE_LINE);
    return { ok: true, policy, mechanism: "clone-exclude", ...r };
  }

  if (policy === "repo-gitignore") {
    const file = join(cwd, ".gitignore");
    const r = ensureLineInFile(file, MENTAL_IGNORE_LINE);
    return { ok: true, policy, mechanism: "repo-gitignore", ...r };
  }

  // tracked — do not add ignores; explain if global ignore already blocks
  const check = checkMentalExcluded(home ? { home } : {});
  const live = runGit("-C", cwd, "check-ignore", "-q", ".mental/probe");
  const ignored = live.status === 0;
  return {
    ok: true,
    policy,
    mechanism: "tracked",
    ignored,
    globalHasLine: check.hasLine,
    note: ignored
      ? "Tracked mode selected, but .mental/ is currently ignored (global/clone/repo). Already-tracked files are unaffected; use `git add -f .mental` after removing ignore lines if you intend to commit."
      : "Tracked mode: .mental/ is not ignored here. Agents may create and commit continuity data — no privacy promise.",
  };
}

/**
 * Verify the active data policy (mode-aware doctor check).
 * @param {MentalDataPolicy} [policy]
 * @param {{ cwd?: string, home?: string }} [opts]
 */
export function checkDataPolicy(policy = DEFAULT_MENTAL_DATA_POLICY, { cwd = process.cwd(), home } = {}) {
  const live = gitAvailable()
    ? (() => {
        const ci = runGit("-C", cwd, "check-ignore", "-q", ".mental/probe");
        if (ci.status === 128) return null;
        return ci.status === 0;
      })()
    : null;

  if (policy === "tracked") {
    return {
      ok: live !== true,
      policy,
      liveIgnored: live,
      message:
        live === true
          ? ".mental/ is still ignored — tracked mode cannot see untracked files until ignore is lifted"
          : ".mental/ is not ignored (tracked mode)",
    };
  }

  if (policy === "global-exclude") {
    const g = checkMentalExcluded(home ? { home } : {});
    return {
      ok: g.hasLine && live !== false,
      policy,
      ...g,
      message: g.hasLine
        ? "global exclude line present"
        : "global exclude line missing",
    };
  }

  if (policy === "clone-exclude") {
    return {
      ok: live === true,
      policy,
      liveIgnored: live,
      message:
        live === true
          ? "clone-local exclude (or other ignore) protects .mental/"
          : ".mental/ is NOT ignored in this clone",
    };
  }

  if (policy === "repo-gitignore") {
    const file = join(cwd, ".gitignore");
    let hasLine = false;
    try {
      hasLine = readFileSync(file, "utf8")
        .split(/\r?\n/)
        .some((l) => l.trim() === MENTAL_IGNORE_LINE);
    } catch {}
    return {
      ok: hasLine && live !== false,
      policy,
      hasLine,
      liveIgnored: live,
      file,
      message: hasLine
        ? ".gitignore contains .mental/"
        : ".gitignore is missing a .mental/ line",
    };
  }

  return { ok: false, policy, message: "unknown policy" };
}

/**
 * Mode-aware doctor: repair when the policy is a private mode; report for tracked.
 * @param {MentalDataPolicy} [policy]
 * @param {{ cwd?: string, home?: string }} [opts]
 * @returns {number} exit code
 */
export function runPolicyDoctor(policy = DEFAULT_MENTAL_DATA_POLICY, opts = {}) {
  console.log(`Mental data policy: ${policy}`);
  console.log(`  ${describeDataPolicy(policy)}\n`);

  if (policy === "tracked") {
    const c = checkDataPolicy(policy, opts);
    console.log(c.ok ? `✓ ${c.message}` : `✖ ${c.message}`);
    if (!c.ok) {
      console.log(
        "\nTracked mode with an active ignore: remove the .mental/ line from global excludes,",
      );
      console.log(".git/info/exclude, or .gitignore — or force-add with `git add -f .mental`.");
      console.log("Balakit never silently removes ignore lines.");
    }
    return c.ok ? 0 : 1;
  }

  if (policy === "global-exclude") {
    const r = applyDataPolicy("global-exclude", opts);
    if (!r.ok) {
      console.error("✖ could not secure global exclude (is git on PATH?)");
      return 1;
    }
    const c = checkDataPolicy("global-exclude", opts);
    console.log(`${c.hasLine ? "✓" : "✖"} ${c.file}`);
    if (c.liveIgnored === true) console.log("✓ check-ignore confirms ignore here");
    else if (c.liveIgnored === false) console.log("✖ check-ignore says NOT ignored here");
    else console.log("· run inside a git repo to live-verify");
    return c.ok ? 0 : 1;
  }

  const r = applyDataPolicy(policy, opts);
  if (!r.ok) {
    console.error(`✖ could not apply ${policy}: ${r.reason || "unknown"}`);
    return 1;
  }
  if (r.appended) console.log(`✓ wrote ${r.file}`);
  else console.log(`✓ confirmed ${r.file || policy}`);
  const c = checkDataPolicy(policy, opts);
  console.log(c.ok ? `✓ ${c.message}` : `✖ ${c.message}`);
  return c.ok ? 0 : 1;
}
