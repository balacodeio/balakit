/**
 * Guided setup: intent → tools → kit → Mental choices → review → apply.
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
import {
  DEFAULT_MENTAL_TOOLING,
  DEFAULT_MENTAL_DATA_POLICY,
  describeDataPolicy,
  describeToolingScope,
} from "../lib/mental-policy.mjs";

/**
 * @param {{
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   personal?: boolean,
 *   withPersonal?: boolean,
 *   mentalTooling?: string,
 *   mentalDataPolicy?: string,
 * }} opts
 */
export async function cmdInteractive(opts = {}) {
  const allRules = loadRules();
  const allSkills = loadSkills();

  p.intro(`${CMD} v${VERSION} — guided setup${opts.dryRun ? "  [dry-run]" : ""}`);

  let intent = null;
  if (opts.personal && !opts.withPersonal) intent = "personal";
  else if (opts.withPersonal) intent = "both";
  else if (opts.yes && !opts.personal) intent = "team";

  if (!intent) {
    const picked = await p.select({
      message: "What do you want to set up?",
      options: [
        {
          value: "team",
          label: "Project standing rules",
          hint: `${TEAM_INIT_RULES.join(", ")} → AGENTS.md + CLAUDE.md`,
        },
        {
          value: "personal",
          label: "Mental continuity",
          hint: "rule + skill + choose where tooling lives and how .mental/ is handled",
        },
        {
          value: "both",
          label: "Project rules + Mental",
          hint: "standing rules for the repo, then Mental choices",
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

  // Tools: detect, then confirm (unless --agents or -y with detect)
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

  if (intent === "team" || intent === "both") {
    ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  }
  if (intent === "personal" || intent === "both") {
    ruleNames = [...new Set([...ruleNames, "mental"])];
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

  const wantsMental =
    ruleNames.includes("mental") || skillNames.includes("mental") || intent === "personal";

  let mentalTooling = opts.mentalTooling ?? DEFAULT_MENTAL_TOOLING;
  let mentalDataPolicy = opts.mentalDataPolicy ?? DEFAULT_MENTAL_DATA_POLICY;

  if (wantsMental && !opts.mentalTooling && !opts.yes) {
    const scope = await p.select({
      message: "Where should Mental tooling (rule + skill) live?",
      options: [
        {
          value: "user",
          label: "User-wide (recommended)",
          hint: describeToolingScope("user"),
        },
        {
          value: "project",
          label: "This project only",
          hint: describeToolingScope("project"),
        },
      ],
    });
    if (p.isCancel(scope)) {
      p.cancel("Cancelled.");
      return 1;
    }
    mentalTooling = scope;
  }

  if (wantsMental && !opts.mentalDataPolicy && !opts.yes) {
    const data = await p.select({
      message: "How should `.mental/` data be handled in git?",
      options: [
        {
          value: "global-exclude",
          label: "Private on this machine (recommended)",
          hint: describeDataPolicy("global-exclude"),
        },
        {
          value: "clone-exclude",
          label: "Private in this clone",
          hint: describeDataPolicy("clone-exclude"),
        },
        {
          value: "repo-gitignore",
          label: "Private via repo .gitignore",
          hint: describeDataPolicy("repo-gitignore"),
        },
        {
          value: "tracked",
          label: "Shared / tracked (no privacy)",
          hint: describeDataPolicy("tracked"),
        },
      ],
    });
    if (p.isCancel(data)) {
      p.cancel("Cancelled.");
      return 1;
    }
    mentalDataPolicy = data;
  }

  if (wantsMental) {
    ruleNames = [...new Set([...ruleNames, "mental"])];
  }

  const plan = buildInstallPlan({
    ruleNames,
    skillNames,
    allRules,
    agents: agentIds,
    mentalTooling,
    mentalDataPolicy,
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
