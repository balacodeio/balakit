/**
 * Capability registry — detection, rule surfaces, and skills.sh targets.
 *
 * "Detected" never means "fully supported." Each tool records what Balakit
 * can actually write vs what skills.sh can place.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * @typedef {"verified"|"delegated"|"optional"|"unsupported"|"unknown"} Confidence
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   skillsShId: string|null,
 *   standing: "agents-md"|"claude-md"|"none",
 *   scoped: "cursor-mdc"|"none",
 *   personal: "claude-codex-cursor"|"none"|"unknown",
 *   agentSkills: Confidence,
 *   rulesConfidence: Confidence,
 *   source: string,
 *   detect: (cwd: string, home: string) => boolean,
 * }} Capability
 */

/** @type {Capability[]} */
export const AGENTS = [
  {
    id: "cursor",
    label: "Cursor",
    skillsShId: "cursor",
    standing: "agents-md",
    scoped: "cursor-mdc",
    personal: "claude-codex-cursor",
    agentSkills: "delegated",
    rulesConfidence: "verified",
    source: "https://cursor.com/docs/context/rules",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".cursor")) || existsSync(join(home, ".cursor")),
  },
  {
    id: "claude-code",
    label: "Claude Code",
    skillsShId: "claude-code",
    standing: "claude-md",
    scoped: "none",
    personal: "claude-codex-cursor",
    agentSkills: "delegated",
    rulesConfidence: "verified",
    source: "https://code.claude.com/docs/en/memory",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".claude")) || existsSync(join(home, ".claude")),
  },
  {
    id: "codex",
    label: "Codex",
    skillsShId: "codex",
    standing: "agents-md",
    scoped: "none",
    personal: "claude-codex-cursor",
    agentSkills: "delegated",
    rulesConfidence: "verified",
    source: "https://developers.openai.com/codex/guides/agents-md",
    detect: (_cwd, home) => existsSync(join(home, ".codex")),
  },
  {
    id: "opencode",
    label: "OpenCode",
    skillsShId: "opencode",
    standing: "agents-md",
    scoped: "none",
    personal: "unknown",
    agentSkills: "delegated",
    rulesConfidence: "verified",
    source: "https://opencode.ai/docs/rules/",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".opencode")) ||
      existsSync(join(home, ".config", "opencode")),
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    skillsShId: "github-copilot",
    standing: "agents-md",
    scoped: "none",
    personal: "unknown",
    agentSkills: "delegated",
    rulesConfidence: "verified",
    source: "https://docs.github.com/en/copilot/concepts/agents/about-agent-skills",
    detect: (cwd) => existsSync(join(cwd, ".github")),
  },
  {
    id: "cline",
    label: "Cline",
    skillsShId: "cline",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://docs.cline.bot/customization/skills",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".clinerules")) ||
      existsSync(join(cwd, ".cline")) ||
      existsSync(join(home, "Documents", "Cline")) ||
      existsSync(join(home, ".cline")),
  },
  {
    id: "kilocode",
    label: "Kilo Code",
    skillsShId: "kilo",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://kilo.ai/docs/customize/skills",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".kilocode")) ||
      existsSync(join(cwd, ".kilo")) ||
      existsSync(join(home, ".kilocode")) ||
      existsSync(join(home, ".kilo")),
  },
  {
    id: "omp",
    label: "pi / omp",
    skillsShId: "pi",
    standing: "agents-md",
    scoped: "none",
    personal: "unknown",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://github.com/badlogic/pi-mono",
    detect: (_cwd, home) =>
      existsSync(join(home, ".omp")) || existsSync(join(home, ".pi")),
  },
  {
    id: "windsurf",
    label: "Windsurf / Cascade",
    skillsShId: "windsurf",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://docs.devin.ai/desktop/cascade/agents-md",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".windsurf")) ||
      existsSync(join(home, ".codeium", "windsurf")),
  },
  {
    id: "roo",
    label: "Roo Code",
    skillsShId: "roo",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://docs.roocode.com/features/skills",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".roo")) || existsSync(join(home, ".roo")),
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    skillsShId: "gemini-cli",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://geminicli.com/docs/cli/gemini-md/",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".gemini")) || existsSync(join(home, ".gemini")),
  },
  {
    id: "zed",
    label: "Zed",
    skillsShId: "zed",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://zed.dev/docs/ai/instructions.html",
    detect: (_cwd, home) =>
      existsSync(join(home, ".config", "zed")) || existsSync(join(home, ".zed")),
  },
  {
    id: "amp",
    label: "Amp",
    skillsShId: "amp",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "optional",
    source: "https://ampcode.com/manual",
    detect: (_cwd, home) => existsSync(join(home, ".config", "amp")),
  },
  {
    id: "aider",
    label: "Aider",
    skillsShId: null,
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "unsupported",
    rulesConfidence: "optional",
    source: "https://aider.chat/docs/usage/conventions.html",
    detect: (cwd) =>
      existsSync(join(cwd, ".aider.conf.yml")) || existsSync(join(cwd, "CONVENTIONS.md")),
  },
  {
    id: "continue",
    label: "Continue",
    skillsShId: "continue",
    standing: "none",
    scoped: "none",
    personal: "none",
    agentSkills: "delegated",
    rulesConfidence: "unknown",
    source: "https://docs.continue.dev/customize/deep-dives/rules",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".continue")) || existsSync(join(home, ".continue")),
  },
  {
    id: "junie",
    label: "JetBrains Junie",
    skillsShId: "junie",
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "unknown",
    rulesConfidence: "optional",
    source: "https://www.jetbrains.com/help/ai-assistant/junie-agent.html",
    detect: (cwd) => existsSync(join(cwd, ".junie")),
  },
  {
    id: "amazon-q",
    label: "Amazon Q / Kiro",
    skillsShId: null,
    standing: "none",
    scoped: "none",
    personal: "none",
    agentSkills: "unsupported",
    rulesConfidence: "unknown",
    source: "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".amazonq")) || existsSync(join(home, ".aws", "amazonq")),
  },
  {
    id: "jules",
    label: "Google Jules",
    skillsShId: null,
    standing: "agents-md",
    scoped: "none",
    personal: "none",
    agentSkills: "unknown",
    rulesConfidence: "optional",
    source: "https://agents.md/",
    detect: () => false,
  },
];

