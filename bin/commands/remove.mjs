/**
 * `balakit remove <names...>` — remove owned kit pieces.
 * Never silently removes global excludes or `.mental/` data.
 */
import * as p from "@clack/prompts";
import { join } from "node:path";
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
  isCorruptManifest,
  resolveMentalPolicy,
} from "../lib/manifest.mjs";
import { hasManagedBlock } from "../lib/render.mjs";

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

  const policy = resolveMentalPolicy();
  const mentalTooling = policy.tooling || "user";
  const selected = allRules.filter((r) => ruleNames.includes(r.name));
  const { personal, team } = partitionRules(selected, { mentalTooling });

  const proj = readManifest(projectManifestPath());
  const glob = readManifest(globalManifestPath());
  const cwd = process.cwd();

  const liveTeamBlock =
    hasManagedBlock(join(cwd, "AGENTS.md")) || hasManagedBlock(join(cwd, "CLAUDE.md"));

  const remainingTeam = allRules.filter(
    (r) =>
      proj.rules.includes(r.name) &&
      !ruleNames.includes(r.name) &&
      (mentalTooling === "project" || !PERSONAL_RULES.includes(r.name)),
  );

  // Refuse wipe when live blocks exist but ownership ledger cannot justify it
  if (team.length && remainingTeam.length === 0 && liveTeamBlock) {
    const manifestKnowsTeam = team.every((r) => proj.rules.includes(r.name));
    if (isCorruptManifest(proj) || !proj.rules.length || !manifestKnowsTeam) {
      p.log.error(
        "Refusing to wipe AGENTS.md/CLAUDE.md managed blocks: manifest is missing, corrupt, or out of sync with live files.\n" +
          "Fix with `balakit status`, restore `.balakit/installed.json`, or remove the managed block markers by hand.",
      );
      p.outro("Aborted.");
      return 1;
    }
  }
  const remainingPersonal = allRules.filter(
    (r) =>
      glob.rules.includes(r.name) &&
      !ruleNames.includes(r.name) &&
      PERSONAL_RULES.includes(r.name),
  );

  const lines = [];
  if (team.length) lines.push(`Project rules: ${team.map((r) => r.name).join(", ")}`);
  if (personal.length) lines.push(`User-wide rules: ${personal.map((r) => r.name).join(", ")}`);
  if (skillNames.length) lines.push(`Skills: ${skillNames.join(", ")}`);
  if (personal.length || skillNames.includes("mental") || team.some((r) => r.name === "mental")) {
    lines.push(
      `(Mental data policy "${policy.dataPolicy}" is kept — excludes are never auto-removed; .mental/ data is never deleted)`,
    );
  }
  p.note(lines.join("\n") || "Nothing to remove", "Remove");

  if (!opts.yes && !opts.dryRun) {
    const go = await p.confirm({ message: "Remove now?" });
    if (p.isCancel(go) || !go) {
      p.cancel("Cancelled.");
      return 1;
    }
  }

  let failed = false;

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
  const mentalSkillScope = mentalTooling === "project" ? "project" : "global";

  const removeSkills = (names, scope) => {
    if (!names.length) return;
    const cmd = skillsRemoveCommand(names, scope);
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
        recordRemove(scope, { skills: names });
      }
    }
  };

  removeSkills(otherSkills, "project");
  removeSkills(mentalSkills, mentalSkillScope);

  p.outro(opts.dryRun ? "Dry-run complete." : failed ? "Finished with errors." : "Done.");
  return failed ? 1 : 0;
}
