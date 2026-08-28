#!/usr/bin/env node
/**
 * balakit — opinionated rules & skills kit installer.
 *
 * Rules install AGENTS.md-first (project). Skills are delegated to skills.sh.
 */
import { VERSION } from "./lib/pkg.mjs";
import { isCliEntry } from "./lib/entry.mjs";
import { parseArgv, usage } from "./lib/args.mjs";
import { cmdInit } from "./commands/init.mjs";
import { cmdAdd } from "./commands/add.mjs";
import { cmdRemove } from "./commands/remove.mjs";
import { cmdList, cmdStatus, cmdUpdate, cmdDoctor } from "./commands/status.mjs";
import { cmdInteractive } from "./commands/interactive.mjs";

export { renderRulesBlock, renderRepoStandingDocs, mergeManaged, removeManaged, demote } from "./lib/render.mjs";
export { parseRule, skillDescription, bundledSkillsFor, loadRules, loadSkills } from "./lib/catalog.mjs";
export {
  skillsCommand,
  skillsAddCommand,
  skillsRemoveCommand,
  resolveSkillsShTargets,
  SKILLS_SH_VERIFIED_IDS,
} from "./lib/skills-bridge.mjs";
export { installTeamRules, installPersonalRules, installUserRules, partitionRules } from "./lib/rules-install.mjs";
export {
  detectAgents,
  AGENTS,
  formatCapabilityMatrix,
  getCapability,
  DEFAULT_AGENT_IDS,
} from "./lib/agents.mjs";
export {
  RULE_BUNDLED_SKILLS,
  PERSONAL_RULES,
  TEAM_INIT_RULES,
  RULE_ALIASES,
  canonicalizeRuleName,
  canonicalizeRuleNames,
  NAME,
  CMD,
  REPO,
  MANIFEST_SCHEMA,
  BEGIN,
  END,
} from "./lib/pkg.mjs";
export { parseArgv } from "./lib/args.mjs";
export {
  readManifest,
  recordInstall,
  recordRemove,
  projectManifestPath,
  globalManifestPath,
  migrateManifest,
} from "./lib/manifest.mjs";
export { buildInstallPlan, runInstallPlan, planSelection } from "./lib/install.mjs";
export { MENTAL_MOVED, MENTAL_REPO } from "./lib/mental-moved.mjs";

async function main() {
  let args;
  try {
    args = parseArgv(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    if (!String(e.message).includes("Mental has moved")) {
      console.log("\n" + usage());
    }
    process.exit(1);
  }

  const common = {
    agents: args.agents,
    dryRun: args.dryRun,
    yes: args.yes,
    scope: args.scope,
  };

  let code = 0;
  switch (args.command) {
    case "help":
      console.log(usage());
      break;
    case "version":
      console.log(VERSION);
      break;
    case "list":
      code = cmdList();
      break;
    case "doctor":
      code = cmdDoctor();
      break;
    case "status":
      code = cmdStatus();
      break;
    case "init":
      code = await cmdInit(common);
      break;
    case "add":
      code = await cmdAdd({ ...common, names: args.names });
      break;
    case "remove":
      code = await cmdRemove({ ...common, names: args.names });
      break;
    case "update":
      code = await cmdUpdate({ dryRun: args.dryRun, yes: args.yes, agents: args.agents, scope: args.scope });
      break;
    case null:
      code = await cmdInteractive(common);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      console.log("\n" + usage());
      code = 1;
  }
  process.exit(code);
}

if (isCliEntry(import.meta.url)) {
  main();
}
