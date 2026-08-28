/**
 * Project-scoped twins of Cursor `.mdc` rules for Claude Code and Copilot.
 * Source remains `rules/<name>.mdc`; adapters are generated at install time.
 */
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { rel } from "./render.mjs";

/**
 * Split a Cursor `globs` frontmatter value into individual patterns.
 * @param {string} globs
 * @returns {string[]}
 */
export function globList(globs) {
  return String(globs ?? "")
    .replace(/^["']|["']$/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Claude Code path-scoped rule (`.md` + `paths:`).
 * @param {{ name: string, globs: string, body: string, description: string }} rule
 */
export function renderClaudeRule(rule) {
  const paths = globList(rule.globs);
  const pathsYaml = paths.length
    ? paths.map((p) => `  - "${p}"`).join("\n")
    : "  - \"**/*\"";
  return `---\ndescription: ${rule.description || rule.name}\npaths:\n${pathsYaml}\n---\n\n${rule.body.trim()}\n`;
}

/**
 * Copilot path-specific instructions (`applyTo`).
 * @param {{ name: string, globs: string, body: string, description: string }} rule
 */
export function renderCopilotInstructions(rule) {
  const paths = globList(rule.globs);
  const applyTo = paths.length ? paths.join(",") : "**";
  return `---\ndescription: ${rule.description || rule.name}\napplyTo: "${applyTo}"\n---\n\n${rule.body.trim()}\n`;
}

/**
 * Write scoped-rule twins when the matching agents are selected.
 * Always-on rules stay in AGENTS.md / CLAUDE.md only.
 * @returns {{ written: string[], surfaces: string[] }}
 */
export function writeScopedTwins(rule, { cwd = process.cwd(), agents = [], dryRun = false } = {}) {
  const written = [];
  const surfaces = [];
  if (!rule || rule.always) return { written, surfaces };
  const ids = new Set(agents);

  if (ids.has("claude-code")) {
    const dest = join(cwd, ".claude", "rules", `${rule.name}.md`);
    if (!dryRun) {
      mkdirSync(join(cwd, ".claude", "rules"), { recursive: true });
      writeFileSync(dest, renderClaudeRule(rule));
    }
    written.push(rel(dest));
    surfaces.push(`.claude/rules/${rule.name}.md`);
  }

  if (ids.has("copilot")) {
    const dest = join(cwd, ".github", "instructions", `${rule.name}.instructions.md`);
    if (!dryRun) {
      mkdirSync(join(cwd, ".github", "instructions"), { recursive: true });
      writeFileSync(dest, renderCopilotInstructions(rule));
    }
    written.push(rel(dest));
    surfaces.push(`.github/instructions/${rule.name}.instructions.md`);
  }

  return { written, surfaces };
}

/**
 * Remove scoped-rule twins for a rule (both agents; leftover files are harmless).
 * @returns {string[]}
 */
export function removeScopedTwins(rule, { cwd = process.cwd(), dryRun = false } = {}) {
  const removed = [];
  const dests = [
    join(cwd, ".claude", "rules", `${rule.name}.md`),
    join(cwd, ".github", "instructions", `${rule.name}.instructions.md`),
  ];
  for (const dest of dests) {
    if (!existsSync(dest)) continue;
    if (!dryRun) unlinkSync(dest);
    removed.push(rel(dest));
  }
  return removed;
}
