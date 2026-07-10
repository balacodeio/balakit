/**
 * Shared install orchestration for init / add / interactive.
 */
import * as p from "@clack/prompts";
import { PERSONAL_RULES } from "./pkg.mjs";
import { bundledSkillsFor } from "./catalog.mjs";
import { detectAgents, AGENTS } from "./agents.mjs";
import { installTeamRules, installPersonalRules, describeTeamTargets, partitionRules } from "./rules-install.mjs";
import { skillsAddCommand, runSkillsCmd } from "./skills-bridge.mjs";
import { ensureMentalExcluded, checkMentalExcluded } from "./mental-exclude.mjs";
import { recordInstall } from "./manifest.mjs";

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
  // mental skill alone still triggers the personal stack (exclude + skill -g)
  const wantsMental =
    personal.length > 0 || skills.includes("mental") || ruleNames.includes("mental");
  return { selectedRules, personal, team, skills, bundled, wantsMental };
}

/**
 * Execute an install plan.
 * @param {object} opts
 */
export async function runInstall({
  team,
  personal,
  skills,
  bundled = [],
  wantsMental,
  agents,
  dryRun = false,
  yes = false,
  review = true,
}) {
  const agentIds = resolveAgents(agents);

  if (review) {
    const lines = [];
    if (team.length) lines.push(`Team rules (project): ${team.map((r) => r.name).join(", ")}`);
    if (personal.length || wantsMental)
      lines.push(
        `Personal layer (global): ${[...new Set([...personal.map((r) => r.name), ...(wantsMental ? ["mental"] : [])])].join(", ")}`,
      );
    if (skills.length) {
      const label = (s) => (bundled.includes(s) ? `${s} (bundled)` : s);
      const teamSkills = skills.filter((s) => s !== "mental");
      const mentalSkills = skills.filter((s) => s === "mental");
      if (teamSkills.length)
        lines.push(`Skills (project): ${teamSkills.map(label).join(", ")}`);
      if (mentalSkills.length)
        lines.push(`Skills (global): ${mentalSkills.map(label).join(", ")}`);
    }
    lines.push(`Agents: ${agentIds.join(", ")}`);
    if (team.length) {
      lines.push("", "Team destinations:");
      for (const line of describeTeamTargets()) lines.push(`  ${line}`);
    }
    p.note(lines.join("\n"), dryRun ? "Review (dry-run)" : "Review");

    if (!yes && !dryRun) {
      const go = await p.confirm({ message: "Install now?" });
      if (p.isCancel(go) || !go) {
        p.cancel("Cancelled.");
        return { cancelled: true };
      }
    }
  }

  const notes = [];

  if (team.length) {
    const s = p.spinner();
    s.start(dryRun ? "Resolving team rule targets" : "Installing team rules");
    const r = installTeamRules(team, { dryRun });
    s.stop(
      dryRun
        ? `Would write ${r.written.length} file(s)`
        : `Team rules installed (${r.written.length} file(s))`,
    );
    if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
    notes.push(...r.notes);
    if (!dryRun) recordInstall("project", { rules: team.map((x) => x.name) });
  }

  // Personal stack: rule (global) + mental skill (global) + exclude
  if (personal.length || wantsMental) {
    const personalRules = personal.length
      ? personal
      : []; // skill-only mental still gets exclude + skill -g
    if (personalRules.length) {
      const s = p.spinner();
      s.start(dryRun ? "Resolving personal rule targets" : "Installing personal rules (global)");
      const r = installPersonalRules(personalRules, { dryRun });
      s.stop(
        dryRun
          ? `Would write ${r.written.length} file(s)`
          : `Personal rules installed (${r.written.length} file(s))`,
      );
      if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
      notes.push(...r.notes);
      if (!dryRun) recordInstall("global", { rules: personalRules.map((x) => x.name) });
    }

    if (dryRun) {
      p.log.step("Would ensure .mental/ is in the global git excludes (core.excludesfile).");
    } else {
      const ex = ensureMentalExcluded();
      if (!ex.ok) {
        p.log.warn(
          "git not found — .mental/ is NOT yet git-ignored. Once git is installed, run `npx balakit doctor`.",
        );
      } else {
        const verify = checkMentalExcluded();
        const live = verify.liveIgnored === true ? " (verified: git ignores .mental/ here)" : "";
        p.log.step(
          `${ex.appended ? "Secured" : "Confirmed"} .mental/ in your global git excludes → ${ex.file}${ex.created ? " (core.excludesfile wired)" : ""}${live}`,
        );
      }
    }
  }

  if (notes.length) p.note([...new Set(notes)].join("\n\n"), "Heads-up");

  // Skills: mental always -g; others project unless only personal
  const mentalSkills = skills.filter((s) => s === "mental");
  const otherSkills = skills.filter((s) => s !== "mental");

  const runSkillBatch = (names, scope) => {
    if (!names.length) return;
    const noSkills = agentIds.filter((a) => !AGENTS.find((x) => x.id === a)?.skillsShId);
    if (noSkills.length) {
      p.log.warn(`skills.sh has no confirmed support for: ${noSkills.join(", ")} — skipped for skills.`);
    }
    const cmd = skillsAddCommand(names, agentIds, scope);
    if (dryRun) {
      p.log.step(`Would install skills via skills.sh:\n${cmd}`);
    } else {
      p.log.step(`Installing skills via skills.sh:\n${cmd}`);
      const result = runSkillsCmd(cmd);
      if (!result.ok) {
        p.log.warn("skills.sh did not complete. Run this manually when ready:");
        p.log.message(cmd);
      } else {
        recordInstall(scope, { skills: names });
      }
    }
  };

  runSkillBatch(otherSkills, "project");
  runSkillBatch(mentalSkills, "global");

  return { cancelled: false, agents: agentIds };
}

/** True when a name is a personal-layer rule. */
export function isPersonalRule(name) {
  return PERSONAL_RULES.includes(name);
}
