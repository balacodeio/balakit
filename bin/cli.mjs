#!/usr/bin/env node
/**
 * Interactive installer for this repository's opinionated rules and skills.
 *
 * Identity (package name + GitHub slug) is read from package.json at runtime,
 * so renaming/moving the repo needs no change here.
 *
 * Rules are installed natively, because skills.sh installs skills only and never
 * writes rule files. Rules can be installed per-project or globally (user-level);
 * each agent's destination differs per scope — see AGENTS below. Agents whose
 * global rules live behind a UI or a config file we won't rewrite (Cursor,
 * Copilot, Kilo Code) degrade gracefully: the installer prints exact manual
 * instructions instead of erroring.
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
import { join, dirname, basename, relative } from "node:path";
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
 * Supported agents. `skillsShId` is the id skills.sh expects (null = skills.sh
 * has no confirmed support; the agent is excluded from skill installs with a note).
 */
const AGENTS = [
  { id: "cursor", label: "Cursor", skillsShId: "cursor" },
  { id: "claude-code", label: "Claude Code", skillsShId: "claude-code" },
  { id: "codex", label: "Codex", skillsShId: "codex" },
  { id: "opencode", label: "OpenCode", skillsShId: "opencode" },
  { id: "copilot", label: "GitHub Copilot", skillsShId: "github-copilot" },
  { id: "cline", label: "Cline", skillsShId: "cline" },
  { id: "kilocode", label: "Kilo Code", skillsShId: "kilo" },
  { id: "omp", label: "omp (oh-my-pi)", skillsShId: null },
];
const AGENT_IDS = AGENTS.map((a) => a.id);

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
      const s = readFileSync(join(SKILLS_DIR, d.name, "SKILL.md"), "utf8");
      const m = s.match(/^description:\s*(.*)$/m);
      description = m ? m[1].trim() : "";
      if (/^[>|][-+]?$/.test(description)) {
        // YAML block scalar (>- etc.) — the text is on the following indented lines.
        const collected = [];
        for (const line of s.slice(m.index + m[0].length).split(/\r?\n/).slice(1)) {
          if (/^\s+\S/.test(line)) collected.push(line.trim());
          else if (line.trim() === "") continue;
          else break;
        }
        description = collected.join(" ");
      } else {
        description = description.replace(/^["']|["']$/g, "");
      }
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
        return { kind: "md-dir", dir: join(home, ".cline", "rules") };
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

/**
 * Install selected rules for selected agents at the given scope.
 * Returns { written, skipped, manual } path/instruction lists for reporting.
 */
function installRules(rules, agentIds, scope) {
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
      mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        const dest = join(t.dir, `${r.name}.mdc`);
        writeFileSync(dest, r.raw);
        written.push(rel(dest));
      }
    } else if (t.kind === "md-dir") {
      mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        // Prefixed filename so reinstalls update in place and never clobber the user's own rules.
        const dest = join(t.dir, `${NAME}-${r.name}.md`);
        writeFileSync(dest, renderRuleMd(r));
        written.push(rel(dest));
      }
    } else {
      if (mergedFiles.has(t.file)) continue; // agents sharing one AGENTS.md write once
      mergedFiles.add(t.file);
      mergeManaged(t.file, block);
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
  --scope <project|global>  Rule install scope (default: project).
                            Global writes user-level files (e.g. ~/.claude/CLAUDE.md);
                            agents without a scriptable global home print manual steps.
  --skills-scope <project|global>  Skill install scope (default: follows --scope)
  -y, --yes                 Skip the confirmation prompt
  --list                    List available rules, skills, and agents
  -v, --version             Print version
  -h, --help                Show this help

Update: re-run \`npx ${CMD}@latest\` with the same selections — managed blocks
and installed rule files are replaced in place, never duplicated.`;

/** Parse process.argv into flag values; exits early for --help/--version/--list. */
function parseArgs(argv) {
  const args = { yes: false };
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
      console.log(`\nSkills:\n${allSkills.map((s) => `  ${s.name} — ${s.description.slice(0, 80)}`).join("\n")}`);
      console.log(`\nAgents:\n${AGENTS.map((a) => `  ${a.id} — ${a.label}`).join("\n")}`);
      process.exit(0);
    } else if (a === "--rules") args.rules = next();
    else if (a === "--skills") args.skills = next();
    else if (a === "--agents") args.agents = next();
    else if (a === "--scope") args.scope = next();
    else if (a === "--skills-scope") args.skillsScope = next();
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
  p.intro(`${CMD} v${pkg.version} — opinionated rules & skills installer`);

  let selectedRules;
  let selectedSkills;

  if (args.rules || args.skills) {
    selectedRules = allRules.filter((r) => (args.rules ?? []).includes(r.name));
    selectedSkills = args.skills ?? [];
  } else {
    const kinds = await p.multiselect({
      message: "What do you want to install?",
      options: [
        { value: "rules", label: "Rules", hint: "coding & communication standards" },
        { value: "skills", label: "Skills", hint: "reusable agent capabilities (via skills.sh)" },
      ],
      required: true,
    });
    if (p.isCancel(kinds)) return p.cancel("Cancelled.");

    selectedRules = [];
    if (kinds.includes("rules")) {
      const picked = await p.multiselect({
        message: "Which rules?",
        options: allRules.map((r) => ({ value: r.name, label: r.name, hint: r.description })),
        required: true,
      });
      if (p.isCancel(picked)) return p.cancel("Cancelled.");
      selectedRules = allRules.filter((r) => picked.includes(r.name));
    }

    selectedSkills = [];
    if (kinds.includes("skills")) {
      const picked = await p.multiselect({
        message: "Which skills?",
        options: allSkills.map((s) => ({
          value: s.name,
          label: s.name,
          hint: s.description ? s.description.slice(0, 64) : undefined,
        })),
        required: true,
      });
      if (p.isCancel(picked)) return p.cancel("Cancelled.");
      selectedSkills = picked;
    }
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

  let rulesScope = args.scope ?? "project";
  if (selectedRules.length && !args.scope && !args.yes) {
    const picked = await p.select({
      message: "Install rules where?",
      initialValue: "project",
      options: [
        { value: "project", label: "This project", hint: process.cwd() },
        {
          value: "global",
          label: "Global (user-level)",
          hint: "applies to every repo — e.g. ~/.claude/CLAUDE.md",
        },
      ],
    });
    if (p.isCancel(picked)) return p.cancel("Cancelled.");
    rulesScope = picked;
  }

  let skillsScope = args.skillsScope ?? args.scope ?? "project";
  if (selectedSkills.length && !args.skillsScope && !args.scope && !args.yes) {
    const picked = await p.select({
      message: "Install skills where?",
      initialValue: "project",
      options: [
        { value: "project", label: "This project", hint: process.cwd() },
        { value: "global", label: "Global (user-level)", hint: "via skills.sh" },
      ],
    });
    if (p.isCancel(picked)) return p.cancel("Cancelled.");
    skillsScope = picked;
  }

  p.note(
    [
      selectedRules.length
        ? `Rules:  ${selectedRules.map((r) => r.name).join(", ")} (${rulesScope})`
        : null,
      selectedSkills.length ? `Skills: ${selectedSkills.join(", ")} (${skillsScope})` : null,
      `Agents: ${agents.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Review",
  );
  if (!args.yes) {
    const go = await p.confirm({ message: "Install now?" });
    if (p.isCancel(go) || !go) return p.cancel("Cancelled.");
  }

  if (selectedRules.length) {
    const s = p.spinner();
    s.start("Installing rules");
    const { written, skipped, manual } = installRules(selectedRules, agents, rulesScope);
    s.stop(`Rules installed (${written.length} file${written.length === 1 ? "" : "s"})`);
    if (written.length) p.note(written.join("\n"), "Wrote");
    if (manual.length) p.note(manual.join("\n\n"), "Manual steps (not scriptable)");
    if (skipped.length) p.note(skipped.join("\n"), "Skipped");
    if (selectedRules.some((r) => r.name === "mental")) {
      const report = ensureMentalExcluded();
      p.log.step(report ?? "git not found — add `.mental/` to your global git excludes manually.");
    }
  }

  if (selectedSkills.length) {
    const noSkills = agents.filter((a) => !AGENTS.find((x) => x.id === a)?.skillsShId);
    if (noSkills.length) {
      p.log.warn(`skills.sh has no confirmed support for: ${noSkills.join(", ")} — skipped for skills.`);
    }
    const cmd = skillsCommand(selectedSkills, agents, skillsScope);
    p.log.step(`Installing skills via skills.sh:\n${cmd}`);
    const result = spawnSync(cmd, { stdio: "inherit", shell: true });
    if (result.status !== 0) {
      p.log.warn("skills.sh did not complete. Run this manually when ready:");
      p.log.message(cmd);
    }
  }

  p.outro(`Done. Update anytime: npx ${CMD}@latest`);
}

export {
  renderRulesBlock,
  renderRuleMd,
  mergeManaged,
  ruleTarget,
  installRules,
  ensureMentalExcluded,
  skillsCommand,
  parseArgs,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
