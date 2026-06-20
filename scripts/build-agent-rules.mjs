#!/usr/bin/env node
/**
 * Generate root CLAUDE.md and AGENTS.md from the source-of-truth rules/*.mdc.
 *
 * Why: Cursor consumes .mdc rules natively, but Claude Code reads CLAUDE.md and
 * OpenCode / Codex / Copilot read AGENTS.md. This flattens the rules into those
 * two standing-context files so the same rules are active across every agent.
 *
 * Rules with `alwaysApply: true` are inlined in full (their headings demoted one
 * level so the document keeps a single H1). Scoped rules (a `globs` pattern,
 * `alwaysApply: false`) are listed in a "Conditional rules" index instead of
 * being forced into every session.
 *
 * This file is invoked by sync.ps1 / sync.sh — it is not meant to be edited to
 * change output; edit the rules in rules/ instead.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RULES_DIR = join(ROOT, "rules");

/** Parse one .mdc rule into its frontmatter fields and body. */
function parseRule(file) {
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  const frontmatter = match ? match[1] : "";
  const body = (match ? match[2] : raw).trim();
  const field = (key) => {
    const m = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : "";
  };
  return {
    name: basename(file, ".mdc"),
    always: /^alwaysApply:\s*true\s*$/m.test(frontmatter),
    description: field("description"),
    globs: field("globs"),
    body,
  };
}

/** Demote every Markdown heading one level (# -> ##) to nest under our H1. */
const demote = (md) => md.replace(/^(#{1,5}) /gm, "#$1 ");

const rules = readdirSync(RULES_DIR)
  .filter((f) => f.endsWith(".mdc"))
  .map((f) => parseRule(join(RULES_DIR, f)))
  // global first, then the remaining rules alphabetically
  .sort((a, b) =>
    a.name === "global" ? -1 : b.name === "global" ? 1 : a.name.localeCompare(b.name)
  );

const always = rules.filter((r) => r.always);
const scoped = rules.filter((r) => !r.always);

function render(agentLabel) {
  const out = [
    "<!-- GENERATED FILE — do not edit by hand.",
    "     Source of truth: rules/*.mdc · Regenerate: ./sync.sh or sync.ps1 -->",
    "",
    "# Project Rules",
    "",
    `Standing rules for ${agentLabel}, generated from this repository's \`rules/*.mdc\`. ` +
      "Edit the source rules, then run the sync script to regenerate this file.",
    "",
  ];

  for (const r of always) {
    out.push(`<!-- from rules/${r.name}.mdc -->`, demote(r.body), "");
  }

  if (scoped.length) {
    out.push("## Conditional rules", "", "Apply these only when working on matching files:", "");
    for (const r of scoped) {
      const globs = r.globs ? ` (globs: \`${r.globs}\`)` : "";
      out.push(`- **${r.name}**${globs} — ${r.description} → see \`rules/${r.name}.mdc\``);
    }
    out.push("");
  }

  return out.join("\n");
}

writeFileSync(join(ROOT, "CLAUDE.md"), render("Claude Code"));
writeFileSync(join(ROOT, "AGENTS.md"), render("OpenCode, Codex, Cursor, and GitHub Copilot"));

console.log(
  `Generated CLAUDE.md + AGENTS.md from ${rules.length} rules ` +
    `(${always.length} always-on, ${scoped.length} conditional).`
);