export const AGENT_IDS = AGENTS.map((a) => a.id);

/** Default agents when nothing is detected. */
export const DEFAULT_AGENT_IDS = ["cursor", "claude-code", "codex"];

/**
 * Look up a capability by id.
 * @param {string} id
 * @returns {Capability|undefined}
 */
export function getCapability(id) {
  return AGENTS.find((a) => a.id === id);
}

/**
 * Detect which agents appear installed. Falls back to a useful default set.
 * Detection is a recommendation only — never sole authority for writers.
 * @param {string} [cwd]
 * @param {string} [home]
 * @returns {string[]}
 */
export function detectAgents(cwd = process.cwd(), home = homedir()) {
  const found = AGENTS.filter((a) => a.detect(cwd, home)).map((a) => a.id);
  if (found.length) return found;
  return [...DEFAULT_AGENT_IDS];
}

/**
 * Agents that can receive skills.sh installs (have a skillsShId).
 * @param {string[]} agentIds
 */
export function skillsCapableAgents(agentIds) {
  return agentIds.filter((id) => getCapability(id)?.skillsShId);
}

/**
 * Agents with no skills.sh target.
 * @param {string[]} agentIds
 */
export function skillsUnsupportedAgents(agentIds) {
  return agentIds.filter((id) => !getCapability(id)?.skillsShId);
}

/**
 * Human-readable capability summary lines for status/list.
 * @param {string[]} [detected]
 */
export function formatCapabilityMatrix(detected = detectAgents()) {
  const det = new Set(detected);
  return AGENTS.map((a) => {
    const mark = det.has(a.id) ? "*" : " ";
    const skills = a.skillsShId ? `skills=${a.agentSkills}` : "skills=unsupported";
    return `${mark} ${a.id.padEnd(12)} rules=${a.rulesConfidence.padEnd(10)} ${skills} standing=${a.standing}`;
  });
}
