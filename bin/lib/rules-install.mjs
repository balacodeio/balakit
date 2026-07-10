/**
 * AGENTS.md-first rule install / remove.
 *
 * Project (team) rules:
 *   - Always-on → managed block in AGENTS.md + CLAUDE.md
 *   - Scoped (globs) → `.cursor/rules/<name>.mdc` (+ listed in the managed block)
 *
 * Personal (mental) rules — always user/global:
 *   - ~/.claude/CLAUDE.md + ~/.codex/AGENTS.md managed blocks
 *   - ~/.cursor/rules/mental.mdc
 */
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
import { homedir } from "node:os";
import { PERSONAL_RULES } from "./pkg.mjs";
import { mergeManaged, removeManaged, renderRulesBlock, hasManagedBlock, rel } from "./render.mjs";

/**
 * Split a rule list into personal vs team.
 * @param {Array<{name: string}>} rules
 */
export function partitionRules(rules) {
  const personal = rules.filter((r) => PERSONAL_RULES.includes(r.name));
  const team = rules.filter((r) => !PERSONAL_RULES.includes(r.name));
  return { personal, team };
}

/**
 * Install team (project-scoped) rules AGENTS.md-first.
 * @returns {{ written: string[], notes: string[] }}
 */
export function installTeamRules(rules, { cwd = process.cwd(), dryRun = false } = {}) {
  const written = [];
  const notes = [];
  if (!rules.length) return { written, notes };

  const always = rules.filter((r) => r.always);
  const scoped = rules.filter((r) => !r.always);
  const block = renderRulesBlock(rules, { consumer: true });

  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");
  if (!dryRun) {
    mergeManaged(agentsMd, block);
    mergeManaged(claudeMd, block);
  }
  written.push(rel(agentsMd), rel(claudeMd));

  if (scoped.length) {
    const dir = join(cwd, ".cursor", "rules");
    if (!dryRun) mkdirSync(dir, { recursive: true });
    for (const r of scoped) {
      const dest = join(dir, `${r.name}.mdc`);
      if (!dryRun) writeFileSync(dest, r.raw);
      written.push(rel(dest));
    }
    notes.push(
      "Scoped rules written to .cursor/rules/*.mdc (Cursor globs). Also summarized in AGENTS.md / CLAUDE.md.",
    );
  }

  if (always.length && !scoped.length) {
    notes.push("Standing rules live in AGENTS.md + CLAUDE.md (Cursor reads AGENTS.md natively).");
  }

  return { written, notes };
}

/**
 * Install personal-layer rules at user/global scope.
 * @returns {{ written: string[], notes: string[] }}
 */
export function installPersonalRules(rules, { home = homedir(), dryRun = false } = {}) {
  const written = [];
  const notes = [];
  if (!rules.length) return { written, notes };

  const block = renderRulesBlock(rules, { consumer: true });
  const targets = [
    join(home, ".claude", "CLAUDE.md"),
    join(home, ".codex", "AGENTS.md"),
  ];
  for (const file of targets) {
    if (!dryRun) mergeManaged(file, block);
    written.push(file);
  }

  const cursorDir = join(home, ".cursor", "rules");
  if (!dryRun) mkdirSync(cursorDir, { recursive: true });
  for (const r of rules) {
    const dest = join(cursorDir, `${r.name}.mdc`);
    if (!dryRun) writeFileSync(dest, r.raw);
    written.push(dest);
  }
  notes.push(
    "Personal rules installed globally (~/.claude/CLAUDE.md, ~/.codex/AGENTS.md, ~/.cursor/rules/). Cursor may skip ~/.cursor/rules in workspace-less Agent sessions (known Cursor bug).",
  );

  return { written, notes };
}

/**
 * Remove team rules from the project (managed blocks + scoped mdc files).
 * When `remaining` is non-empty, rewrites the managed block to those rules;
 * otherwise removes the managed blocks entirely.
 */
export function removeTeamRules(toRemove, remaining, { cwd = process.cwd(), dryRun = false } = {}) {
  const written = [];
  const removed = [];
  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");

  if (remaining.length) {
    const block = renderRulesBlock(remaining, { consumer: true });
    if (!dryRun) {
      mergeManaged(agentsMd, block);
      mergeManaged(claudeMd, block);
    }
    written.push(rel(agentsMd), rel(claudeMd));
  } else {
    if (!dryRun) {
      if (removeManaged(agentsMd)) removed.push(rel(agentsMd));
      if (removeManaged(claudeMd)) removed.push(rel(claudeMd));
    } else {
      if (hasManagedBlock(agentsMd)) removed.push(rel(agentsMd));
      if (hasManagedBlock(claudeMd)) removed.push(rel(claudeMd));
    }
  }

  for (const r of toRemove.filter((x) => !x.always)) {
    const dest = join(cwd, ".cursor", "rules", `${r.name}.mdc`);
    if (existsSync(dest)) {
      if (!dryRun) unlinkSync(dest);
      removed.push(rel(dest));
    }
  }

  return { written, removed };
}

/**
 * Remove personal rules from user config.
 * When `remaining` is non-empty, rewrites global managed blocks; else removes them.
 */
export function removePersonalRules(toRemove, remaining, { home = homedir(), dryRun = false } = {}) {
  const removed = [];
  const written = [];
  const targets = [
    join(home, ".claude", "CLAUDE.md"),
    join(home, ".codex", "AGENTS.md"),
  ];

  if (remaining.length) {
    const block = renderRulesBlock(remaining, { consumer: true });
    for (const file of targets) {
      if (!dryRun) mergeManaged(file, block);
      written.push(file);
    }
  } else {
    for (const file of targets) {
      if (!dryRun) {
        if (removeManaged(file)) removed.push(file);
      } else if (hasManagedBlock(file)) {
        removed.push(file);
      }
    }
  }

  for (const r of toRemove) {
    const dest = join(home, ".cursor", "rules", `${r.name}.mdc`);
    if (existsSync(dest)) {
      if (!dryRun) unlinkSync(dest);
      removed.push(dest);
    }
  }

  return { written, removed };
}

/** Describe project destinations for review. */
export function describeTeamTargets(cwd = process.cwd()) {
  return [
    `AGENTS.md  → ${rel(join(cwd, "AGENTS.md"))} (managed block)`,
    `CLAUDE.md  → ${rel(join(cwd, "CLAUDE.md"))} (managed block)`,
    `Cursor     → ${rel(join(cwd, ".cursor", "rules"))}${sep}<scoped>.mdc (globs only)`,
  ];
}
