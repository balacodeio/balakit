/**
 * Guided setup: intent → tools → kit → review → apply.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES, SKILL_BUNDLED_BY } from "../lib/pkg.mjs";
import { loadRules, loadSkills, trunc } from "../lib/catalog.mjs";
import {
  buildInstallPlan,
  runInstallPlan,
  describeSelectedTools,
} from "../lib/install.mjs";
import { detectAgents, AGENT_IDS, getCapability } from "../lib/agents.mjs";

/**
 * @param {{
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   scope?: "project"|"user",
 * }} opts
 */
export async function cmdInteractive(opts = {}) {
  const allRules = loadRules();
  const allSkills = loadSkills();

  p.intro(`${CMD} v${VERSION} — guided setup${opts.dryRun ? "  [dry-run]" : ""}`);

  let intent = null;
  if (opts.yes) intent = opts.scope === "user" ? "user" : "team";

  if (!intent) {
    const picked = await p.select({
      message: "What do you want to set up?",
      options: [
        {
          value: "team",
          label: "This repo — project standing rules",
          hint: `${TEAM_INIT_RULES.join(", ")} → AGENTS.md + CLAUDE.md + .cursor/rules`,
        },
        {
          value: "user",
          label: "This machine — all projects",
          hint: "User-wide ~/.cursor/rules, ~/.claude, ~/.codex, plugins/local",
        },
        {
          value: "advanced",
          label: "Advanced — cherry-pick",
          hint: "choose individual rules and skills",
        },
      ],
    });
    if (p.isCancel(picked)) {
      p.cancel("Cancelled.");
      return 1;
    }
    intent = picked;
  }

  let agentIds = opts.agents?.length ? opts.agents : detectAgents();
  if (!opts.agents?.length && !opts.yes) {
    const confirmed = await p.multiselect({
      message: "Which tools should receive skills? (detection is a hint)",
      options: AGENT_IDS.filter((id) => getCapability(id)?.skillsShId).map((id) => {
        const c = getCapability(id);
        const detected = agentIds.includes(id);
        return {
          value: id,
          label: c.label,
          hint: `${c.agentSkills}; rules=${c.rulesConfidence}${detected ? " · detected" : ""}`,
        };
      }),
      initialValues: agentIds.filter((id) => getCapability(id)?.skillsShId),
      required: false,
    });
    if (p.isCancel(confirmed)) {
      p.cancel("Cancelled.");
      return 1;
    }
    agentIds = confirmed.length ? confirmed : agentIds;
  }
  p.log.info(describeSelectedTools(agentIds).join("\n"));

  let ruleNames = [];
  let skillNames = [];

  if (intent === "team" || intent === "user") {
    ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  }
  if (intent === "advanced") {
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
            ? `auto-installs with the ${SKILL_BUNDLED_BY[s.name].join("/")} rule`
            : trunc(s.description, 64),
        })),
      },
      required: true,
    });
    if (p.isCancel(picked)) {
      p.cancel("Cancelled.");
      return 1;
    }
    ruleNames = picked.filter((v) => v.startsWith("rule:")).map((v) => v.slice(5));
    skillNames = picked.filter((v) => v.startsWith("skill:")).map((v) => v.slice(6));
  }

  const scope = intent === "user" ? "user" : intent === "team" ? "project" : (opts.scope ?? "project");

  const plan = buildInstallPlan({
    ruleNames,
    skillNames,
    allRules,
    agents: agentIds,
    scope,
  });

  if (plan.bundled.length) {
    p.log.info(
      plan.bundled
        .map((s) => `${s} skill added automatically (bundled with its rule)`)
        .join("\n"),
    );
  }

  if (!plan.selectedRules.length && !plan.skills.length) {
    p.cancel("Nothing selected.");
    return 1;
  }

  const result = await runInstallPlan(plan, {
    dryRun: opts.dryRun,
    yes: opts.yes,
  });
  if (result?.cancelled) return 1;
  if (!result?.ok) {
    p.outro("Finished with errors — see above (partial install).");
    return 1;
  }

  p.outro(
    opts.dryRun
      ? "Dry-run complete — nothing written."
      : `Done. Update anytime: npx ${CMD} update`,
  );
  return 0;
}
