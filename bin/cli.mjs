#!/usr/bin/env node
/**
 * Interactive installer for this repository's opinionated rules and skills.
 *
 * Identity (package name + GitHub slug) is read from package.json at runtime,
 * so renaming/moving the repo needs no change here.
 *
 * Rules are installed natively, because skills.sh installs skills only and never
 * writes rule files. Rules can be installed per-project or globally (user-level);
 * each agent's destination differs per scope — see ruleTarget. Every agent has
 * an automated destination at both scopes; targets with platform caveats
 * (e.g. Cursor's workspace-less global-rules bug) carry a `note` surfaced
 * after install.
 *
 * Some rules are half of a rule+skill pair (RULE_BUNDLED_SKILLS): the rule is
 * the always-on pointer, the skill carries the procedure. Selecting such a rule
 * installs its skill automatically — the pair is meaningless apart.
 *
 * Skills are delegated to skills.sh (`npx skills add`) so its maintained
 * per-agent path map and global locations are reused rather than reimplemented.
 *
 * Non-interactive use: every prompt has a matching flag (see USAGE).
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, dirname, basename, relative, sep } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import * as p from "@clack/prompts";

const PKG_ROOT = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));
const NAME = pkg.name;
const CMD = Object.keys(pkg.bin ?? {})[0] ?? NAME;
/** owner/repo slug for skills.sh, derived from package.json `repository.url`. */
const REPO =
  (pkg.repository?.url ?? "")
    .replace(/^git\+/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "") || NAME;

const RULES_DIR = join(PKG_ROOT, "rules");
const SKILLS_DIR = join(PKG_ROOT, "skills");

/**
 * Supported agents. `skillsShId` is the id skills.sh expects (verified against
 * `npx skills add` agent validation; null = no skills.sh support — the agent is
 * excluded from skill installs with a note).
 */
const AGENTS = [
  { id: "cursor", label: "Cursor", skillsShId: "cursor" },
  { id: "claude-code", label: "Claude Code", skillsShId: "claude-code" },
  { id: "codex", label: "Codex", skillsShId: "codex" },
  { id: "opencode", label: "OpenCode", skillsShId: "opencode" },
  { id: "copilot", label: "GitHub Copilot", skillsShId: "github-copilot" },
  { id: "cline", label: "Cline", skillsShId: "cline" },
  { id: "kilocode", label: "Kilo Code", skillsShId: "kilo" },
  // oh-my-pi is a distribution of the `pi` coding agent — skills.sh knows `pi`.
  { id: "omp", label: "omp (oh-my-pi)", skillsShId: "pi" },
];
const AGENT_IDS = AGENTS.map((a) => a.id);

/**
 * Rule → skills that must ship with it. The rule is the always-on pointer; the
 * skill carries the procedure it points at. Selecting the rule always installs
 * the skill — there is deliberately no way to opt out.
 */
const RULE_BUNDLED_SKILLS = { mental: ["mental"] };

/**
 * Personal-layer rules — meaningful to one user's machine, not to a team.
 * The scope prompt defaults these to global, and a project-scope install warns:
 * project scope writes the rule into committed files (CLAUDE.md / AGENTS.md /
 * rule dirs) that everyone in the repo sees.
 */
const PERSONAL_RULES = ["mental"];

/** Reverse of RULE_BUNDLED_SKILLS: skill name → rules that bundle it. */
const SKILL_BUNDLED_BY = Object.entries(RULE_BUNDLED_SKILLS).reduce(
  (m, [rule, skills]) => {
    for (const s of skills) (m[s] ??= []).push(rule);
    return m;
  },
  {},
);

/** Parse one .mdc rule into frontmatter fields, raw text, and body. */
function parseRule(file) {
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  const fm = m ? m[1] : "";
  const body = (m ? m[2] : raw).trim();
  const field = (k) =>
    (fm.match(new RegExp(`^${k}:\\s*(.+)$`, "m")) || [, ""])[1].trim();
  return {
    name: basename(file, ".mdc"),
    raw,
    always: /^alwaysApply:\s*true\s*$/m.test(fm),
    globs: field("globs"),
    description: field("description"),
    body,
  };
}

