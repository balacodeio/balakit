# OpenCode — AGENTS.md, agents, commands, skills

OpenCode (open-source terminal agent by SST). Sources:
[rules](https://opencode.ai/docs/rules/) ·
[agents](https://opencode.ai/docs/agents/) ·
[skills](https://opencode.ai/docs/skills/) ·
[commands](https://opencode.ai/docs/commands/) ·
[config](https://opencode.ai/docs/config/)

> Directory names are **plural**: `.opencode/agents/`, `.opencode/commands/`,
> `.opencode/skills/`.

## Rules / instructions — `AGENTS.md`

"You can provide custom instructions to opencode by creating an `AGENTS.md`
file. This is similar to Cursor's rules."

**Discovery & precedence** (first match wins per category):
- **Local** (walking up from cwd): `AGENTS.md`, then `CLAUDE.md`.
- **Global:** `~/.config/opencode/AGENTS.md`, then `~/.claude/CLAUDE.md`.
- If both `AGENTS.md` and `CLAUDE.md` exist, only `AGENTS.md` is used.

**Additional instruction files** via the `instructions` array in
`opencode.json` (accepts paths, globs, and remote URLs):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["CONTRIBUTING.md", ".cursor/rules/*.md", "packages/*/AGENTS.md"]
}
```
All instruction files are combined with `AGENTS.md`. OpenCode does **not**
auto-parse file references inside `AGENTS.md` — list them in `instructions`
instead. `/init` scans the repo and writes/updates `AGENTS.md`.

## Skills (`SKILL.md`) — supported

One folder per skill, each with a `SKILL.md`. Locations:
- **Project:** `.opencode/skills/<name>/SKILL.md`
- **Global:** `~/.config/opencode/skills/<name>/SKILL.md`
- **Also loaded:** `~/.claude/skills/*/SKILL.md`, `~/.agents/skills/*/SKILL.md`
  (and the project `.claude/` and `.agents/` equivalents) — this is why a single
  authored Skill can serve OpenCode for free.

Frontmatter: `name` (required), `description` (required); optional `license`,
`compatibility`, `metadata`. `name` must be lowercase alphanumeric with single
hyphens and **match the directory name**. Optional `scripts/`, `references/`,
assets alongside.

## Custom agents / subagents

Defined via the `agent` key in `opencode.json`, **or** markdown files
(`<name>.md`) in `~/.config/opencode/agents/` (global) or `.opencode/agents/`
(project). Frontmatter fields:

| Field | Notes |
|---|---|
| `description` | required; purpose |
| `mode` | `primary` \| `subagent` \| `all` (defaults to `all`) |
| `model` | e.g. `anthropic/claude-sonnet-4-...` (subagents inherit if unset) |
| `temperature` / `top_p` | sampling |
| `prompt` | path to a system-prompt file |
| `tools` | enable/disable (`true`/`false`/wildcards) |
| `steps` | max iterations (`maxSteps` is deprecated) |
| `disable`, `hidden`, `reasoningEffort`, `permission` | as named |

Body after frontmatter = the agent's system prompt.

## Commands / prompts

Markdown files (`<name>.md`, body = prompt template) in
`~/.config/opencode/commands/` or `.opencode/commands/`. Frontmatter:
`description`, `agent`, `model`, `subtask` (boolean — forces subagent so it
doesn't pollute primary context). Body uses `$ARGUMENTS` and shell injection.
JSON alternative under the top-level `command` object (`template` required).

## Config

`opencode.json` / `opencode.jsonc`. `$schema`:
`"https://opencode.ai/config.json"`. Precedence (highest wins): project >
`~/.config/opencode/opencode.json` > remote; **files are merged, not replaced**.
Relevant top-level keys: `instructions`, `agent`, `command`, `default_agent`.
