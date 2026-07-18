/**
 * Plan-first install orchestration for init / add / interactive / update.
 */
import * as p from "@clack/prompts";
import { PERSONAL_RULES } from "./pkg.mjs";
import { bundledSkillsFor } from "./catalog.mjs";
import {
  detectAgents,
  skillsCapableAgents,
  skillsUnsupportedAgents,
  getCapability,
} from "./agents.mjs";
import {
  installTeamRules,
  installPersonalRules,
  describeTeamTargets,
  describePersonalTargets,
  partitionRules,
  rulesByNames,
} from "./rules-install.mjs";
import { skillsAddCommand, runSkillsCmd, resolveSkillsShTargets } from "./skills-bridge.mjs";
import {
  applyDataPolicy,
  describeDataPolicy,
  describeToolingScope,
  requiresHardConfirm,
  liftMentalIgnores,
  DEFAULT_MENTAL_TOOLING,
  DEFAULT_MENTAL_DATA_POLICY,
} from "./mental-policy.mjs";
import {
  recordInstall,
  readManifest,
  projectManifestPath,
  globalManifestPath,
} from "./manifest.mjs";

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
 * @param {{ mentalTooling?: "user"|"project" }} [opts]
 */
export function planSelection(ruleNames, skillNames, allRules, opts = {}) {
  const mentalTooling = opts.mentalTooling ?? DEFAULT_MENTAL_TOOLING;
  const bundled = bundledSkillsFor(ruleNames).filter((s) => !skillNames.includes(s));
  const skills = [...skillNames, ...bundled];
  const selectedRules = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selectedRules, { mentalTooling });
  const wantsMental =
    personal.length > 0 ||
    team.some((r) => PERSONAL_RULES.includes(r.name)) ||
    skills.includes("mental") ||
    ruleNames.includes("mental");
  return { selectedRules, personal, team, skills, bundled, wantsMental, mentalTooling };
}

/**
 * Build a first-class InstallPlan (no mutation).
 * Reconciles team rules with the existing project manifest so add never shrinks
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
  mentalTooling = DEFAULT_MENTAL_TOOLING,
  mentalDataPolicy = DEFAULT_MENTAL_DATA_POLICY,
  cwd = process.cwd(),
  home,
  reconcile = true,
}) {
  const agentIds = resolveAgents(agents);
  let names = [...ruleNames];

  if (reconcile) {
    const proj = readManifest(projectManifestPath(cwd));
    // Union project team rules so add cannot truncate AGENTS.md
    const existingTeam = proj.rules.filter(
      (n) => mentalTooling === "project" || !PERSONAL_RULES.includes(n),
    );
    names = [...new Set([...existingTeam, ...names])];
    // Re-install personal rules only when this plan touches Mental
    const touchesMental =
      names.includes("mental") ||
      ruleNames.includes("mental") ||
      skillNames.includes("mental");
    if (touchesMental && mentalTooling === "user") {
      const glob = home
        ? readManifest(globalManifestPath(home))
        : readManifest(globalManifestPath());
      const existingPersonal = glob.rules.filter((n) => PERSONAL_RULES.includes(n));
      names = [...new Set([...names, ...existingPersonal])];
    }
  }

  // Selecting mental implies its name is present
  if (
    skillNames.includes("mental") ||
    ruleNames.includes("mental") ||
    names.includes("mental")
  ) {
    names = [...new Set([...names, "mental"])];
  }

  const selection = planSelection(names, skillNames, allRules, { mentalTooling });
  const surfaces = [];
  if (selection.team.length) surfaces.push("AGENTS.md", "CLAUDE.md");
  if (selection.team.some((r) => !r.always)) surfaces.push(".cursor/rules/*.mdc");
  if (selection.personal.length) {
    surfaces.push("~/.claude/CLAUDE.md", "~/.codex/AGENTS.md", "~/.cursor/rules/*.mdc");
  }

  return {
    ...selection,
    agentIds,
    mentalTooling,
    mentalDataPolicy,
    surfaces,
    ruleNames: names,
  };
}

/**
 * Format review lines for an InstallPlan.
 * @param {object} plan
 * @param {{ dryRun?: boolean }} [opts]
 */
