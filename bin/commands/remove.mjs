/**
 * `balakit remove <names...>` — remove owned kit pieces.
 * Never deletes `.mental/` journals (Mental data is owned by the Mental CLI).
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
import { CMD, VERSION, PERSONAL_RULES, canonicalizeRuleName } from "../lib/pkg.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import {
  removeTeamRules,
  removeUserRules,
  partitionRules,
} from "../lib/rules-install.mjs";
import { skillsRemoveCommand, runSkillsCmd } from "../lib/skills-bridge.mjs";
import {
  readManifest,
  recordRemove,
  projectManifestPath,
  globalManifestPath,
  isCorruptManifest,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";
import { unlinkCursorProjectSkills } from "../lib/cursor-native.mjs";

/**
 * @param {{ names: string[], dryRun?: boolean, yes?: boolean, scope?: "project"|"user" }} opts
 */
export async function cmdRemove(opts) {
  const allRules = loadRules();
  const allSkills = loadSkills();
  const ruleSet = new Set(allRules.map((r) => r.name));
  const skillSet = new Set(allSkills.map((s) => s.name));
  const scope = opts.scope === "user" ? "user" : "project";

  if (!opts.names?.length) {
    console.error("Usage: balakit remove <rule-or-skill>...");
    return 1;
  }

  const ruleNames = [];
  const skillNames = [];
  for (const n of opts.names) {
    const rule = canonicalizeRuleName(n);
    if (ruleSet.has(rule)) ruleNames.push(rule);
    else if (skillSet.has(n)) skillNames.push(n);
    else {
      console.error(`Unknown name: ${n}`);
      return 1;
    }
  }

  p.intro(`${CMD} v${VERSION} — remove (${scope})${opts.dryRun ? "  [dry-run]" : ""}`);

  const selected = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selected);
  const userRules = scope === "user" ? selected : personal;
  const projectRules = scope === "user" ? [] : team;

  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();

  const liveTeamBlock =
    hasManagedBlock(join(cwd, "AGENTS.md")) || hasManagedBlock(join(cwd, "CLAUDE.md"));

  const remainingTeam = allRules.filter(
    (r) =>
      proj.rules.includes(r.name) &&
      !ruleNames.includes(r.name) &&
      !PERSONAL_RULES.includes(r.name),
  );

  if (projectRules.length && remainingTeam.length === 0 && liveTeamBlock) {
    const manifestKnowsTeam = projectRules.every((r) => proj.rules.includes(r.name));
    if (isCorruptManifest(proj) || !proj.rules.length || !manifestKnowsTeam) {
      p.log.error(
        "Refusing to wipe AGENTS.md/CLAUDE.md managed blocks: manifest is missing, corrupt, or out of sync with live files.\n" +
          "Fix with `balakit status`, restore `.balakit/installed.json`, or remove the managed block markers by hand.",
      );
      p.outro("Aborted.");
      return 1;
    }
  }
  const remainingUser = allRules.filter(
    (r) => glob.rules.includes(r.name) && !ruleNames.includes(r.name),
  );

  const lines = [];
  lines.push(`Scope: ${scope}`);
  if (projectRules.length) lines.push(`Project rules: ${projectRules.map((r) => r.name).join(", ")}`);
  if (userRules.length) lines.push(`User-wide rules: ${userRules.map((r) => r.name).join(", ")}`);
  if (skillNames.length) lines.push(`Skills: ${skillNames.join(", ")}`);
  p.note(lines.join("\n") || "Nothing to remove", "Remove");

  if (!opts.yes && !opts.dryRun) {
    const go = await p.confirm({ message: "Remove now?" });
    if (p.isCancel(go) || !go) {
      p.cancel("Cancelled.");
      return 1;
    }
  }

  let failed = false;

  if (projectRules.length) {
    const r = removeTeamRules(projectRules, remainingTeam, { dryRun: opts.dryRun });
    if (r.removed.length) p.note(r.removed.join("\n"), opts.dryRun ? "Would remove" : "Removed");
    if (r.written.length) p.note(r.written.join("\n"), opts.dryRun ? "Would rewrite" : "Rewrote");
    if (!opts.dryRun) recordRemove("project", { rules: projectRules.map((x) => x.name) });
  }

  if (userRules.length) {
    const r = removeUserRules(userRules, remainingUser, { dryRun: opts.dryRun });
    if (r.removed.length) p.note(r.removed.join("\n"), opts.dryRun ? "Would remove" : "Removed");
    if (r.written.length) p.note(r.written.join("\n"), opts.dryRun ? "Would rewrite" : "Rewrote");
    if (!opts.dryRun) recordRemove("global", { rules: userRules.map((x) => x.name) });
  }

  if (skillNames.length) {
    const skillScope = scope === "user" ? "global" : "project";
    const cmd = skillsRemoveCommand(skillNames, skillScope);
    if (opts.dryRun) {
      p.log.step(`Would remove skills:\n${cmd}`);
    } else {
      p.log.step(`Removing skills via skills.sh:\n${cmd}`);
      const result = runSkillsCmd(cmd);
      if (!result.ok) {
        p.log.error("skills.sh remove did not complete. Try manually:");
        p.log.message(cmd);
        failed = true;
      } else {
        recordRemove(skillScope === "global" ? "global" : "project", { skills: skillNames });
        if (scope === "project") {
          const unlinked = unlinkCursorProjectSkills(skillNames, { dryRun: opts.dryRun });
          if (unlinked.length) p.note(unlinked.join("\n"), "Removed Cursor skill links");
        }
      }
    }
  }

  p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors." : "Done.");
  return failed ? 1 : 0;
}
