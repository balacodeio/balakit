/**
 * Mental tooling scope and `.mental/` data-policy modes.
 *
 * Tooling scope (where rule/skill live) is independent of data policy
 * (how `.mental/` stays out of — or enters — git).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ensureMentalExcluded,
  checkMentalExcluded,
  MENTAL_IGNORE_LINE,
  MENTAL_IGNORE_COMMENT,
  gitAvailable,
  runGit,
  locateMentalIgnoreSources,
  removeMentalIgnoreLine,
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
 * Never silently removes a global exclude — use `liftMentalIgnores` for that.
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

  // tracked — do not add ignores; report active ignore sources
  const located = locateMentalIgnoreSources({ cwd, home });
  const ignored = located.liveIgnored === true || located.sources.length > 0;
  return {
    ok: true,
    policy,
    mechanism: "tracked",
    ignored,
    globalHasLine: located.sources.some((s) => s.kind === "global-exclude"),
    sources: located.sources,
    note: ignored
      ? `Tracked mode selected, but .mental/ is still ignored via:\n${located.sources
          .map((s) => `  - ${s.kind}: ${s.file}`)
          .join("\n")}\nRun \`npx balakit doctor --lift-ignore\` to remove those lines (explicit confirm; never silent), or \`git add -f .mental\` for a one-off force-add.`
      : "Tracked mode: .mental/ is not ignored here. Agents may create and commit continuity data — no privacy promise.",
  };
}

/**
 * Explicitly remove balakit `.mental/` ignore lines from discovered sources.
 * Never called implicitly — requires `doctor --lift-ignore` (or install prompt).
 *
 * @param {{ cwd?: string, home?: string, dryRun?: boolean }} [opts]
 */
export function liftMentalIgnores({ cwd = process.cwd(), home, dryRun = false } = {}) {
  const { sources } = locateMentalIgnoreSources({ cwd, home });
  if (!sources.length) {
    return { ok: true, lifted: [], skipped: [], message: "No .mental/ ignore lines found to lift." };
  }
  const lifted = [];
  const skipped = [];
  for (const s of sources) {
    if (dryRun) {
      lifted.push({ ...s, dryRun: true });
      continue;
    }
    const r = removeMentalIgnoreLine(s.file);
    if (r.removed) lifted.push({ ...s, removed: true });
    else skipped.push({ ...s, reason: r.reason || "line not present" });
  }
  return { ok: true, lifted, skipped };
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
    const { sources } = locateMentalIgnoreSources({ cwd, home });
    return {
      ok: live !== true && sources.length === 0,
      policy,
      liveIgnored: live,
      sources,
      message:
        live === true || sources.length
          ? ".mental/ is still ignored — run `npx balakit doctor --lift-ignore`"
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
 * Mode-aware doctor: repair private modes; for tracked, report or lift ignores.
 * @param {MentalDataPolicy} [policy]
 * @param {{ cwd?: string, home?: string, liftIgnore?: boolean, yes?: boolean, dryRun?: boolean }} [opts]
 * @returns {number|Promise<number>} exit code
 */
export async function runPolicyDoctor(policy = DEFAULT_MENTAL_DATA_POLICY, opts = {}) {
  const { liftIgnore = false, yes = false, dryRun = false } = opts;
  console.log(`Mental data policy: ${policy}`);
  console.log(`  ${describeDataPolicy(policy)}\n`);

  if (liftIgnore) {
    const located = locateMentalIgnoreSources(opts);
    if (!located.sources.length) {
      console.log("✓ No .mental/ ignore lines found — nothing to lift.");
      return 0;
    }
    console.log("Will remove .mental/ ignore lines from:");
    for (const s of located.sources) console.log(`  - ${s.kind}: ${s.file}`);
    console.log(
      "\n⚠ This affects privacy for EVERY repo that relied on those lines (especially global-exclude).",
    );
    if (dryRun) {
      console.log("\n[dry-run] No files written.");
      return 0;
    }
    if (!yes) {
      // dynamic import to avoid clack in unit tests that only call liftMentalIgnores
      const p = await import("@clack/prompts");
      const go = await p.confirm({
        message: "Lift these ignore lines now? (never done silently)",
      });
      if (p.isCancel(go) || !go) {
        console.log("Cancelled — ignores left in place.");
        return 1;
      }
    }
    const r = liftMentalIgnores(opts);
    for (const s of r.lifted) console.log(`✓ removed from ${s.file}`);
    for (const s of r.skipped) console.log(`· skipped ${s.file} (${s.reason || "n/a"})`);
    const after = locateMentalIgnoreSources(opts);
    if (after.liveIgnored === true) {
      console.log(
        "\n✖ .mental/ is still ignored (another rule may apply). Inspect with `git check-ignore -v .mental/probe`.",
      );
      return 1;
    }
    console.log("\n✓ Ignore lines lifted. Tracked Mental can see untracked `.mental/` files.");
    return 0;
  }

  if (policy === "tracked") {
    const c = checkDataPolicy(policy, opts);
    console.log(c.ok ? `✓ ${c.message}` : `✖ ${c.message}`);
    if (!c.ok) {
      const { sources } = locateMentalIgnoreSources(opts);
      for (const s of sources) console.log(`  - ${s.kind}: ${s.file}`);
      console.log("\nRun: npx balakit doctor --lift-ignore");
      console.log("Or force-add once: git add -f .mental");
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
