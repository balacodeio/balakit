/**
 * Interactive default: presets (team / personal / both) or cherry-pick.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES, SKILL_BUNDLED_BY } from "../lib/pkg.mjs";
import { loadRules, loadSkills, trunc } from "../lib/catalog.mjs";
import { planSelection, runInstall } from "../lib/install.mjs";

/**
 * @param {{ agents?: string[], dryRun?: boolean, yes?: boolean }} opts
 */
export async function cmdInteractive(opts = {}) {
  const allRules = loadRules();
  const allSkills = loadSkills();

  p.intro(`${CMD} v${VERSION} — rules & skills kit${opts.dryRun ? "  [dry-run]" : ""}`);

  const mode = await p.select({
    message: "What do you want to install?",
    options: [
      {
        value: "team",
        label: "Team kit",
        hint: `${TEAM_INIT_RULES.join(", ")} → this project`,
      },
      {
        value: "personal",
        label: "Personal layer",
        hint: "mental rule + skill (global) + .mental/ git exclude",
      },
      {
        value: "both",
        label: "Team kit + personal layer",
        hint: "project rules + global mental",
      },
      {
        value: "cherry",
        label: "Cherry-pick",
        hint: "choose individual rules and skills",
      },
    ],
  });
  if (p.isCancel(mode)) {
    p.cancel("Cancelled.");
    return 1;
  }

  let ruleNames = [];
  let skillNames = [];

  if (mode === "team" || mode === "both") {
    ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  }
  if (mode === "personal" || mode === "both") {
    ruleNames = [...new Set([...ruleNames, "mental"])];
  }
  if (mode === "cherry") {
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

  const plan = planSelection(ruleNames, skillNames, allRules);
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

  const result = await runInstall({
    ...plan,
    agents: opts.agents,
    dryRun: opts.dryRun,
    yes: opts.yes,
  });
  if (result?.cancelled) return 1;

  p.outro(
    opts.dryRun
      ? "Dry-run complete — nothing written."
      : `Done. Update anytime: npx ${CMD} update`,
  );
  return 0;
}
