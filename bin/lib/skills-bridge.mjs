/**
 * Delegate skill install/remove/update to skills.sh (vercel-labs/skills).
 * Balakit does not own per-agent skill path maps.
 *
 * `SKILLS_SH_VERIFIED_IDS` is the allowlist of `-a` targets confirmed against
 * vercel-labs/skills `src/agents.ts` (smoke-tested). Unknown ids are never
 * passed through to skills.sh.
 */
import { spawnSync } from "node:child_process";
import { REPO } from "./pkg.mjs";
import { getCapability } from "./agents.mjs";

/**
 * skills.sh agent names verified live against vercel-labs/skills registry.
 * Last smoke: 2026-07-18 (npx skills add … -l -a <ids>).
 * Refresh when adding a new skillsShId to the capability registry.
 */
export const SKILLS_SH_VERIFIED_IDS = Object.freeze([
  "amp",
  "claude-code",
  "cline",
  "codex",
  "continue",
  "cursor",
  "gemini-cli",
  "github-copilot",
  "junie",
  "kilo",
  "kiro-cli",
  "opencode",
  "pi",
  "roo",
  "windsurf",
  "zed",
]);

const VERIFIED = new Set(SKILLS_SH_VERIFIED_IDS);

/**
 * Map balakit agent ids → skills.sh `-a` ids that are on the verified allowlist.
 * @param {string[]} agentIds
 * @returns {{ skillsShIds: string[], skippedUnverified: string[], skippedUnsupported: string[] }}
 */
export function resolveSkillsShTargets(agentIds) {
  const skillsShIds = [];
  const skippedUnverified = [];
  const skippedUnsupported = [];
  for (const id of agentIds) {
    const cap = getCapability(id);
    const sid = cap?.skillsShId;
    if (!sid) {
      skippedUnsupported.push(id);
      continue;
    }
    if (!VERIFIED.has(sid)) {
      skippedUnverified.push(`${id}→${sid}`);
      continue;
    }
    if (!skillsShIds.includes(sid)) skillsShIds.push(sid);
  }
  return { skillsShIds, skippedUnverified, skippedUnsupported };
}

/**
 * Build an `npx skills add` command.
 * @param {string[]} skillNames
 * @param {string[]} agentIds balakit agent ids
 * @param {"project"|"global"} scope
 */
export function skillsAddCommand(skillNames, agentIds, scope) {
  const { skillsShIds } = resolveSkillsShTargets(agentIds);
  return [
    "npx -y skills add",
    REPO,
    ...skillNames.map((s) => `-s ${s}`),
    ...skillsShIds.map((a) => `-a ${a}`),
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

/**
 * Live smoke: list package skills while targeting verified agent ids.
 * Network-dependent; used by tests / optional doctor check.
 * @param {string[]} [skillsShIds]
 * @returns {{ ok: boolean, status: number|null, stderr: string }}
 */
export function smokeSkillsShAgents(skillsShIds = SKILLS_SH_VERIFIED_IDS.slice(0, 8)) {
  const cmd = [
    "npx",
    "-y",
    "skills",
    "add",
    REPO,
    "-l",
    ...skillsShIds.flatMap((a) => ["-a", a]),
    "-y",
  ];
  const result = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  return {
    ok: result.status === 0,
    status: result.status,
    stderr: (result.stderr || "") + (result.stdout || ""),
  };
}

/** Alias kept for tests / older imports. */
export const skillsCommand = skillsAddCommand;
