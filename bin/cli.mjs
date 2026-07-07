#!/usr/bin/env node
/**
 * Interactive installer for this repository's opinionated rules and skills.
 *
 * Identity (package name + GitHub slug) is read from package.json at runtime,
 * so renaming/moving the repo needs no change here.
 *
 * Rules are installed natively, because skills.sh installs skills only and never
 * writes rule files. Rules can be installed per-project or globally (user-level);
 * each agent's destination differs per scope — see ruleTarget. Agents whose
 * global rules live behind a UI or a config file we won't rewrite (Cursor,
 * Copilot, Kilo Code) degrade gracefully: the installer prints exact manual
 * instructions instead of erroring.
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
 *   { kind: "mdc",    dir }   — verbatim .mdc files (Cursor project rules)
 *   { kind: "merge",  file }  — managed block merged into a standing-context file
 *   { kind: "md-dir", dir }   — one plain .md file per rule (Cline / Kilo Code)
 *   { kind: "manual", why }   — not scriptable; `why` is printed as instructions
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
        return {
          kind: "manual",
          why: "Cursor user-level rules live in a UI, not a file: Cursor Settings → Rules → User Rules. Paste the rule content there (rule sources: " + RULES_DIR + ").",
        };
      case "copilot":
        return {
          kind: "manual",
          why: "Copilot has no global instructions file. Use per-project installs (AGENTS.md), or VS Code profile-level instructions.",
        };
      case "kilocode":
        return {
          kind: "manual",
          why: "Kilo Code global rules live in ~/.config/kilo/kilo.jsonc — add the rule file(s) to its `instructions` array manually (rule sources: " + RULES_DIR + ").",
        };
      case "omp":
        return {
          kind: "manual",
          why: "omp's global rules location is unverified. Use per-project installs (AGENTS.md) until confirmed.",
        };
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
  if (t.kind === "manual") return `${pad} ⚠ manual steps (printed after install)`;
  if (t.kind === "mdc") return `${pad} → ${rel(t.dir)}${sep}<rule>.mdc`;
  if (t.kind === "md-dir") return `${pad} → ${rel(t.dir)}${sep}${NAME}-<rule>.md`;
  return `${pad} → ${rel(t.file)} (managed block)`;
}

/**
 * Install selected rules for selected agents at the given scope. With
 * `dryRun`, nothing is written — `written` holds the would-be paths.
 * Returns { written, skipped, manual } path/instruction lists for reporting.
 */
function installRules(rules, agentIds, scope, { dryRun = false } = {}) {
  const cwd = process.cwd();
  const block = renderRulesBlock(rules);
  const written = [];
  const skipped = [];
  const manual = [];
  const mergedFiles = new Set();
  for (const a of agentIds) {
    const t = ruleTarget(a, scope, cwd);
    if (t.unsupported) {
      skipped.push(`${a}: ${t.unsupported}`);
      continue;
    }
    if (t.kind === "manual") {
      manual.push(`${a}: ${t.why}`);
      continue;
    }
    if (t.kind === "mdc") {
      if (!dryRun) mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        const dest = join(t.dir, `${r.name}.mdc`);
        if (!dryRun) writeFileSync(dest, r.raw);
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
  return { written, skipped, manual };
}

/**
 * Ensure `.mental/` is ignored machine-wide via git's global excludes file.
 * Wires `core.excludesFile` to ~/.gitignore when unset; appends the pattern
 * idempotently; never clobbers existing content. Returns a report line or null
 * when git is unavailable.
 */
function ensureMentalExcluded() {
  const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
  const probe = git("--version");
  if (probe.error || probe.status !== 0) return null;
  let file = (git("config", "--global", "core.excludesFile").stdout || "").trim();
  if (!file) {
    file = join(homedir(), ".gitignore");
    git("config", "--global", "core.excludesFile", file);
  } else if (file === "~" || file.startsWith("~/") || file.startsWith("~\\")) {
    file = join(homedir(), file.slice(2));
  }
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  if (cur.split(/\r?\n/).some((l) => l.trim() === ".mental/")) {
    return `.mental/ already ignored via ${file}`;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, (cur && !cur.endsWith("\n") ? cur + "\n" : cur) + ".mental/\n");
  return `added .mental/ to global git excludes (${file})`;
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

const USAGE = `${CMD} v${pkg.version} — opinionated rules & skills installer

Usage: npx ${CMD} [options]

Runs interactively when no selection flags are given.

Options:
  --rules <names|all>       Rules to install (comma-separated: ${allRules.map((r) => r.name).join(", ")})
  --skills <names|all>      Skills to install (comma-separated; see --list)
  --agents <ids|all>        Agents: ${AGENT_IDS.join(", ")}
  --scope <project|global>  Install scope for rules AND skills (default: project).
                            Global writes user-level files (e.g. ~/.claude/CLAUDE.md);
                            agents without a scriptable global home print manual steps.
  --skills-scope <project|global>  Override the skill scope separately
  --dry-run                 Show what would be written without writing anything
  -y, --yes                 Skip the confirmation prompt
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
    const { written, skipped, manual } = installRules(selectedRules, agents, scope, {
      dryRun: args.dryRun,
    });
    s.stop(
      args.dryRun
        ? `Would write ${written.length} file${written.length === 1 ? "" : "s"}`
        : `Rules installed (${written.length} file${written.length === 1 ? "" : "s"})`,
    );
    if (written.length) p.note(written.join("\n"), args.dryRun ? "Would write" : "Wrote");
    if (manual.length) p.note(manual.join("\n\n"), "Manual steps (not scriptable)");
    if (skipped.length) p.note(skipped.join("\n"), "Skipped");
    if (selectedRules.some((r) => r.name === "mental")) {
      if (args.dryRun) {
        p.log.step("Would ensure .mental/ is in the global git excludes (core.excludesFile).");
      } else {
        const report = ensureMentalExcluded();
        p.log.step(report ?? "git not found — add `.mental/` to your global git excludes manually.");
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
  mergeManaged,
  ruleTarget,
  describeTarget,
  installRules,
  ensureMentalExcluded,
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
