#!/usr/bin/env node
/**
 * balakit — opinionated rules & skills kit installer.
 *
 * Rules install AGENTS.md-first (project) or to user config (personal/mental).
 * Skills are delegated to skills.sh. Mental always enables the machine-wide
 * `.mental/` git exclude (never a repo `.gitignore`).
 */
import { pathToFileURL } from "node:url";
import { VERSION } from "./lib/pkg.mjs";
import { parseArgv, usage } from "./lib/args.mjs";
import { cmdInit } from "./commands/init.mjs";
import { cmdAdd } from "./commands/add.mjs";
import { cmdRemove } from "./commands/remove.mjs";
import { cmdList, cmdStatus, cmdUpdate, cmdDoctor } from "./commands/status.mjs";
import { cmdInteractive } from "./commands/interactive.mjs";

// Re-exports for tests
export {
  ensureMentalExcluded,
  checkMentalExcluded,
  resolveGlobalExcludesFile,
  defaultExcludesFile,
  expandHome,
  runDoctor,
} from "./lib/mental-exclude.mjs";
export { renderRulesBlock, renderRepoStandingDocs, mergeManaged, removeManaged, demote } from "./lib/render.mjs";
export { parseRule, skillDescription, bundledSkillsFor, loadRules, loadSkills } from "./lib/catalog.mjs";
export { skillsCommand, skillsAddCommand, skillsRemoveCommand } from "./lib/skills-bridge.mjs";
export { installTeamRules, installPersonalRules, partitionRules } from "./lib/rules-install.mjs";
export { detectAgents, AGENTS } from "./lib/agents.mjs";
export { RULE_BUNDLED_SKILLS, PERSONAL_RULES, TEAM_INIT_RULES, NAME, CMD, REPO } from "./lib/pkg.mjs";
export { parseArgv } from "./lib/args.mjs";
export {
  readManifest,
  recordInstall,
  recordRemove,
  projectManifestPath,
  globalManifestPath,
} from "./lib/manifest.mjs";

async function main() {
  let args;
  try {
    args = parseArgv(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    console.log("\n" + usage());
    process.exit(1);
  }

  const common = {
    agents: args.agents,
    dryRun: args.dryRun,
    yes: args.yes,
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
      code = await cmdInit({
        ...common,
        personal: args.personal,
        withPersonal: args.withPersonal,
      });
      break;
    case "add":
      code = await cmdAdd({ ...common, names: args.names });
      break;
    case "remove":
      code = await cmdRemove({ ...common, names: args.names });
      break;
    case "update":
      code = await cmdUpdate(common);
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
