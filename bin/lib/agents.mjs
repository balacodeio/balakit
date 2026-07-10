/**
 * Agent registry and auto-detection of installed coding agents.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Supported agents. `skillsShId` is the id skills.sh expects; null = no skills
 * support. `detect` paths are checked (project then home) to auto-select agents.
 */
export const AGENTS = [
  {
    id: "cursor",
    label: "Cursor",
    skillsShId: "cursor",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".cursor")) || existsSync(join(home, ".cursor")),
  },
  {
    id: "claude-code",
    label: "Claude Code",
    skillsShId: "claude-code",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".claude")) || existsSync(join(home, ".claude")),
  },
  {
    id: "codex",
    label: "Codex",
    skillsShId: "codex",
    detect: (_cwd, home) => existsSync(join(home, ".codex")),
  },
  {
    id: "opencode",
    label: "OpenCode",
    skillsShId: "opencode",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".opencode")) ||
      existsSync(join(home, ".config", "opencode")),
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    skillsShId: "github-copilot",
    detect: (cwd) => existsSync(join(cwd, ".github")),
  },
  {
    id: "cline",
    label: "Cline",
    skillsShId: "cline",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".clinerules")) ||
      existsSync(join(home, "Documents", "Cline")),
  },
  {
    id: "kilocode",
    label: "Kilo Code",
    skillsShId: "kilo",
    detect: (cwd, home) =>
      existsSync(join(cwd, ".kilocode")) || existsSync(join(home, ".kilocode")),
  },
  {
    id: "omp",
    label: "omp (oh-my-pi)",
    skillsShId: "pi",
    detect: (_cwd, home) =>
      existsSync(join(home, ".omp")) || existsSync(join(home, ".pi")),
  },
];

export const AGENT_IDS = AGENTS.map((a) => a.id);

/**
 * Detect which agents appear installed on this machine / in this project.
 * Falls back to cursor + claude-code + codex when nothing is detected so a
 * fresh machine still gets a useful default set.
 * @param {string} [cwd]
 * @param {string} [home]
 * @returns {string[]} Agent ids.
 */
export function detectAgents(cwd = process.cwd(), home = homedir()) {
  const found = AGENTS.filter((a) => a.detect(cwd, home)).map((a) => a.id);
  if (found.length) return found;
  return ["cursor", "claude-code", "codex"];
}
