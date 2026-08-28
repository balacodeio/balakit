/**
 * Plan-first install orchestration for init / add / interactive / update.
 */
import * as p from "@clack/prompts";
import { bundledSkillsFor } from "./catalog.mjs";
import {
  detectAgents,
  skillsCapableAgents,
  skillsUnsupportedAgents,
  getCapability,
} from "./agents.mjs";
import {
  installTeamRules,
  installUserRules,
  describeTeamTargets,
  describeUserTargets,
  partitionRules,
  rulesByNames,
} from "./rules-install.mjs";
import { skillsAddCommand, runSkillsCmd, resolveSkillsShTargets } from "./skills-bridge.mjs";
import { recordInstall, readManifest, projectManifestPath, globalManifestPath } from "./manifest.mjs";
import { linkCursorProjectSkills, copyCursorLocalPlugins } from "./cursor-native.mjs";

/** @typedef {"project"|"user"} InstallScope */

/**
 * Resolve agent ids: explicit flag, else auto-detect.
 * @param {string[]|undefined} agents
 */
export function resolveAgents(agents) {
  return agents?.length ? agents : detectAgents();
}

/**
 * Expand selection with bundled skills; split personal vs team.
 * @param {string[]} ruleNames
 * @param {string[]} skillNames
 * @param {Array} allRules
 */
export function planSelection(ruleNames, skillNames, allRules) {
  const bundled = bundledSkillsFor(ruleNames).filter((s) => !skillNames.includes(s));
  const skills = [...skillNames, ...bundled];
  const selectedRules = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selectedRules);
  return { selectedRules, personal, team, skills, bundled };
}

/**
 * Build a first-class InstallPlan (no mutation).
 * Reconciles rules with the matching scope manifest so add never shrinks
 * the managed block.
 *
 * @param {object} input
 * @returns {object} InstallPlan
 */
export function buildInstallPlan({
  ruleNames = [],
  skillNames = [],
  allRules,
  agents,
  cwd = process.cwd(),
  home,
  scope = "project",
  reconcile = true,
} = {}) {
  const agentIds = resolveAgents(agents);
  const installScope = scope === "user" ? "user" : "project";
  let names = [...ruleNames];

  if (reconcile) {
    const file =
      installScope === "user" ? globalManifestPath(home) : projectManifestPath(cwd);
    const cur = readManifest(file);
    names = [...new Set([...cur.rules, ...names])];
  }

  const selection = planSelection(names, skillNames, allRules);
  const userRules = installScope === "user" ? selection.selectedRules : selection.personal;
  const teamRules = installScope === "user" ? [] : selection.team;

  const surfaces = [];
  if (teamRules.length) {
    surfaces.push("AGENTS.md", "CLAUDE.md", ".cursor/rules/*.mdc");
  }
  if (userRules.length) {
    surfaces.push(
      "~/.claude/CLAUDE.md",
      "~/.codex/AGENTS.md",
      "~/.config/opencode/AGENTS.md",
      "~/.cursor/rules/*.mdc",
    );
  }

  return {
    ...selection,
    team: teamRules,
    personal: userRules,
    agentIds,
    surfaces,
    ruleNames: names,
    scope: installScope,
    cwd,
    home,
  };
}

/**
 * Format review lines for an InstallPlan.
 * @param {object} plan
 * @param {{ dryRun?: boolean }} [opts]
 */
export function formatPlanReview(plan, { dryRun = false } = {}) {
  const lines = [];
  lines.push(`Scope: ${plan.scope === "user" ? "user (this machine)" : "project (this repo)"}`);
  if (plan.team.length) {
    lines.push(`Project rules: ${plan.team.map((r) => r.name).join(", ")}`);
  }
  if (plan.personal.length) {
    lines.push(`User-wide rules: ${plan.personal.map((r) => r.name).join(", ")}`);
  }
  if (plan.skills.length) {
    const label = (s) => (plan.bundled.includes(s) ? `${s} (bundled)` : s);
    const where = plan.scope === "user" ? "user-wide" : "project";
    lines.push(`Skills (${where}): ${plan.skills.map(label).join(", ")}`);
  }
  lines.push(`Tools (skills targets): ${plan.agentIds.join(", ")}`);
  const unsupported = skillsUnsupportedAgents(plan.agentIds);
  if (unsupported.length) {
    lines.push(`(no skills.sh target — rules-only): ${unsupported.join(", ")}`);
  }
  if (plan.team.length) {
    lines.push("", "Project destinations:");
    for (const line of describeTeamTargets()) lines.push(`  ${line}`);
  }
  if (plan.personal.length || (plan.scope === "user" && plan.skills.length)) {
    lines.push("", "User destinations:");
    for (const line of describeUserTargets()) lines.push(`  ${line}`);
  }
  if (dryRun) lines.unshift("[dry-run]");
  return lines;
}

/**
 * Execute an InstallPlan. No mutation before review/confirm.
 * @returns {Promise<{ cancelled: boolean, ok: boolean, agents?: string[], partial?: boolean }>}
 */
