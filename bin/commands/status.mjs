/**
 * `balakit list` / `balakit status` / `balakit update` / `balakit doctor`.
 */
import * as p from "@clack/prompts";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { printList } from "../lib/args.mjs";
import { runDoctor, checkMentalExcluded } from "../lib/mental-exclude.mjs";
import {
  readManifest,
  projectManifestPath,
  globalManifestPath,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { join } from "node:path";
import { loadRules } from "../lib/catalog.mjs";
import { planSelection, runInstall } from "../lib/install.mjs";
import { skillsUpdateCommand, runSkillsCmd } from "../lib/skills-bridge.mjs";
import { detectAgents } from "../lib/agents.mjs";

export function cmdList() {
  printList();
  return 0;
}

export function cmdDoctor() {
  return runDoctor();
}

export function cmdStatus() {
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();

  console.log(`${CMD} v${VERSION} — status\n`);

  console.log("Project (.balakit/installed.json):");
  if (!proj.rules.length && !proj.skills.length) {
    console.log("  (nothing recorded)");
  } else {
    if (proj.rules.length) console.log(`  rules:  ${proj.rules.join(", ")}`);
    if (proj.skills.length) console.log(`  skills: ${proj.skills.join(", ")}`);
    if (proj.updatedAt) console.log(`  updated: ${proj.updatedAt} (kit ${proj.version || "?"})`);
  }

  const agentsMd = join(cwd, "AGENTS.md");
  const claudeMd = join(cwd, "CLAUDE.md");
  console.log("\nManaged blocks:");
  console.log(`  AGENTS.md  ${hasManagedBlock(agentsMd) ? "✓ balakit block" : "· none"}`);
  console.log(`  CLAUDE.md  ${hasManagedBlock(claudeMd) ? "✓ balakit block" : "· none"}`);

  console.log("\nPersonal (~/.balakit/installed.json):");
  if (!glob.rules.length && !glob.skills.length) {
    console.log("  (nothing recorded)");
  } else {
    if (glob.rules.length) console.log(`  rules:  ${glob.rules.join(", ")}`);
    if (glob.skills.length) console.log(`  skills: ${glob.skills.join(", ")}`);
    if (glob.updatedAt) console.log(`  updated: ${glob.updatedAt} (kit ${glob.version || "?"})`);
  }

  const ex = checkMentalExcluded();
  console.log("\n.mental/ git exclude:");
  if (ex.reason === "git-unavailable") {
    console.log("  ✖ git not available");
  } else {
    console.log(`  ${ex.hasLine ? "✓" : "✖"} ${ex.file}`);
    if (ex.liveIgnored === true) console.log("  ✓ check-ignore confirms ignore in this repo");
    else if (ex.liveIgnored === false) console.log("  ✖ check-ignore says NOT ignored here");
  }

  console.log(`\nDetected agents: ${detectAgents().join(", ")}`);
  return 0;
}

/**
 * Re-install everything recorded in manifests (rules via balakit, skills via skills.sh update).
 * @param {{ dryRun?: boolean, yes?: boolean, agents?: string[] }} opts
 */
export async function cmdUpdate(opts = {}) {
  const allRules = loadRules();
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());

  const ruleNames = [...new Set([...proj.rules, ...glob.rules])];
  const skillNames = [...new Set([...proj.skills, ...glob.skills])];

  p.intro(`${CMD} v${VERSION} — update${opts.dryRun ? "  [dry-run]" : ""}`);

  if (!ruleNames.length && !skillNames.length) {
    p.log.warn("Nothing recorded in manifests. Run `balakit init` or `balakit add` first.");
    p.outro("Nothing to update.");
    return 0;
  }

  if (ruleNames.length) {
    const plan = planSelection(ruleNames, [], allRules);
    const result = await runInstall({
      ...plan,
      skills: [], // skills updated separately via skills.sh update
      agents: opts.agents,
      dryRun: opts.dryRun,
      yes: opts.yes,
    });
    if (result?.cancelled) return 1;
  }

  const projectSkills = proj.skills.filter((s) => s !== "mental");
  const globalSkills = [
    ...glob.skills,
    ...proj.skills.filter((s) => s === "mental"),
  ];

  const upd = (names, scope) => {
    if (!names.length) return;
    const cmd = skillsUpdateCommand(names, scope);
    if (opts.dryRun) {
      p.log.step(`Would update skills:\n${cmd}`);
    } else {
      p.log.step(`Updating skills via skills.sh:\n${cmd}`);
      const result = runSkillsCmd(cmd);
      if (!result.ok) {
        p.log.warn("skills.sh update did not complete. Try manually:");
        p.log.message(cmd);
      }
    }
  };

  upd(projectSkills, "project");
  upd([...new Set(globalSkills)], "global");

  p.outro(opts.dryRun ? "Dry-run complete." : "Updated.");
  return 0;
}
