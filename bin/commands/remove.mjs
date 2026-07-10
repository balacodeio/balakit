/**
 * `balakit remove <names...>` — remove owned kit pieces.
 * Removing mental leaves the global git exclude in place (other repos may have data).
 */
import * as p from "@clack/prompts";
import { CMD, VERSION, PERSONAL_RULES } from "../lib/pkg.mjs";
import { loadRules, loadSkills } from "../lib/catalog.mjs";
import {
  removeTeamRules,
  removePersonalRules,
  partitionRules,
} from "../lib/rules-install.mjs";
import { skillsRemoveCommand, runSkillsCmd } from "../lib/skills-bridge.mjs";
import {
  readManifest,
  recordRemove,
  projectManifestPath,
  globalManifestPath,
} from "../lib/manifest.mjs";

/**
 * @param {{ names: string[], dryRun?: boolean, yes?: boolean }} opts
 */
export async function cmdRemove(opts) {
  const allRules = loadRules();
  const allSkills = loadSkills();
  const ruleSet = new Set(allRules.map((r) => r.name));
  const skillSet = new Set(allSkills.map((s) => s.name));

  if (!opts.names?.length) {
    console.error("Usage: balakit remove <rule-or-skill>...");
    return 1;
  }

  const ruleNames = [];
  const skillNames = [];
  for (const n of opts.names) {
    if (ruleSet.has(n)) ruleNames.push(n);
    else if (skillSet.has(n)) skillNames.push(n);
    else {
      console.error(`Unknown name: ${n}`);
      return 1;
    }
  }

  p.intro(`${CMD} v${VERSION} — remove${opts.dryRun ? "  [dry-run]" : ""}`);

  const selected = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selected);

  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());

  const remainingTeam = allRules.filter(
    (r) => proj.rules.includes(r.name) && !ruleNames.includes(r.name) && !PERSONAL_RULES.includes(r.name),
  );
  const remainingPersonal = allRules.filter(
    (r) => glob.rules.includes(r.name) && !ruleNames.includes(r.name) && PERSONAL_RULES.includes(r.name),
  );

  const lines = [];
  if (team.length) lines.push(`Team rules: ${team.map((r) => r.name).join(", ")}`);
  if (personal.length) lines.push(`Personal rules: ${personal.map((r) => r.name).join(", ")}`);
  if (skillNames.length) lines.push(`Skills: ${skillNames.join(", ")}`);
  if (personal.length || skillNames.includes("mental")) {
    lines.push("(global .mental/ exclude is kept — other repos may still use it)");
  }
  p.note(lines.join("\n") || "Nothing to remove", "Remove");

  if (!opts.yes && !opts.dryRun) {
    const go = await p.confirm({ message: "Remove now?" });
    if (p.isCancel(go) || !go) {
      p.cancel("Cancelled.");
      return 1;
    }
  }

  if (team.length) {
    const r = removeTeamRules(team, remainingTeam, { dryRun: opts.dryRun });
    if (r.removed.length) p.note(r.removed.join("\n"), opts.dryRun ? "Would remove" : "Removed");
    if (r.written.length) p.note(r.written.join("\n"), opts.dryRun ? "Would rewrite" : "Rewrote");
    if (!opts.dryRun) recordRemove("project", { rules: team.map((x) => x.name) });
  }

  if (personal.length) {
    const r = removePersonalRules(personal, remainingPersonal, { dryRun: opts.dryRun });
    if (r.removed.length) p.note(r.removed.join("\n"), opts.dryRun ? "Would remove" : "Removed");
    if (r.written.length) p.note(r.written.join("\n"), opts.dryRun ? "Would rewrite" : "Rewrote");
    if (!opts.dryRun) recordRemove("global", { rules: personal.map((x) => x.name) });
  }

  const mentalSkills = skillNames.filter((s) => s === "mental");
  const otherSkills = skillNames.filter((s) => s !== "mental");

  const removeSkills = (names, scope) => {
    if (!names.length) return;
    const cmd = skillsRemoveCommand(names, scope);
    if (opts.dryRun) {
      p.log.step(`Would remove skills:\n${cmd}`);
    } else {
      p.log.step(`Removing skills via skills.sh:\n${cmd}`);
      const result = runSkillsCmd(cmd);
      if (!result.ok) {
        p.log.warn("skills.sh remove did not complete. Try manually:");
        p.log.message(cmd);
      } else {
        recordRemove(scope, { skills: names });
      }
    }
  };

  removeSkills(otherSkills, "project");
  removeSkills(mentalSkills, "global");

  p.outro(opts.dryRun ? "Dry-run complete." : "Done.");
  return 0;
}
