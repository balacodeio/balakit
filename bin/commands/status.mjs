/**
 * `balakit list` / `balakit status` / `balakit update` / `balakit doctor`.
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { CMD, VERSION } from "../lib/pkg.mjs";
import { printList } from "../lib/args.mjs";
import {
  readManifest,
  projectManifestPath,
  globalManifestPath,
  isCorruptManifest,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { loadRules } from "../lib/catalog.mjs";
import { buildInstallPlan, runInstallPlan } from "../lib/install.mjs";
import { skillsUpdateCommand, runSkillsCmd } from "../lib/skills-bridge.mjs";
import { detectAgents, formatCapabilityMatrix } from "../lib/agents.mjs";
import { MENTAL_MOVED } from "../lib/mental-moved.mjs";
import { listCursorLocalPlugins } from "../lib/cursor-native.mjs";

export function cmdList() {
  printList();
  return 0;
}

/**
 * Mental doctor no longer lives here.
 */
export function cmdDoctor() {
  console.error(MENTAL_MOVED.trimEnd());
  return 1;
}

function mark(path) {
  return existsSync(path) ? "✓" : "·";
}

export function cmdStatus() {
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();
  const home = homedir();

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

  console.log("\nProject Cursor surfaces:");
  console.log(`  ${mark(join(cwd, ".cursor", "rules"))} .cursor/rules`);
  console.log(`  ${mark(join(cwd, ".cursor", "skills"))} .cursor/skills`);
  console.log(`  ${mark(join(cwd, ".agents", "skills"))} .agents/skills`);

  const teamRules = proj.rules.filter((n) => n !== "mental");
  if ((liveAgents || liveClaude) && !teamRules.length && !proj.rules.length) {
    console.log("  ⚠ drift: live managed block but empty project manifest");
  }
  if (teamRules.length && !liveAgents && !liveClaude) {
    console.log("  ⚠ drift: project manifest lists rules but no managed block");
  }

  console.log("\nUser-wide (~/.balakit/installed.json):");
  if (isCorruptManifest(glob)) {
    console.log("  ✖ CORRUPT — treated as empty");
  } else if (!glob.rules.length && !glob.skills.length) {
    console.log("  (nothing recorded)");
  } else {
    if (glob.rules.length) console.log(`  rules:  ${glob.rules.join(", ")}`);
    if (glob.skills.length) console.log(`  skills: ${glob.skills.join(", ")}`);
    if (glob.updatedAt) console.log(`  updated: ${glob.updatedAt} (kit ${glob.version || "?"})`);
  }

  console.log("\nHome surfaces:");
  console.log(`  ${mark(join(home, ".cursor", "rules"))} ~/.cursor/rules`);
  console.log(`  ${mark(join(home, ".cursor", "skills"))} ~/.cursor/skills`);
  const localPlugins = listCursorLocalPlugins(home);
  console.log(
    `  ${localPlugins.length ? "✓" : "·"} ~/.cursor/plugins/local${localPlugins.length ? ` (${localPlugins.join(", ")})` : ""}`,
  );
  console.log(`  ${mark(join(home, ".claude", "CLAUDE.md"))} ~/.claude/CLAUDE.md`);
  console.log(`  ${mark(join(home, ".codex", "AGENTS.md"))} ~/.codex/AGENTS.md`);
  console.log(`  ${mark(join(home, ".config", "opencode", "AGENTS.md"))} ~/.config/opencode/AGENTS.md`);

  if (proj.rules.includes("mental") || glob.rules.includes("mental") || proj.skills.includes("mental") || glob.skills.includes("mental")) {
    console.log("\nMental:");
    console.log("  recorded in a manifest, but Balakit no longer ships it.");
    console.log("  See https://github.com/afaraha8403/mental — journals were not deleted.");
  }

  console.log("\nCapability matrix (* = detected):");
  console.log(`  ${formatCapabilityMatrix(detectAgents()).join("\n  ")}`);
  return 0;
}

/**
 * Re-install everything recorded in manifests (except Mental — moved out).
 * @param {{ dryRun?: boolean, yes?: boolean, agents?: string[], scope?: "project"|"user" }} opts
 */
export async function cmdUpdate(opts = {}) {
  const allRules = loadRules();
  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const forced = opts.scope === "user" ? "user" : opts.scope === "project" ? "project" : null;

  p.intro(`${CMD} v${VERSION} — update${opts.dryRun ? "  [dry-run]" : ""}`);

  const jobs = [];
  if (!forced || forced === "project") {
    const ruleNames = proj.rules.filter((n) => n !== "mental");
    const skillNames = proj.skills.filter((s) => s !== "mental");
    if (ruleNames.length || skillNames.length) {
      jobs.push({ scope: "project", ruleNames, skillNames, agents: opts.agents ?? proj.agents });
    }
  }
  if (!forced || forced === "user") {
    const ruleNames = glob.rules.filter((n) => n !== "mental");
    const skillNames = glob.skills.filter((s) => s !== "mental");
    if (ruleNames.length || skillNames.length) {
      jobs.push({ scope: "user", ruleNames, skillNames, agents: opts.agents ?? glob.agents });
    }
  }

  if (!jobs.length) {
    p.log.warn("Nothing recorded in manifests. Run `balakit init` or `balakit add` first.");
    p.outro("Nothing to update.");
    return 0;
  }

  let failed = false;

  for (const job of jobs) {
    if (job.ruleNames.length) {
      const plan = buildInstallPlan({
        ruleNames: job.ruleNames,
        skillNames: [],
        allRules,
        agents: job.agents,
        reconcile: true,
        scope: job.scope,
      });
      plan.skills = [];
      const result = await runInstallPlan(plan, {
        dryRun: opts.dryRun,
        yes: opts.yes,
      });
      if (result?.cancelled) return 1;
      if (!result?.ok) failed = true;
    }

    if (job.skillNames.length) {
      const cmd = skillsUpdateCommand([...new Set(job.skillNames)], job.scope === "user" ? "global" : "project");
      if (opts.dryRun) {
        p.log.step(`Would update ${job.scope} skills:\n${cmd}`);
      } else {
        p.log.step(`Updating ${job.scope} skills via skills.sh:\n${cmd}`);
        const result = runSkillsCmd(cmd);
        if (!result.ok) {
          p.log.error("skills.sh update did not complete. Try manually:");
          p.log.message(cmd);
          failed = true;
        }
      }
    }
  }

  p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors." : "Updated.");
  return failed ? 1 : 0;
}
