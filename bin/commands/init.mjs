/**
 * `balakit init` — guided setup, or non-interactive with flags + -y.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES } from "../lib/pkg.mjs";
import { loadRules } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import { cmdInteractive } from "./interactive.mjs";

/**
 * @param {{
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   scope?: "project"|"user",
 * }} opts
 */
export async function cmdInit(opts = {}) {
  if (!opts.yes && !opts.dryRun) {
    return cmdInteractive(opts);
  }

  const allRules = loadRules();

  p.intro(`${CMD} v${VERSION} — init (team)${opts.dryRun ? "  [dry-run]" : ""}`);

  const ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));

  const plan = buildInstallPlan({
    ruleNames,
    skillNames: [],
    allRules,
    agents: opts.agents,
    scope: opts.scope,
  });

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
