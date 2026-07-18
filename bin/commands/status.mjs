/**
 * `balakit list` / `balakit status` / `balakit update` / `balakit doctor`.
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { printList } from "../lib/args.mjs";
import { checkMentalExcluded } from "../lib/mental-exclude.mjs";
import {
  readManifest,
  projectManifestPath,
  globalManifestPath,
  resolveMentalPolicy,
  isCorruptManifest,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { loadRules } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import { skillsUpdateCommand, runSkillsCmd } from "../lib/skills-bridge.mjs";
import { detectAgents, formatCapabilityMatrix } from "../lib/agents.mjs";
import {
  checkDataPolicy,
  runPolicyDoctor,
  describeDataPolicy,
  describeToolingScope,
  DEFAULT_MENTAL_DATA_POLICY,
} from "../lib/mental-policy.mjs";

export function cmdList() {
  printList();
  return 0;
}

/**
 * @param {{ liftIgnore?: boolean, yes?: boolean, dryRun?: boolean }} [opts]
 */
export async function cmdDoctor(opts = {}) {
  const { dataPolicy, hasMental } = resolveMentalPolicy();
  const policy = hasMental ? dataPolicy : DEFAULT_MENTAL_DATA_POLICY;
  return runPolicyDoctor(policy, {
    liftIgnore: opts.liftIgnore,
    yes: opts.yes,
    dryRun: opts.dryRun,
  });
}

export function cmdStatus() {
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();
  const policy = resolveMentalPolicy();

  console.log(`${CMD} v${VERSION} — status\n`);

  console.log("Project (.balakit/installed.json):");
  if (isCorruptManifest(proj)) {
    console.log("  ✖ CORRUPT — treated as empty; fix or delete the file");
  } else if (!proj.rules.length && !proj.skills.length) {
    console.log("  (nothing recorded)");
  } else {
    if (proj.rules.length) console.log(`  rules:  ${proj.rules.join(", ")}`);
    if (proj.skills.length) console.log(`  skills: ${proj.skills.join(", ")}`);
    if (proj.agents?.length) console.log(`  agents: ${proj.agents.join(", ")}`);
    if (proj.surfaces?.length) console.log(`  surfaces: ${proj.surfaces.join(", ")}`);
    if (proj.updatedAt) console.log(`  updated: ${proj.updatedAt} (kit ${proj.version || "?"})`);
  }

  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");
  const liveAgents = hasManagedBlock(agentsMd);
  const liveClaude = hasManagedBlock(claudeMd);
  console.log("\nManaged blocks:");
  console.log(`  AGENTS.md  ${liveAgents ? "✓ balakit block" : "· none"}`);
  console.log(`  CLAUDE.md  ${liveClaude ? "✓ balakit block" : "· none"}`);

  const teamRules = proj.rules.filter((n) => n !== "mental" || policy.tooling === "project");
  if ((liveAgents || liveClaude) && !teamRules.length && !proj.rules.length) {
    console.log("  ⚠ drift: live managed block but empty project manifest");
  }
  if (teamRules.length && !liveAgents && !liveClaude) {
    console.log("  ⚠ drift: project manifest lists rules but no managed block");
  }

  console.log("\nPersonal (~/.balakit/installed.json):");
  if (isCorruptManifest(glob)) {
    console.log("  ✖ CORRUPT — treated as empty");
  } else if (!glob.rules.length && !glob.skills.length) {
    console.log("  (nothing recorded)");
  } else {
    if (glob.rules.length) console.log(`  rules:  ${glob.rules.join(", ")}`);
    if (glob.skills.length) console.log(`  skills: ${glob.skills.join(", ")}`);
    if (glob.updatedAt) console.log(`  updated: ${glob.updatedAt} (kit ${glob.version || "?"})`);
  }

  console.log("\nMental policy:");
  if (!policy.hasMental) {
    console.log("  (Mental not recorded — doctor defaults to global-exclude)");
  } else {
    console.log(`  tooling: ${policy.tooling} — ${describeToolingScope(policy.tooling)}`);
    console.log(`  data:    ${policy.dataPolicy} — ${describeDataPolicy(policy.dataPolicy)}`);
    const check = checkDataPolicy(policy.dataPolicy);
    console.log(`  health:  ${check.ok ? "✓" : "✖"} ${check.message || ""}`);
  }

  const ex = checkMentalExcluded();
  console.log("\nGlobal exclude line (machine-wide):");
  if (ex.reason === "git-unavailable") {
    console.log("  ✖ git not available");
  } else {
    console.log(`  ${ex.hasLine ? "✓" : "·"} ${ex.file}`);
    if (ex.liveIgnored === true) console.log("  ✓ check-ignore confirms ignore in this repo");
    else if (ex.liveIgnored === false) console.log("  · check-ignore says NOT ignored here");
  }

  console.log("\nCapability matrix (* = detected):");
  console.log(`  ${formatCapabilityMatrix(detectAgents()).join("\n  ")}`);
  return 0;
}

/**
 * Re-install everything recorded in manifests.
 * @param {{ dryRun?: boolean, yes?: boolean, agents?: string[] }} opts
 */
export async function cmdUpdate(opts = {}) {
  const allRules = loadRules();
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const policy = resolveMentalPolicy();

  const ruleNames = [...new Set([...proj.rules, ...glob.rules])];
  const skillNames = [...new Set([...proj.skills, ...glob.skills])];

  p.intro(`${CMD} v${VERSION} — update${opts.dryRun ? "  [dry-run]" : ""}`);

  if (!ruleNames.length && !skillNames.length) {
    p.log.warn("Nothing recorded in manifests. Run `balakit init` or `balakit add` first.");
    p.outro("Nothing to update.");
    return 0;
  }

  let failed = false;

  if (ruleNames.length) {
    const plan = buildInstallPlan({
      ruleNames,
      skillNames: [],
      allRules,
      agents: opts.agents ?? proj.agents ?? glob.agents,
      mentalTooling: policy.tooling,
      mentalDataPolicy: policy.dataPolicy,
      reconcile: true,
    });
    plan.skills = []; // skills updated separately
    const result = await runInstallPlan(plan, {
      dryRun: opts.dryRun,
      yes: opts.yes,
    });
    if (result?.cancelled) return 1;
    if (!result?.ok) failed = true;
  }

  const projectSkills = proj.skills.filter((s) => s !== "mental");
  const mentalOnProject = policy.tooling === "project";
  const globalSkills = [
    ...glob.skills,
    ...(mentalOnProject ? [] : proj.skills.filter((s) => s === "mental")),
  ];
  const projectMental = mentalOnProject
    ? [...proj.skills.filter((s) => s === "mental"), ...glob.skills.filter((s) => s === "mental")]
    : [];

  const upd = (names, scope) => {
    if (!names.length) return;
    const cmd = skillsUpdateCommand([...new Set(names)], scope);
    if (opts.dryRun) {
      p.log.step(`Would update skills:\n${cmd}`);
    } else {
      p.log.step(`Updating skills via skills.sh:\n${cmd}`);
      const result = runSkillsCmd(cmd);
      if (!result.ok) {
        p.log.error("skills.sh update did not complete. Try manually:");
        p.log.message(cmd);
        failed = true;
      }
    }
  };

  upd(projectSkills, "project");
  upd(projectMental, "project");
  upd([...new Set(globalSkills)], "global");

  p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors." : "Updated.");
  return failed ? 1 : 0;
}
