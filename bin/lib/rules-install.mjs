/**
 * AGENTS.md-first rule install / remove, plus Cursor-native `.mdc` files.
 *
 * Project:
 *   - Always-on → managed block in AGENTS.md + CLAUDE.md **and** `.cursor/rules/<name>.mdc`
 *   - Scoped (globs) → `.cursor/rules/<name>.mdc` (+ listed in the managed block)
 *   - Optional twins: `.claude/rules/*.md`, `.github/instructions/*.instructions.md`
 *
 * User (`--scope user`):
 *   - Managed blocks in ~/.claude/CLAUDE.md, ~/.codex/AGENTS.md, ~/.config/opencode/AGENTS.md
 *   - Cursor `.mdc` in ~/.cursor/rules/
 *   Customize → User Rules is account UI and is not written.
 */
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
import { homedir } from "node:os";
import { PERSONAL_RULES } from "./pkg.mjs";
import { mergeManaged, removeManaged, renderRulesBlock, hasManagedBlock, rel } from "./render.mjs";
import { writeScopedTwins, removeScopedTwins } from "./rule-adapters.mjs";

/**
 * Split a rule list into personal vs team by name list (defaults to PERSONAL_RULES).
 * `--scope user` ignores this split and installs every selected rule user-wide.
 * @param {Array<{name: string}>} rules
 */
export function partitionRules(rules) {
  const personalNames = new Set(PERSONAL_RULES);
  const personal = rules.filter((r) => personalNames.has(r.name));
  const team = rules.filter((r) => !personalNames.has(r.name));
  return { personal, team };
}

/**
 * Union rule objects by name (catalog order preserved via catalog list).
 * @param {Array<{name: string}>} catalog
 * @param {string[]} names
 */
export function rulesByNames(catalog, names) {
  const set = new Set(names);
  return catalog.filter((r) => set.has(r.name));
}

/**
 * Write Cursor `.mdc` files for every rule (always-on and scoped).
 * @returns {{ written: string[], surfaces: string[] }}
 */
function writeCursorMdc(rules, dir, { dryRun = false } = {}) {
  const written = [];
  const surfaces = [];
  if (!rules.length) return { written, surfaces };
  if (!dryRun) mkdirSync(dir, { recursive: true });
  for (const r of rules) {
    const dest = join(dir, `${r.name}.mdc`);
    if (!dryRun) writeFileSync(dest, r.raw);
    written.push(rel(dest));
    surfaces.push(join(dir, `${r.name}.mdc`).includes(`${sep}.cursor${sep}`) ? `.cursor/rules/${r.name}.mdc` : dest);
  }
  return { written, surfaces };
}

/**
 * Install team (project-scoped) rules AGENTS.md-first plus Cursor `.mdc`.
 * Pass the **full desired** team rule set (already reconciled with manifest).
 * @returns {{ written: string[], notes: string[], surfaces: string[] }}
 */
export function installTeamRules(rules, { cwd = process.cwd(), dryRun = false, agents = [] } = {}) {
  const written = [];
  const notes = [];
  const surfaces = [];
  if (!rules.length) return { written, notes, surfaces };

  const block = renderRulesBlock(rules, { consumer: true });

  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");
  if (!dryRun) {
    mergeManaged(agentsMd, block);
    mergeManaged(claudeMd, block);
  }
  written.push(rel(agentsMd), rel(claudeMd));
  surfaces.push("AGENTS.md", "CLAUDE.md");

  const mdc = writeCursorMdc(rules, join(cwd, ".cursor", "rules"), { dryRun });
  written.push(...mdc.written);
  surfaces.push(...rules.map((r) => `.cursor/rules/${r.name}.mdc`));

  for (const r of rules.filter((x) => !x.always)) {
    const twins = writeScopedTwins(r, { cwd, agents, dryRun });
    written.push(...twins.written);
    surfaces.push(...twins.surfaces);
  }

  notes.push(
    "Standing rules live in AGENTS.md + CLAUDE.md. Cursor also gets .cursor/rules/*.mdc (always-on and scoped).",
  );
  if (rules.some((r) => !r.always) && (agents.includes("claude-code") || agents.includes("copilot"))) {
    notes.push("Scoped SEO rule also written as Claude `.claude/rules/` and/or Copilot `.github/instructions/` twins.");
  }

  return { written, notes, surfaces: [...new Set(surfaces)] };
}

