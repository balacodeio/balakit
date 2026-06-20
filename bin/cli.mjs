#!/usr/bin/env node
/**
 * Interactive installer for this repository's opinionated rules and skills.
 *
 * Identity (package name + GitHub slug) is read from package.json at runtime,
 * so renaming/moving the repo needs no change here.
 *
 * Rules are installed natively, because skills.sh installs skills only and never
 * writes rule files:
 *   - Cursor                  -> .cursor/rules/<name>.mdc  (verbatim; native globs/alwaysApply)
 *   - Claude Code             -> CLAUDE.md                 (managed block, merged)
 *   - Codex / OpenCode / Copilot -> AGENTS.md              (managed block, merged)
 *
 * Skills are delegated to skills.sh (`npx skills add`) so its maintained
 * per-agent path map and global locations are reused rather than reimplemented.
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
      const m = s.match(/^description:\s*(.+)$/m);
      description = m ? m[1].replace(/^["']|["']$/g, "").trim() : "";
    } catch {}
    return { name: d.name, description };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/** Demote every Markdown heading one level so rule bodies nest under our H1. */
const demote = (md) => md.replace(/^(#{1,5}) /gm, "#$1 ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const expand = (pp) => (pp.startsWith("~") ? join(homedir(), pp.slice(1)) : pp);
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
    `Installed from \`${REPO}\` via \`npx ${CMD}\`. Re-run to update.`,
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

/** Resolve where a given agent's rules live for the chosen scope. */
function ruleTarget(agentId, scope, cwd) {
  const global = scope === "global";
  switch (agentId) {
    case "cursor":
      return global
        ? { unsupported: "Cursor global rules live in Settings → Rules (not files) — install per-project." }
        : { kind: "mdc", dir: join(cwd, ".cursor", "rules") };
    case "claude-code":
      return { kind: "merge", file: global ? expand("~/.claude/CLAUDE.md") : join(cwd, "CLAUDE.md") };
    case "codex":
      return { kind: "merge", file: global ? expand("~/.codex/AGENTS.md") : join(cwd, "AGENTS.md") };
    case "opencode":
      return { kind: "merge", file: global ? expand("~/.config/opencode/AGENTS.md") : join(cwd, "AGENTS.md") };
    case "copilot":
      return global
        ? { unsupported: "Copilot has no global rules file — install per-project (AGENTS.md)." }
        : { kind: "merge", file: join(cwd, "AGENTS.md") };
    default:
      return { unsupported: `Unknown agent: ${agentId}` };
  }
}

/** Install selected rules for selected agents; returns what was written/skipped. */
function installRules(rules, agentIds, scope) {
  const cwd = process.cwd();
  const block = renderRulesBlock(rules);
  const written = [];
  const skipped = [];
  const mergedFiles = new Set();
  for (const a of agentIds) {
    const t = ruleTarget(a, scope, cwd);
    if (t.unsupported) {
      skipped.push(`${a}: ${t.unsupported}`);
      continue;
    }
    if (t.kind === "mdc") {
      mkdirSync(t.dir, { recursive: true });
      for (const r of rules) {
        const dest = join(t.dir, `${r.name}.mdc`);
        writeFileSync(dest, r.raw);
        written.push(rel(dest));
      }
    } else {
      if (mergedFiles.has(t.file)) continue; // codex/opencode/copilot share one AGENTS.md
      mergedFiles.add(t.file);
      mergeManaged(t.file, block);
      written.push(rel(t.file));
    }
  }
  return { written, skipped };
}

/** Our agent ids → skills.sh agent ids (differ only where skills.sh disagrees). */
const SKILLS_SH_AGENT = { copilot: "github-copilot" };

/** Build the equivalent `npx skills add` command for the chosen selection. */
function skillsCommand(skillNames, agentIds, scope) {
  return [
    "npx -y skills add",
    REPO,
    ...skillNames.map((s) => `-s ${s}`),
    ...agentIds.map((a) => `-a ${SKILLS_SH_AGENT[a] ?? a}`),
    scope === "global" ? "-g" : "",
    "-y",
  ]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  p.intro(`${CMD} — opinionated rules & skills installer`);

  const kinds = await p.multiselect({
    message: "What do you want to install?",
    options: [
      { value: "rules", label: "Rules", hint: "coding & communication standards" },
      { value: "skills", label: "Skills", hint: "reusable agent capabilities (via skills.sh)" },
    ],
    required: true,
  });
  if (p.isCancel(kinds)) return p.cancel("Cancelled.");

  let selectedRules = [];
  if (kinds.includes("rules")) {
    const picked = await p.multiselect({
      message: "Which rules?",
      options: allRules.map((r) => ({ value: r.name, label: r.name, hint: r.description })),
      required: true,
    });
    if (p.isCancel(picked)) return p.cancel("Cancelled.");
    selectedRules = allRules.filter((r) => picked.includes(r.name));
  }

  let selectedSkills = [];
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

  const agents = await p.multiselect({
    message: "Which agent(s)?",
    options: [
      { value: "cursor", label: "Cursor" },
      { value: "claude-code", label: "Claude Code" },
      { value: "codex", label: "Codex" },
      { value: "opencode", label: "OpenCode" },
      { value: "copilot", label: "GitHub Copilot" },
    ],
    required: true,
  });
  if (p.isCancel(agents)) return p.cancel("Cancelled.");

  const scope = await p.select({
    message: "Install where?",
    initialValue: "project",
    options: [
      { value: "project", label: "This project", hint: process.cwd() },
      { value: "global", label: "Global (user-level)", hint: "Claude Code / Codex / OpenCode; Cursor & Copilot are project-only" },
    ],
  });
  if (p.isCancel(scope)) return p.cancel("Cancelled.");

  p.note(
    [
      selectedRules.length ? `Rules:  ${selectedRules.map((r) => r.name).join(", ")}` : null,
      selectedSkills.length ? `Skills: ${selectedSkills.join(", ")}` : null,
      `Agents: ${agents.join(", ")}`,
      `Scope:  ${scope}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Review",
  );
  const go = await p.confirm({ message: "Install now?" });
  if (p.isCancel(go) || !go) return p.cancel("Cancelled.");

  if (selectedRules.length) {
    const s = p.spinner();
    s.start("Installing rules");
    const { written, skipped } = installRules(selectedRules, agents, scope);
    s.stop(`Rules installed (${written.length} file${written.length === 1 ? "" : "s"})`);
    if (written.length) p.note(written.join("\n"), "Wrote");
    if (skipped.length) p.note(skipped.join("\n"), "Skipped");
  }

  if (selectedSkills.length) {
    const cmd = skillsCommand(selectedSkills, agents, scope);
    p.log.step(`Installing skills via skills.sh:\n${cmd}`);
    const result = spawnSync(cmd, { stdio: "inherit", shell: true });
    if (result.status !== 0) {
      p.log.warn("skills.sh did not complete. Run this manually when ready:");
      p.log.message(cmd);
    }
  }

  p.outro("Done.");
}

export { renderRulesBlock, mergeManaged, ruleTarget, installRules, skillsCommand };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