/** Extract a skill's description, handling YAML block scalars (`>-` etc.). */
function skillDescription(skillMd) {
  const m = skillMd.match(/^description:\s*(.*)$/m);
  let description = m ? m[1].trim() : "";
  if (/^[>|][-+]?$/.test(description)) {
    const collected = [];
    for (const line of skillMd.slice(m.index + m[0].length).split(/\r?\n/).slice(1)) {
      if (/^\s+\S/.test(line)) collected.push(line.trim());
      else if (line.trim() === "") continue;
      else break;
    }
    description = collected.join(" ");
  } else {
    description = description.replace(/^["']|["']$/g, "");
  }
  return description;
}

const allRules = readdirSync(RULES_DIR)
  .filter((f) => f.endsWith(".mdc"))
  .map((f) => parseRule(join(RULES_DIR, f)))
  .sort((a, b) =>
    a.name === "global" ? -1 : b.name === "global" ? 1 : a.name.localeCompare(b.name),
  );

const allSkills = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
  .map((d) => {
    let description = "";
    try {
      description = skillDescription(
        readFileSync(join(SKILLS_DIR, d.name, "SKILL.md"), "utf8"),
      );
    } catch {}
    return { name: d.name, description };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/** Demote every Markdown heading one level so rule bodies nest under our H1. */
const demote = (md) => md.replace(/^(#{1,5}) /gm, "#$1 ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rel = (f) => {
  const r = relative(process.cwd(), f);
  return !r || r.startsWith("..") ? f : r;
};
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const BEGIN = `<!-- BEGIN ${NAME} (managed — edits inside are overwritten on reinstall) -->`;
const END = `<!-- END ${NAME} -->`;

/** Render selected rules into a single Markdown block for CLAUDE.md / AGENTS.md. */
function renderRulesBlock(rules) {
  const parts = [
    `# Opinionated Rules`,
    "",
    `Installed from \`${REPO}\` via \`npx ${CMD}\`. Re-run \`npx ${CMD}@latest\` to update.`,
    "",
  ];
  for (const r of rules) {
    if (!r.always && r.globs) {
      parts.push(`> Scope: apply only to files matching \`${r.globs}\`.`, "");
    }
    parts.push(demote(r.body), "");
  }
  return parts.join("\n").trim();
}

/**
 * Render one rule as a VS Code Copilot instructions file
 * (User/prompts/*.instructions.md). `applyTo` carries the rule's globs, or
 * `**` for always-apply rules.
 */
function renderRuleInstructionsMd(r) {
  return [
    "---",
    `applyTo: "${!r.always && r.globs ? r.globs : "**"}"`,
    `description: ${r.description}`,
    "---",
    "",
    `<!-- ${NAME}: ${r.name} — re-run \`npx ${CMD}@latest\` to update -->`,
    "",
    r.body,
    "",
  ].join("\n");
}

/**
 * Resolve the VS Code user-config dir for Copilot user-level instructions.
 * Prefers an existing installation variant; falls back to stable VS Code.
 */
function vscodeUserDir() {
  const home = homedir();
  const base =
    process.platform === "win32"
      ? process.env.APPDATA ?? join(home, "AppData", "Roaming")
      : process.platform === "darwin"
        ? join(home, "Library", "Application Support")
        : process.env.XDG_CONFIG_HOME ?? join(home, ".config");
  for (const variant of ["Code", "Code - Insiders", "VSCodium"]) {
    if (existsSync(join(base, variant, "User"))) return join(base, variant, "User");
  }
  return join(base, "Code", "User");
}

/** Render one rule as a standalone plain-.md file (Cline / Kilo Code rule dirs). */
function renderRuleMd(r) {
  const parts = [
    `<!-- ${NAME}: ${r.name} — re-run \`npx ${CMD}@latest\` to update -->`,
  ];
  if (!r.always && r.globs) {
    parts.push("", `> Scope: apply only to files matching \`${r.globs}\`.`);
  }
  parts.push("", r.body, "");
  return parts.join("\n");
}

/** Insert or replace our managed block in a file, preserving all other content. */
function mergeManaged(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const block = `${BEGIN}\n${content}\n${END}`;
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  if (cur.includes(BEGIN) && cur.includes(END)) {
    const re = new RegExp(`${esc(BEGIN)}[\\s\\S]*?${esc(END)}`);
    writeFileSync(file, cur.replace(re, block));
  } else {
    writeFileSync(file, (cur.trim() ? cur.replace(/\s*$/, "") + "\n\n" : "") + block + "\n");
  }
}

/**
 * Resolve where a given agent's rules live for a scope.
 *
 * Returns one of:
 *   { kind: "mdc",    dir }   — verbatim .mdc files (Cursor rules dirs)
 *   { kind: "merge",  file }  — managed block merged into a standing-context file
 *   { kind: "md-dir", dir }   — one plain .md file per rule (Cline / Kilo Code)
 *   { kind: "instructions-dir", dir } — VS Code *.instructions.md (Copilot user profile)
 * Any target may carry `note` — a caveat surfaced to the user after install.
 */
function ruleTarget(agentId, scope, cwd) {
  const home = homedir();
  if (scope === "global") {
    switch (agentId) {
      case "claude-code":
        return { kind: "merge", file: join(home, ".claude", "CLAUDE.md") };
      case "codex":
        return { kind: "merge", file: join(home, ".codex", "AGENTS.md") };
      case "opencode":
        return { kind: "merge", file: join(home, ".config", "opencode", "AGENTS.md") };
      case "cline":
        // Per docs.cline.bot: global rules live in Documents/Cline/Rules
        // (~/Cline/Rules is the documented Linux fallback).
        return { kind: "md-dir", dir: join(home, "Documents", "Cline", "Rules") };
      case "cursor":
        // Cursor's reliable global store is the Settings UI (internal,
        // cloud-synced — not safely writable). ~/.cursor/rules is the
        // file-based location: applied when a workspace is open, but a
        // forum-tracked bug skips it in workspace-less agent sessions.
        return {
          kind: "mdc",
          dir: join(home, ".cursor", "rules"),
          note: "cursor: global rules written to ~/.cursor/rules — Cursor applies these when a project/workspace is open; workspace-less Agent sessions may skip them (known Cursor bug). For belt-and-braces, mirror them in Cursor Settings → Rules.",
        };
      case "copilot":
        // VS Code user-profile instructions: User/prompts/*.instructions.md
        // with applyTo frontmatter applies across all workspaces.
        return { kind: "instructions-dir", dir: join(vscodeUserDir(), "prompts") };
      case "kilocode":
        // ~/.kilocode/rules is Kilo's global rules dir — still auto-included
        // by v7 alongside the newer kilo.jsonc `instructions` mechanism.
        return { kind: "md-dir", dir: join(home, ".kilocode", "rules") };
      case "omp":
        // omp's user config home is ~/.omp/agent (models.yml lives there);
        // as a pi fork it loads the global AGENTS.md from its agent dir,
        // mirroring pi's ~/.pi/agent/AGENTS.md convention.
        return { kind: "merge", file: join(home, ".omp", "agent", "AGENTS.md") };
      default:
        return { unsupported: `Unknown agent: ${agentId}` };
    }
  }
  switch (agentId) {
    case "cursor":
      return { kind: "mdc", dir: join(cwd, ".cursor", "rules") };
    case "claude-code":
      return { kind: "merge", file: join(cwd, "CLAUDE.md") };
    case "codex":
    case "opencode":
    case "copilot":
    case "omp":
      return { kind: "merge", file: join(cwd, "AGENTS.md") };
    case "cline":
      return { kind: "md-dir", dir: join(cwd, ".clinerules") };
    case "kilocode":
      return { kind: "md-dir", dir: join(cwd, ".kilocode", "rules") };
    default:
      return { unsupported: `Unknown agent: ${agentId}` };
  }
}

/** One human line describing where an agent's rules will land (review preview). */
function describeTarget(agentId, scope, cwd) {
  const t = ruleTarget(agentId, scope, cwd);
  const pad = agentId.padEnd(12);
  if (t.unsupported) return `${pad} ✖ ${t.unsupported}`;
  if (t.kind === "mdc") return `${pad} → ${rel(t.dir)}${sep}<rule>.mdc`;
  if (t.kind === "md-dir") return `${pad} → ${rel(t.dir)}${sep}${NAME}-<rule>.md`;
  if (t.kind === "instructions-dir")
    return `${pad} → ${rel(t.dir)}${sep}${NAME}-<rule>.instructions.md`;
  return `${pad} → ${rel(t.file)} (managed block)`;
}

/**
 * Install selected rules for selected agents at the given scope. With
 * `dryRun`, nothing is written — `written` holds the would-be paths.
 * Returns { written, skipped, notes } lists for reporting; `notes` carries
 * per-target caveats (e.g. Cursor's workspace-less global-rules bug).
 */
function installRules(rules, agentIds, scope, { dryRun = false } = {}) {
  const cwd = process.cwd();
  const block = renderRulesBlock(rules);
  const written = [];
  const skipped = [];
  const notes = [];
  const mergedFiles = new Set();
  for (const a of agentIds) {
    const t = ruleTarget(a, scope, cwd);
    if (t.unsupported) {
      skipped.push(`${a}: ${t.unsupported}`);
      continue;
    }
    if (t.note) notes.push(t.note);
    if (t.kind === "mdc") {
      if (!dryRun) mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        const dest = join(t.dir, `${r.name}.mdc`);
        if (!dryRun) writeFileSync(dest, r.raw);
        written.push(rel(dest));
      }
    } else if (t.kind === "instructions-dir") {
      if (!dryRun) mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        const dest = join(t.dir, `${NAME}-${r.name}.instructions.md`);
        if (!dryRun) writeFileSync(dest, renderRuleInstructionsMd(r));
        written.push(rel(dest));
      }
    } else if (t.kind === "md-dir") {
      if (!dryRun) mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        // Prefixed filename so reinstalls update in place and never clobber the user's own rules.
        const dest = join(t.dir, `${NAME}-${r.name}.md`);
        if (!dryRun) writeFileSync(dest, renderRuleMd(r));
        written.push(rel(dest));
      }
    } else {
      if (mergedFiles.has(t.file)) continue; // agents sharing one AGENTS.md write once
      mergedFiles.add(t.file);
      if (!dryRun) mergeManaged(t.file, block);
      written.push(rel(t.file));
    }
  }
  return { written, skipped, notes };
}

// --- Global git-excludes guarantee for .mental/ ---------------------------
//
// The mental rule promises the installer keeps `.mental/` out of git via the
// MACHINE-WIDE excludes (never a repo .gitignore). If that promise isn't kept,
// a private second-brain can be `git add -A`'d and pushed — a data leak. These
// helpers make the guarantee real, idempotent, and cross-platform, and let
// `--doctor` verify it. `home` is injectable so tests run in a sandbox.

const MENTAL_IGNORE_LINE = ".mental/";
const MENTAL_IGNORE_COMMENT = "# balakit: private second-brain (mental skill) — never commit";

/** Run a git command, inheriting env (honors GIT_CONFIG_GLOBAL in tests). */
function runGit(...args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

/** True when git is on PATH and runnable. */
function gitAvailable() {
  const r = runGit("--version");
  return !r.error && r.status === 0;
}

/** Expand a leading `~` in a git-config path value to the home dir. */
function expandHome(p, home) {
  if (p === "~") return home;
  if (p.startsWith("~/") || p.startsWith("~\\")) return join(home, p.slice(2));
  return p;
}

/**
 * Git's default global excludes file when `core.excludesfile` is unset:
 * `$XDG_CONFIG_HOME/git/ignore`, else `<home>/.config/git/ignore`. Git reads
 * this path even with no config, which is why we prefer it over `~/.gitignore`.
 */
function defaultExcludesFile(home) {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() ? xdg : join(home, ".config");
  return join(base, "git", "ignore");
}

/**
 * Resolve the active global excludes file to an absolute path.
 * Honors an existing `core.excludesfile` (never overwrites the user's choice);
 * when unset and `create` is true, wires it to the XDG default and returns that.
 * Returns null if git is unavailable, or { file, created }.
 */
function resolveGlobalExcludesFile({ create = false, home = homedir() } = {}) {
  if (!gitAvailable()) return null;
  const configured = (runGit("config", "--global", "--get", "core.excludesfile").stdout || "").trim();
  if (configured) return { file: expandHome(configured, home), created: false };
  if (!create) return { file: null, created: false };
  const file = defaultExcludesFile(home);
  // Store as a forward-slash path so a Windows gitconfig doesn't treat
  // backslashes as escapes.
  runGit("config", "--global", "core.excludesfile", file.split("\\").join("/"));
  return { file, created: true };
}

/**
 * Idempotently guarantee `.mental/` is in the machine-wide git excludes.
 * Creates/wires the excludes file if needed; appends the pattern (with a
 * comment) only when absent; never rewrites or reorders existing lines.
 * Returns a result object for reporting and the doctor self-check.
 */
function ensureMentalExcluded({ home = homedir() } = {}) {
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
 * Returns { ok, file, hasLine, configured, liveIgnored } — `liveIgnored` is
 * git's own verdict via `check-ignore` when run inside a repo (null otherwise).
 */
function checkMentalExcluded({ home = homedir() } = {}) {
  if (!gitAvailable()) return { ok: false, reason: "git-unavailable" };
  const configured = (runGit("config", "--global", "--get", "core.excludesfile").stdout || "").trim();
  const file = configured ? expandHome(configured, home) : defaultExcludesFile(home);
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  const hasLine = cur.split(/\r?\n/).some((l) => l.trim() === MENTAL_IGNORE_LINE);
  // `git check-ignore` only means anything inside a repo; 128 = not a repo.
  const ci = runGit("check-ignore", "-q", ".mental/probe");
  const liveIgnored = ci.status === 128 ? null : ci.status === 0;
  return { ok: hasLine && liveIgnored !== false, file, hasLine, configured: !!configured, liveIgnored };
}

/** Expand rule names to the skills they bundle (RULE_BUNDLED_SKILLS). */
function bundledSkillsFor(ruleNames) {
  return [...new Set(ruleNames.flatMap((r) => RULE_BUNDLED_SKILLS[r] ?? []))];
}

/** Build the equivalent `npx skills add` command for the chosen selection. */
function skillsCommand(skillNames, agentIds, scope) {
  const ids = agentIds
    .map((a) => AGENTS.find((x) => x.id === a)?.skillsShId)
    .filter(Boolean);
  return [
    "npx -y skills add",
    REPO,
    ...skillNames.map((s) => `-s ${s}`),
    ...ids.map((a) => `-a ${a}`),
    scope === "global" ? "-g" : "",
    "-y",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * `--doctor`: verify the `.mental/` global git-exclude, repairing it if missing.
 * Prints a PASS/FAIL report; returns a process exit code (0 = secured).
 */
function runDoctor() {
  if (!gitAvailable()) {
    console.error("✖ git is not on PATH — cannot verify or set the .mental/ global exclude.");
    return 1;
  }
  // Idempotent converge: sets core.excludesfile when unset and adds the pattern
  // when absent; a no-op when already correct.
  ensureMentalExcluded();
  const check = checkMentalExcluded();
  const mark = (b) => (b ? "✓" : "✖");
  console.log(`${mark(check.configured)} core.excludesfile ${check.configured ? "is set" : "is UNSET (using git's XDG default path)"}`);
  console.log(`${mark(check.hasLine)} ${check.file} ${check.hasLine ? "contains" : "is MISSING"} a \`.mental/\` line`);
  if (check.liveIgnored === true) console.log("✓ git check-ignore confirms .mental/ is ignored in this repo");
  else if (check.liveIgnored === false) console.log("✖ git check-ignore says .mental/ is NOT ignored here");
  else console.log("· run inside a git repo to live-verify with check-ignore");
  const ok = check.hasLine && check.liveIgnored !== false;
  console.log(ok ? "\n✓ .mental/ is protected from git." : "\n✖ .mental/ is NOT protected — see above.");
  return ok ? 0 : 1;
}

const USAGE = `${CMD} v${pkg.version} — opinionated rules & skills installer

Usage: npx ${CMD} [options]

Runs interactively when no selection flags are given.

Options:
  --rules <names|all>       Rules to install (comma-separated: ${allRules.map((r) => r.name).join(", ")})
  --skills <names|all>      Skills to install (comma-separated; see --list)
  --agents <ids|all>        Agents: ${AGENT_IDS.join(", ")}
  --scope <project|global>  Install scope for rules AND skills (default: project).
                            Global writes user-level files for every agent
                            (e.g. ~/.claude/CLAUDE.md, ~/.cursor/rules,
                            VS Code User/prompts) — no manual steps.
  --skills-scope <project|global>  Override the skill scope separately
  --dry-run                 Show what would be written without writing anything
  -y, --yes                 Skip the confirmation prompt
  --doctor                  Check (and repair) the .mental/ global git-exclude, then exit
  --list                    List available rules, skills, and agents
  -v, --version             Print version
  -h, --help                Show this help

Paired rules install their skill automatically (e.g. the mental rule always
brings the mental skill — the pointer is useless without the procedure).

Personal-layer rules (${PERSONAL_RULES.join(", ")}) default to GLOBAL scope —
with -y and no --scope they install globally when they're the whole selection,
and a project-scope install warns: it writes into committed repo files.

Update: re-run \`npx ${CMD}@latest\` with the same selections — managed blocks
and installed rule files are replaced in place, never duplicated.`;

/** Parse process.argv into flag values; exits early for --help/--version/--list. */
function parseArgs(argv) {
  const args = { yes: false, dryRun: false };
  const csv = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (a === "-v" || a === "--version") {
      console.log(pkg.version);
      process.exit(0);
    } else if (a === "--list") {
      console.log(`Rules:\n${allRules.map((r) => `  ${r.name} — ${r.description}`).join("\n")}`);
      console.log(`\nSkills:\n${allSkills.map((s) => `  ${s.name} — ${trunc(s.description, 100)}`).join("\n")}`);
      console.log(`\nAgents:\n${AGENTS.map((a) => `  ${a.id} — ${a.label}`).join("\n")}`);
      process.exit(0);
    } else if (a === "--doctor") {
      process.exit(runDoctor());
    } else if (a === "--rules") args.rules = next();
    else if (a === "--skills") args.skills = next();
    else if (a === "--agents") args.agents = next();
    else if (a === "--scope") args.scope = next();
    else if (a === "--skills-scope") args.skillsScope = next();
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-y" || a === "--yes") args.yes = true;
    else {
      console.error(`Unknown option: ${a}\n`);
      console.log(USAGE);
      process.exit(1);
    }
  }
  if (args.rules) args.rules = args.rules === "all" ? allRules.map((r) => r.name) : csv(args.rules);
  if (args.skills) args.skills = args.skills === "all" ? allSkills.map((s) => s.name) : csv(args.skills);
  if (args.agents) args.agents = args.agents === "all" ? [...AGENT_IDS] : csv(args.agents);
  for (const s of [args.scope, args.skillsScope]) {
    if (s && s !== "project" && s !== "global") {
      console.error(`Invalid scope: ${s} (use project or global)`);
      process.exit(1);
    }
  }
  const badRule = (args.rules ?? []).find((r) => !allRules.some((x) => x.name === r));
  const badSkill = (args.skills ?? []).find((s) => !allSkills.some((x) => x.name === s));
  const badAgent = (args.agents ?? []).find((a) => !AGENT_IDS.includes(a));
  if (badRule || badSkill || badAgent) {
    console.error(`Unknown ${badRule ? `rule: ${badRule}` : badSkill ? `skill: ${badSkill}` : `agent: ${badAgent}`} — see --list`);
    process.exit(1);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  p.intro(`${CMD} v${pkg.version} — rules & skills for your coding agents${args.dryRun ? "  [dry-run]" : ""}`);

  let ruleNames;
  let skillNames;

  if (args.rules || args.skills) {
    ruleNames = args.rules ?? [];
    skillNames = args.skills ?? [];
  } else {
    const picked = await p.groupMultiselect({
      message: "Pick what to install (space to select, enter to confirm)",
      options: {
        Rules: allRules.map((r) => ({
          value: `rule:${r.name}`,
          label: r.name,
          hint: trunc(r.description, 64),
        })),
        Skills: allSkills.map((s) => ({
          value: `skill:${s.name}`,
          label: s.name,
          hint: SKILL_BUNDLED_BY[s.name]
            ? `auto-installs with the ${SKILL_BUNDLED_BY[s.name].join("/")} rule — no need to select it here`
            : trunc(s.description, 64),
        })),
      },
      required: true,
    });
    if (p.isCancel(picked)) return p.cancel("Cancelled.");
    ruleNames = picked.filter((v) => v.startsWith("rule:")).map((v) => v.slice(5));
    skillNames = picked.filter((v) => v.startsWith("skill:")).map((v) => v.slice(6));
  }

  // Paired rules bring their skill — always. Announce the auto-add right away
  // so the unchecked box in the picker never reads as "skill not included".
  const bundled = bundledSkillsFor(ruleNames).filter((s) => !skillNames.includes(s));
  skillNames = [...skillNames, ...bundled];
  const selectedRules = allRules.filter((r) => ruleNames.includes(r.name));
  if (bundled.length) {
    p.log.info(
      bundled
        .map((s) => `${s} skill added automatically (bundled with the ${SKILL_BUNDLED_BY[s].join("/")} rule)`)
        .join("\n"),
    );
  }

  if (!selectedRules.length && !skillNames.length) {
    return p.cancel("Nothing selected.");
  }

  let agents = args.agents;
  if (!agents) {
    const picked = await p.multiselect({
      message: "Which agent(s)?",
      options: AGENTS.map((a) => ({ value: a.id, label: a.label })),
      required: true,
    });
    if (p.isCancel(picked)) return p.cancel("Cancelled.");
    agents = picked;
  }

  const personal = selectedRules
    .filter((r) => PERSONAL_RULES.includes(r.name))
    .map((r) => r.name);
  // Steer to global only when the whole selection is personal — a mixed pick
  // must not silently route team rules into the user's config.
  const allPersonal = personal.length > 0 && personal.length === selectedRules.length;

  let scope = args.scope ?? (args.yes && allPersonal ? "global" : "project");
  if (!args.scope && !args.yes) {
    const picked = await p.select({
      message: "Install where?",
      initialValue: allPersonal ? "global" : "project",
      options: [
        {
          value: "project",
          label: "This project",
          hint: personal.length
            ? `writes ${personal.join(", ")} into committed files (CLAUDE.md/AGENTS.md) — teammates will see it`
            : process.cwd(),
        },
        {
          value: "global",
          label: "Global (user-level)",
          hint: personal.length
            ? `recommended for ${personal.join(", ")} — personal layer, every repo, zero repo impact`
            : "every repo on this machine — rules to user config, skills via skills.sh -g",
        },
      ],
    });
    if (p.isCancel(picked)) return p.cancel("Cancelled.");
    scope = picked;
  }
  const skillsScope = args.skillsScope ?? scope;

  if (scope === "project" && personal.length) {
    p.log.warn(
      `${personal.join(", ")}: personal-layer rule${personal.length > 1 ? "s" : ""} at PROJECT scope — this writes into committed files (CLAUDE.md / AGENTS.md / rule dirs) that everyone in the repo sees. Only the .mental/ data folder is gitignored, never the rule wiring. Most setups want --scope global.`,
    );
  }

  const reviewLines = [];
  if (selectedRules.length) {
    reviewLines.push(`Rules   (${scope}): ${selectedRules.map((r) => r.name).join(", ")}`);
  }
  if (skillNames.length) {
    const label = (s) => (bundled.includes(s) ? `${s} (bundled with the ${s} rule)` : s);
    reviewLines.push(`Skills  (${skillsScope}): ${skillNames.map(label).join(", ")}`);
  }
  reviewLines.push(`Agents: ${agents.join(", ")}`);
  if (selectedRules.length) {
    reviewLines.push("", "Rule destinations:");
    for (const a of agents) reviewLines.push(`  ${describeTarget(a, scope, process.cwd())}`);
  }
  p.note(reviewLines.join("\n"), args.dryRun ? "Review (dry-run — nothing will be written)" : "Review");

  if (!args.yes && !args.dryRun) {
    const go = await p.confirm({ message: "Install now?" });
    if (p.isCancel(go) || !go) return p.cancel("Cancelled.");
  }

  if (selectedRules.length) {
    const s = p.spinner();
    s.start(args.dryRun ? "Resolving rule targets" : "Installing rules");
    const { written, skipped, notes } = installRules(selectedRules, agents, scope, {
      dryRun: args.dryRun,
    });
    s.stop(
      args.dryRun
        ? `Would write ${written.length} file${written.length === 1 ? "" : "s"}`
        : `Rules installed (${written.length} file${written.length === 1 ? "" : "s"})`,
    );
    if (written.length) p.note(written.join("\n"), args.dryRun ? "Would write" : "Wrote");
    if (notes.length) p.note(notes.join("\n\n"), "Heads-up");
    if (skipped.length) p.note(skipped.join("\n"), "Skipped");
    if (selectedRules.some((r) => r.name === "mental")) {
      if (args.dryRun) {
        p.log.step("Would ensure .mental/ is in the global git excludes (core.excludesfile).");
      } else {
        const r = ensureMentalExcluded();
        if (!r.ok) {
          p.log.warn(
            "git not found — .mental/ is NOT yet git-ignored. Once git is installed, run `npx balakit --doctor` to secure it.",
          );
        } else {
          const verify = checkMentalExcluded();
          const live = verify.liveIgnored === true ? " (verified: git ignores .mental/ here)" : "";
          p.log.step(
            `${r.appended ? "Secured" : "Confirmed"} .mental/ in your global git excludes → ${r.file}${r.created ? " (core.excludesfile wired)" : ""}${live}`,
          );
        }
      }
    }
  }

  if (skillNames.length) {
    const noSkills = agents.filter((a) => !AGENTS.find((x) => x.id === a)?.skillsShId);
    if (noSkills.length) {
      p.log.warn(`skills.sh has no confirmed support for: ${noSkills.join(", ")} — skipped for skills.`);
    }
    const cmd = skillsCommand(skillNames, agents, skillsScope);
    if (args.dryRun) {
      p.log.step(`Would install skills via skills.sh:\n${cmd}`);
    } else {
      p.log.step(`Installing skills via skills.sh:\n${cmd}`);
      const result = spawnSync(cmd, { stdio: "inherit", shell: true });
      if (result.status !== 0) {
        p.log.warn("skills.sh did not complete. Run this manually when ready:");
        p.log.message(cmd);
      }
    }
  }

  p.outro(
    args.dryRun
      ? `Dry-run complete — nothing written. Drop --dry-run to install.`
      : `Done. Update anytime: npx ${CMD}@latest`,
  );
}

export {
  renderRulesBlock,
  renderRuleMd,
  renderRuleInstructionsMd,
  vscodeUserDir,
  mergeManaged,
  ruleTarget,
  describeTarget,
  installRules,
  ensureMentalExcluded,
  checkMentalExcluded,
  resolveGlobalExcludesFile,
  defaultExcludesFile,
  expandHome,
  runDoctor,
  bundledSkillsFor,
  skillsCommand,
  skillDescription,
  parseArgs,
  RULE_BUNDLED_SKILLS,
  PERSONAL_RULES,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