export function formatPlanReview(plan, { dryRun = false } = {}) {
  const lines = [];
  if (plan.team.length) {
    lines.push(`Team rules (project): ${plan.team.map((r) => r.name).join(", ")}`);
  }
  if (plan.personal.length) {
    lines.push(`Personal rules (user-wide): ${plan.personal.map((r) => r.name).join(", ")}`);
  }
  if (plan.wantsMental) {
    lines.push(`Mental tooling: ${plan.mentalTooling} — ${describeToolingScope(plan.mentalTooling)}`);
    lines.push(
      `Mental data: ${plan.mentalDataPolicy} — ${describeDataPolicy(plan.mentalDataPolicy)}`,
    );
  }
  if (plan.skills.length) {
    const label = (s) => (plan.bundled.includes(s) ? `${s} (bundled)` : s);
    const mentalSkills = plan.skills.filter((s) => s === "mental");
    const otherSkills = plan.skills.filter((s) => s !== "mental");
    if (otherSkills.length) lines.push(`Skills (project): ${otherSkills.map(label).join(", ")}`);
    if (mentalSkills.length) {
      const scope = plan.mentalTooling === "project" ? "project" : "global";
      lines.push(`Skills (${scope}): ${mentalSkills.map(label).join(", ")}`);
    }
  }
  lines.push(`Tools (skills targets): ${plan.agentIds.join(", ")}`);
  const unsupported = skillsUnsupportedAgents(plan.agentIds);
  if (unsupported.length) {
    lines.push(`(no skills.sh target — rules-only): ${unsupported.join(", ")}`);
  }
  if (plan.team.length) {
    lines.push("", "Team destinations:");
    for (const line of describeTeamTargets()) lines.push(`  ${line}`);
  }
  if (plan.personal.length) {
    lines.push("", "Personal destinations:");
    for (const line of describePersonalTargets()) lines.push(`  ${line}`);
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

    if (plan.wantsMental && requiresHardConfirm(plan.mentalDataPolicy)) {
      if (yes) {
        p.log.error(
          `Data policy "${plan.mentalDataPolicy}" requires an interactive confirm and cannot be used with -y. Re-run without -y, or pass an explicit non-consequential policy.`,
        );
        return { cancelled: true, ok: false };
      }
      const warn = await p.confirm({
        message:
          plan.mentalDataPolicy === "tracked"
            ? "Tracked Mental has NO privacy promise. Secrets/history may enter git. Continue?"
            : "Repo .gitignore will record a personal-privacy convention in shared history. Continue?",
      });
      if (p.isCancel(warn) || !warn) {
        p.cancel("Cancelled.");
        return { cancelled: true, ok: false };
      }
    } else if (plan.wantsMental && plan.mentalDataPolicy === "global-exclude" && !yes && !dryRun) {
      const warn = await p.confirm({
        message:
          "This may set/append your machine-wide git excludes (core.excludesfile) for ALL repos. Continue?",
      });
      if (p.isCancel(warn) || !warn) {
        p.cancel("Cancelled.");
        return { cancelled: true, ok: false };
      }
    }

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

  if (plan.team.length) {
    const s = p.spinner();
    s.start(dryRun ? "Resolving team rule targets" : "Installing team rules");
    // Full desired set already reconciled in buildInstallPlan
    const r = installTeamRules(plan.team, { dryRun });
    s.stop(
      dryRun
        ? `Would write ${r.written.length} file(s)`
        : `Team rules installed (${r.written.length} file(s))`,
    );
    if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
    notes.push(...r.notes);
    if (!dryRun) {
      recordInstall("project", {
        rules: plan.team.map((x) => x.name),
        agents: agentIds,
        surfaces: r.surfaces,
        mentalTooling: plan.wantsMental && plan.mentalTooling === "project" ? plan.mentalTooling : undefined,
        mentalDataPolicy:
          plan.wantsMental && plan.mentalTooling === "project" ? plan.mentalDataPolicy : undefined,
      });
    }
  }

  if (plan.personal.length || (plan.wantsMental && plan.mentalTooling === "user")) {
    const personalRules = plan.personal;
    if (personalRules.length) {
      const s = p.spinner();
      s.start(dryRun ? "Resolving personal rule targets" : "Installing personal rules (user-wide)");
      const r = installPersonalRules(personalRules, { dryRun });
      s.stop(
        dryRun
          ? `Would write ${r.written.length} file(s)`
          : `Personal rules installed (${r.written.length} file(s))`,
      );
      if (r.written.length) p.note(r.written.join("\n"), dryRun ? "Would write" : "Wrote");
      notes.push(...r.notes);
      if (!dryRun) {
        recordInstall("global", {
          rules: personalRules.map((x) => x.name),
          agents: agentIds,
          surfaces: r.surfaces,
          mentalTooling: plan.mentalTooling,
          mentalDataPolicy: plan.mentalDataPolicy,
        });
      }
    } else if (plan.wantsMental && !dryRun) {
      // skill-only mental still records policy on global manifest
      recordInstall("global", {
        mentalTooling: plan.mentalTooling,
        mentalDataPolicy: plan.mentalDataPolicy,
      });
    }
  }

  if (plan.wantsMental) {
    if (dryRun) {
      p.log.step(`Would apply Mental data policy: ${plan.mentalDataPolicy}`);
    } else {
      const ex = applyDataPolicy(plan.mentalDataPolicy);
      if (!ex.ok) {
        p.log.warn(
          `Could not apply data policy (${ex.reason || "unknown"}). Run \`npx balakit doctor\` when ready.`,
        );
      } else if (plan.mentalDataPolicy === "tracked" && ex.ignored) {
        p.log.warn(ex.note);
        if (!yes) {
          const lift = await p.confirm({
            message:
              "Lift balakit .mental/ ignore lines now so tracked mode can work? (affects global exclude for all repos)",
          });
          if (!p.isCancel(lift) && lift) {
            const r = liftMentalIgnores();
            for (const s of r.lifted) p.log.step(`Lifted ignore from ${s.file}`);
            if (!r.lifted.length) p.log.warn("No ignore lines were removed.");
          } else {
            p.log.info("Left ignores in place. Later: npx balakit doctor --lift-ignore");
          }
        } else {
          p.log.info("Skipped auto-lift under -y. Run: npx balakit doctor --lift-ignore");
        }
      } else if (ex.note) {
        p.log.warn(ex.note);
      } else if (plan.mentalDataPolicy === "global-exclude") {
        p.log.step(
          `${ex.appended ? "Secured" : "Confirmed"} .mental/ in global git excludes → ${ex.file}${ex.created ? " (core.excludesfile wired)" : ""}`,
        );
      } else if (ex.file) {
        p.log.step(`${ex.appended ? "Wrote" : "Confirmed"} ${ex.file}`);
      } else {
        p.log.step(`Mental data policy: ${plan.mentalDataPolicy}`);
      }

      if (plan.mentalTooling === "project") {
        recordInstall("project", {
          mentalTooling: plan.mentalTooling,
          mentalDataPolicy: plan.mentalDataPolicy,
        });
      }
    }
  }

  if (notes.length) p.note([...new Set(notes)].join("\n\n"), "Heads-up");

  const mentalSkills = plan.skills.filter((s) => s === "mental");
  const otherSkills = plan.skills.filter((s) => s !== "mental");
  const mentalSkillScope = plan.mentalTooling === "project" ? "project" : "global";

  const runSkillBatch = (names, scope) => {
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
    const cmd = skillsAddCommand(names, capable, scope);
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
    recordInstall(scope, { skills: names, agents: capable });
    return true;
  };

  if (!runSkillBatch(otherSkills, "project")) skillsFailed = true;
  if (!runSkillBatch(mentalSkills, mentalSkillScope)) skillsFailed = true;

  return {
    cancelled: false,
    ok: !skillsFailed,
    partial: skillsFailed,
    agents: agentIds,
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
  wantsMental,
  agents,
  dryRun = false,
  yes = false,
  review = true,
  mentalTooling = DEFAULT_MENTAL_TOOLING,
  mentalDataPolicy = DEFAULT_MENTAL_DATA_POLICY,
  allRules,
  reconcile = true,
}) {
  const ruleNames = [
    ...team.map((r) => r.name),
    ...personal.map((r) => r.name),
  ];
  const catalog = allRules ?? [...team, ...personal];
  const plan = buildInstallPlan({
    ruleNames,
    skillNames: skills.filter((s) => !bundled.includes(s) || true),
    allRules: catalog.length ? catalog : rulesByNames([], ruleNames),
    agents,
    mentalTooling,
    mentalDataPolicy,
    reconcile,
  });
  // Preserve explicit skill list from caller (may include bundled)
  plan.skills = skills;
  plan.bundled = bundled;
  plan.wantsMental = wantsMental ?? plan.wantsMental;
  return runInstallPlan(plan, { dryRun, yes, review });
}

/** True when a name is a Mental-role rule. */
export function isPersonalRule(name) {
  return PERSONAL_RULES.includes(name);
}

/** Describe selected tools briefly for the wizard. */
export function describeSelectedTools(agentIds) {
  return agentIds.map((id) => {
    const c = getCapability(id);
    if (!c) return id;
    return `${c.label} (rules=${c.rulesConfidence}, skills=${c.skillsShId ? c.agentSkills : "n/a"})`;
  });
}
