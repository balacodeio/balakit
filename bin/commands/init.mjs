/**
 * `balakit init` — team kit and/or personal layer.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES } from "../lib/pkg.mjs";
import { loadRules } from "../lib/catalog.mjs";
import { planSelection, runInstall } from "../lib/install.mjs";

/**
 * @param {{ personal?: boolean, withPersonal?: boolean, agents?: string[], dryRun?: boolean, yes?: boolean }} opts
 */
export async function cmdInit(opts = {}) {
  const allRules = loadRules();
  const personalOnly = opts.personal && !opts.withPersonal;
  const withPersonal = opts.withPersonal || opts.personal;

  p.intro(
    `${CMD} v${VERSION} — init${personalOnly ? " (personal)" : withPersonal ? " (team + personal)" : " (team)"}${opts.dryRun ? "  [dry-run]" : ""}`,
  );

  let ruleNames = [];
  let skillNames = [];

  if (!personalOnly) {
    ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  }
  if (withPersonal || personalOnly) {
    ruleNames = [...new Set([...ruleNames, "mental"])];
  }

  const plan = planSelection(ruleNames, skillNames, allRules);
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