export async function runInstallPlan(plan, { dryRun = false, yes = false, review = true } = {}) {
  if (review) {
    p.note(formatPlanReview(plan, { dryRun }).join("\n"), dryRun ? "Review (dry-run)" : "Review");

    if (!yes && !dryRun) {
      const go = await p.confirm({ message: "Install now?" });
      if (p.isCancel(go) || !go) {
        p.cancel("Cancelled.");
        return { cancelled: true, ok: false };
      }
    }
  }

  const notes = [];
  let skillsFailed = false;
  const agentIds = plan.agentIds;
  const scope = plan.scope === "user" ? "user" : "project";
  const manifestScope = scope === "user" ? "global" : "project";

  if (plan.team.length) {
    const s = p.spinner();
    s.start(dryRun ? "Resolving project rule targets" : "Installing project rules");
    const r = installTeamRules(plan.team, { dryRun, agents: agentIds, cwd: plan.cwd });
    s.stop(
      dryRun
        ? `Would write ${r.written.length} file(s)`
        : `Project rules installed (${r.written.length} file(s))`,
    );
    if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
    notes.push(...r.notes);
    if (!dryRun) {
      recordInstall("project", {
        rules: plan.team.map((x) => x.name),
        agents: agentIds,
        surfaces: r.surfaces,
      }, { cwd: plan.cwd });
    }
  }

  if (plan.personal.length) {
    const s = p.spinner();
    s.start(dryRun ? "Resolving user-wide rule targets" : "Installing user-wide rules");
    const r = installUserRules(plan.personal, { dryRun, home: plan.home });
    s.stop(
      dryRun
        ? `Would write ${r.written.length} file(s)`
        : `User-wide rules installed (${r.written.length} file(s))`,
    );
    if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
    notes.push(...r.notes);
    if (!dryRun) {
      recordInstall("global", {
        rules: plan.personal.map((x) => x.name),
        agents: agentIds,
        surfaces: r.surfaces,
      }, { home: plan.home });
    }
  }

  if (notes.length) p.note([...new Set(notes)].join("\n\n"), "Heads-up");

  const runSkillBatch = (names, skillScope) => {
    if (!names.length) return true;
    const noSkills = skillsUnsupportedAgents(agentIds);
    if (noSkills.length) {
      p.log.warn(`No skills.sh target for: ${noSkills.join(", ")} — skipped for skills.`);
    }
    const capable = skillsCapableAgents(agentIds);
    const { skillsShIds, skippedUnverified } = resolveSkillsShTargets(capable);
    if (skippedUnverified.length) {
      p.log.warn(
        `skills.sh ids not on balakit verified allowlist (skipped): ${skippedUnverified.join(", ")}`,
      );
    }
    if (!skillsShIds.length) {
      p.log.warn("No verified skills.sh targets selected — skills not installed.");
      return false;
    }
    const cmd = skillsAddCommand(names, capable, skillScope);
    if (dryRun) {
      p.log.step(`Would install skills via skills.sh:\n${cmd}`);
      return true;
    }
    p.log.step(`Installing skills via skills.sh:\n${cmd}`);
    const result = runSkillsCmd(cmd);
    if (!result.ok) {
      p.log.error("skills.sh did not complete. Run this manually when ready:");
      p.log.message(cmd);
      return false;
    }
    recordInstall(skillScope === "global" ? "global" : "project", { skills: names, agents: capable }, {
      cwd: plan.cwd,
      home: plan.home,
    });
    return true;
  };

  const skillScope = scope === "user" ? "global" : "project";
  if (!runSkillBatch(plan.skills, skillScope)) skillsFailed = true;

  if (plan.skills.length && scope === "project" && agentIds.includes("cursor")) {
    const linked = linkCursorProjectSkills(plan.skills, { dryRun, cwd: plan.cwd });
    if (linked.written.length) {
      p.note(linked.written.join("\n"), dryRun ? "Would link Cursor skills" : "Cursor skill links");
    }
    notes.push(...linked.notes);
  }

  if (scope === "user" && agentIds.includes("cursor")) {
    const copied = copyCursorLocalPlugins({ dryRun, home: plan.home });
    if (copied.written.length) {
      p.note(copied.written.join("\n"), dryRun ? "Would copy Cursor plugins" : "Cursor local plugins");
    }
    notes.push(...copied.notes);
  }

  return {
    cancelled: false,
    ok: !skillsFailed,
    partial: skillsFailed,
    agents: agentIds,
    scope,
  };
}

/**
 * Back-compat wrapper used by older call sites.
 * Prefer buildInstallPlan + runInstallPlan.
 */
export async function runInstall({
  team,
  personal,
  skills,
  bundled = [],
  agents,
  dryRun = false,
  yes = false,
  review = true,
  allRules,
  reconcile = true,
  scope = "project",
}) {
  const ruleNames = [...team.map((r) => r.name), ...personal.map((r) => r.name)];
  const catalog = allRules ?? [...team, ...personal];
  const plan = buildInstallPlan({
    ruleNames,
    skillNames: skills,
    allRules: catalog.length ? catalog : rulesByNames([], ruleNames),
    agents,
    reconcile,
    scope,
  });
  plan.skills = skills;
  plan.bundled = bundled;
  return runInstallPlan(plan, { dryRun, yes, review });
}

/** Describe selected tools briefly for the wizard. */
export function describeSelectedTools(agentIds) {
  return agentIds.map((id) => {
    const c = getCapability(id);
    if (!c) return id;
    return `${c.label} (rules=${c.rulesConfidence}, skills=${c.skillsShId ? c.agentSkills : "n/a"})`;
  });
}
