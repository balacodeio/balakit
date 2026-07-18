/**
 * `balakit init` — guided setup, or non-interactive with flags + -y.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, TEAM_INIT_RULES } from "../lib/pkg.mjs";
import { loadRules } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import { cmdInteractive } from "./interactive.mjs";
import {
  DEFAULT_MENTAL_TOOLING,
  DEFAULT_MENTAL_DATA_POLICY,
} from "../lib/mental-policy.mjs";

/**
 * @param {{
 *   personal?: boolean,
 *   withPersonal?: boolean,
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   mentalTooling?: string,
 *   mentalDataPolicy?: string,
 * }} opts
 */
export async function cmdInit(opts = {}) {
  // Interactive / guided when not fully non-interactive
  if (!opts.yes && !opts.dryRun) {
    return cmdInteractive(opts);
  }

  const allRules = loadRules();
  const personalOnly = opts.personal && !opts.withPersonal;
  const withPersonal = opts.withPersonal || opts.personal;

  p.intro(
    `${CMD} v${VERSION} — init${personalOnly ? " (personal)" : withPersonal ? " (team + personal)" : " (team)"}${opts.dryRun ? "  [dry-run]" : ""}`,
  );

  let ruleNames = [];
  if (!personalOnly) {
    ruleNames = TEAM_INIT_RULES.filter((n) => allRules.some((r) => r.name === n));
  }
  if (withPersonal || personalOnly) {
    ruleNames = [...new Set([...ruleNames, "mental"])];
  }

  const plan = buildInstallPlan({
    ruleNames,
    skillNames: [],
    allRules,
    agents: opts.agents,
    mentalTooling: opts.mentalTooling ?? DEFAULT_MENTAL_TOOLING,
    mentalDataPolicy: opts.mentalDataPolicy ?? DEFAULT_MENTAL_DATA_POLICY,
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