/**
 * Install rules at user/global scope (this machine, all projects).
 * @returns {{ written: string[], notes: string[], surfaces: string[] }}
 */
export function installPersonalRules(rules, { home = homedir(), dryRun = false } = {}) {
  const written = [];
  const notes = [];
  const surfaces = [];
  if (!rules.length) return { written, notes, surfaces };

  const block = renderRulesBlock(rules, { consumer: true });
  const targets = [
    { file: join(home, ".claude", "CLAUDE.md"), surface: "~/.claude/CLAUDE.md" },
    { file: join(home, ".codex", "AGENTS.md"), surface: "~/.codex/AGENTS.md" },
    { file: join(home, ".config", "opencode", "AGENTS.md"), surface: "~/.config/opencode/AGENTS.md" },
  ];
  for (const t of targets) {
    if (!dryRun) mergeManaged(t.file, block);
    written.push(t.file);
    surfaces.push(t.surface);
  }

  const cursorDir = join(home, ".cursor", "rules");
  if (!dryRun) mkdirSync(cursorDir, { recursive: true });
  for (const r of rules) {
    const dest = join(cursorDir, `${r.name}.mdc`);
    if (!dryRun) writeFileSync(dest, r.raw);
    written.push(dest);
    surfaces.push(`~/.cursor/rules/${r.name}.mdc`);
  }
  notes.push(
    "User-wide rules: ~/.claude/CLAUDE.md, ~/.codex/AGENTS.md, ~/.config/opencode/AGENTS.md, ~/.cursor/rules/*.mdc. Customize → User Rules is account UI and is not written by this CLI.",
  );

  return { written, notes, surfaces };
}

/** Alias used by `--scope user`. */
export const installUserRules = installPersonalRules;

/**
 * Remove team rules from the project (managed blocks + `.mdc` + twins).
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

  for (const r of toRemove) {
    const dest = join(cwd, ".cursor", "rules", `${r.name}.mdc`);
    if (existsSync(dest)) {
      if (!dryRun) unlinkSync(dest);
      removed.push(rel(dest));
    }
    removed.push(...removeScopedTwins(r, { cwd, dryRun }));
  }

  return { written, removed };
}

/**
 * Remove user-wide rules from home config.
 */
export function removePersonalRules(toRemove, remaining, { home = homedir(), dryRun = false } = {}) {
  const removed = [];
  const written = [];
  const targets = [
    join(home, ".claude", "CLAUDE.md"),
    join(home, ".codex", "AGENTS.md"),
    join(home, ".config", "opencode", "AGENTS.md"),
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

export const removeUserRules = removePersonalRules;

/** Describe project destinations for review. */
export function describeTeamTargets(cwd = process.cwd()) {
  return [
    `AGENTS.md  → ${rel(join(cwd, "AGENTS.md"))} (managed block)`,
    `CLAUDE.md  → ${rel(join(cwd, "CLAUDE.md"))} (managed block)`,
    `Cursor     → ${rel(join(cwd, ".cursor", "rules"))}${sep}<name>.mdc (always-on + scoped)`,
    `Twins      → .claude/rules/*.md and .github/instructions/*.instructions.md (when those agents are selected)`,
  ];
}

/** Describe user-wide destinations for review. */
export function describePersonalTargets() {
  return [
    "~/.claude/CLAUDE.md (managed block)",
    "~/.codex/AGENTS.md (managed block)",
    "~/.config/opencode/AGENTS.md (managed block)",
    "~/.cursor/rules/<name>.mdc",
    "~/.cursor/plugins/local/<plugin> (copied on user-scope skill/plugin install)",
  ];
}

export const describeUserTargets = describePersonalTargets;
