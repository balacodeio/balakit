/**
 * Delegate skill install/remove/update to skills.sh (vercel-labs/skills).
 * Balakit does not own per-agent skill path maps.
 */
import { spawnSync } from "node:child_process";
import { REPO } from "./pkg.mjs";
import { getCapability } from "./agents.mjs";

/**
 * Build an `npx skills add` command.
 * @param {string[]} skillNames
 * @param {string[]} agentIds balakit agent ids
 * @param {"project"|"global"} scope
 */
export function skillsAddCommand(skillNames, agentIds, scope) {
  const ids = agentIds
    .map((a) => getCapability(a)?.skillsShId)
    .filter(Boolean);
  return [
    "npx -y skills add",
    REPO,
    ...skillNames.map((s) => `-s ${s}`),
    ...ids.map((a) => `-a ${a}`),
    scope === "global" ? "-g" : "",
    "-y",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build an `npx skills remove` command.
 * @param {string[]} skillNames
 * @param {"project"|"global"} scope
 */
export function skillsRemoveCommand(skillNames, scope) {
  return [
    "npx -y skills remove",
    ...skillNames,
    scope === "global" ? "-g" : "",
    "-y",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build an `npx skills update` command.
 * @param {string[]} [skillNames]
 * @param {"project"|"global"} scope
 */
export function skillsUpdateCommand(skillNames, scope) {
  return [
    "npx -y skills update",
    ...(skillNames?.length ? skillNames : []),
    scope === "global" ? "-g" : "-p",
    "-y",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Run a shell command with inherited stdio.
 * @returns {{ ok: boolean, cmd: string }}
 */
export function runSkillsCmd(cmd, { dryRun = false } = {}) {
  if (dryRun) return { ok: true, cmd };
  const result = spawnSync(cmd, { stdio: "inherit", shell: true });
  return { ok: result.status === 0, cmd };
}

/** Alias kept for tests / older imports. */
export const skillsCommand = skillsAddCommand;
