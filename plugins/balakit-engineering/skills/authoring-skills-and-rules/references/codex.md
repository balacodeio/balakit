# Codex (OpenAI Codex CLI) — AGENTS.md, skills, config

Sources: [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md) ·
[config reference](https://developers.openai.com/codex/config-reference) ·
[skills](https://developers.openai.com/codex/skills) ·
[custom prompts](https://developers.openai.com/codex/custom-prompts) ·
repo: [agents_md.md](https://github.com/openai/codex/blob/main/docs/agents_md.md),
[skills.md](https://github.com/openai/codex/blob/main/docs/skills.md)

## Rules / instructions — `AGENTS.md`

Codex uses the open **`AGENTS.md`** standard (no Codex-specific name).

**Discovery hierarchy** (built once per run; closer files override earlier):
1. **Global** (Codex home `~/.codex`, override via `CODEX_HOME`):
   `AGENTS.override.md` if present, else `AGENTS.md`.
2. **Project:** walk from Git root **down to cwd**; in each dir check
   `AGENTS.override.md`, then `AGENTS.md`, then names in
   `project_doc_fallback_filenames`. At most one file per directory.

**Merge:** concatenated root→cwd, **closer (nearer cwd) wins**. Combined size
capped at `project_doc_max_bytes` (**default 32 KiB**); content past the cap is
dropped; empty files skipped.

- `AGENTS.override.md` = local, **uncommitted** overrides (machine paths, flags).
- Write **practical working agreements**, not prose: e.g. "Always run `npm test`
  after modifying JavaScript files"; lint/test/approval rules. Layer global →
  repo-root → nested.
- There is **no `codex.md`** in current docs — the instruction filename is
  `AGENTS.md` (with `AGENTS.override.md` and `project_doc_fallback_filenames`).

## Skills (`SKILL.md`) — supported (since Dec 2025)

Codex adopts the open `SKILL.md` standard — skills written for Claude Code are
portable. **Search paths** (note the cross-agent `.agents/skills` dir, *not*
`.codex/skills`):
- `$CWD/.agents/skills`
- `$CWD/../.agents/skills` (parent)
- `$REPO_ROOT/.agents/skills`
- `$HOME/.agents/skills` (personal)
- `/etc/codex/skills` (system-shared)
- plus skills bundled with Codex

Structure:
```
<name>/
├── SKILL.md            # required (name + description frontmatter)
├── scripts/            # optional
├── references/         # optional
├── assets/             # optional
└── agents/openai.yaml  # optional, Codex-specific metadata
```
Required frontmatter: `name`, `description` (the description should say exactly
when the skill should and should **not** trigger). Invoke explicitly via
`/skills` or `$`-mention, or implicitly when the task matches.

## Custom prompts — DEPRECATED

`~/.codex/prompts/*.md` with frontmatter `description`, `argument-hint`;
placeholders `$1`–`$9`, `$ARGUMENTS`, named `$KEY` (passed `KEY=value`); invoked
`/<name>`. **Officially deprecated in favor of Skills** — existing ones still
work, but author new reusable instructions as Skills.

## Config — `~/.codex/config.toml` (TOML)

Key fields:

| Field | Values |
|---|---|
| `model` | e.g. `"gpt-5.5"` |
| `approval_policy` | `"untrusted"` \| `"on-request"` \| `"never"` — or a granular table (below) |
| `sandbox_mode` | `"read-only"` \| `"workspace-write"` \| `"danger-full-access"` |
| `[mcp_servers.<id>]` | `command`, `args`, `enabled` |
| `project_doc_fallback_filenames` | `array<string>` — extra names to try when `AGENTS.md` is missing |
| `project_doc_max_bytes` | AGENTS.md combined size cap (default 32 KiB = `32768`) |

Granular approval form:
```toml
approval_policy = { granular = { sandbox_approval = true, rules = false, mcp_elicitations = true, request_permissions = true, skill_approval = true } }
```

**Profiles are separate files, not a `config.toml` section.** Each lives at
`$CODEX_HOME/<profile-name>.config.toml` and is selected with
`--profile <profile-name>` (CLI); the selected profile file overrides
`config.toml` per profile. (Verified against the live config reference —
there is no `[profiles.<name>]` block.)
