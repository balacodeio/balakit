/**
 * `balakit add <names...>` — add rules and/or skills by name.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import {
  DEFAULT_MENTAL_TOOLING,
  DEFAULT_MENTAL_DATA_POLICY,
} from "../lib/mental-policy.mjs";
import { resolveMentalPolicy } from "../lib/manifest.mjs";

/**
 * @param {{
 *   names: string[],
 *   agents?: string[],
 *   dryRun?: boolean,
 *   yes?: boolean,
 *   mentalTooling?: string,
 *   mentalDataPolicy?: string,
 * }} opts
 */
export async function cmdAdd(opts) {
  const allRules = loadRules();
  const allSkills = loadSkills();
  const ruleSet = new Set(allRules.map((r) => r.name));
  const skillSet = new Set(allSkills.map((s) => s.name));

  if (!opts.names?.length) {
    console.error("Usage: balakit add <rule-or-skill>...");
    return 1;
  }

  const ruleNames = [];
  const skillNames = [];
  for (const n of opts.names) {
    if (ruleSet.has(n)) ruleNames.push(n);
    else if (skillSet.has(n)) skillNames.push(n);
    else {
      console.error(`Unknown name: ${n} — see \`balakit list\``);
      return 1;
    }
  }

  const existing = resolveMentalPolicy();
  const wantsMental =
    ruleNames.includes("mental") || skillNames.includes("mental");
  const mentalTooling =
    opts.mentalTooling ??
    (existing.hasMental ? existing.tooling : DEFAULT_MENTAL_TOOLING);
  const mentalDataPolicy =
    opts.mentalDataPolicy ??
    (existing.hasMental || wantsMental ? existing.dataPolicy || DEFAULT_MENTAL_DATA_POLICY : DEFAULT_MENTAL_DATA_POLICY);

  p.intro(`${CMD} v${VERSION} — add${opts.dryRun ? "  [dry-run]" : ""}`);

  const plan = buildInstallPlan({
    ruleNames,
    skillNames,
    allRules,
    agents: opts.agents,
    mentalTooling: wantsMental || existing.hasMental ? mentalTooling : DEFAULT_MENTAL_TOOLING,
    mentalDataPolicy,
    reconcile: true,
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
  p.outro(opts.dryRun ? "Dry-run complete." : `Done. Update: npx ${CMD} update`);
  return 0;
}
