# Claude Code — Skills, CLAUDE.md, slash commands

Sources: [Claude Code Skills](https://code.claude.com/docs/en/skills) ·
[Agent Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) ·
[Agent Skills spec](https://agentskills.io/specification)

## Skills (`SKILL.md`)

### Locations
- **Project:** `.claude/skills/<skill-name>/SKILL.md`
- **Personal (all projects):** `~/.claude/skills/<skill-name>/SKILL.md`
- **Plugin skills:** installed via the skill/plugin manager; same SKILL.md format.

### Frontmatter

| Field | Required | Constraint |
|---|---|---|
| `name` | ✅ | ≤ 64 chars; lowercase letters, digits, hyphens only; no XML tags; must not contain reserved words `anthropic` / `claude`. Use a gerund or plain-descriptive form. |
| `description` | ✅ | ≤ 1024 chars; non-empty; **third person**; must answer **what it does + when to use it** with concrete triggers. This is the only part always in context. |
| `allowed-tools` | optional | Restrict which tools the Skill may invoke. |
| `invocation-type` | optional | `auto` (model invokes on match) or `manual` (only via `/skill-name`). |

> This repo's Skills also carry non-standard convenience keys (`version`,
> `author`, `tags`, `when_to_use`, `user-invocable`, `disable-model-invocation`).
> They're harmless extra metadata — keep them for consistency with the repo, but
> only `name` + `description` are required by the spec.

### Directory layout
```
.claude/skills/<name>/
├── SKILL.md          # metadata (always-loaded) + body (loaded on trigger)
├── references/       # detail, loaded on demand — one level deep only
│   └── topic.md
└── scripts/          # executable, run not loaded
    └── do_thing.py
```

### Size budget & progressive disclosure
- **Only the YAML metadata is pre-loaded** at startup; the body loads when the
  Skill triggers; `references/` load only when the agent reads them; `scripts/`
  execute without entering context.
- Keep the **SKILL.md body well under ~500 lines**. Push depth to references.
- **Do not nest references** (reference → reference): the agent may preview a
  file with `head -100` and miss the tail.

## CLAUDE.md (standing project context)

- Loaded **in full at session start** — every byte taxes every request. Keep it
  tight: architecture facts, conventions, environment, guardrails.
- **Graduate to a Skill** when a CLAUDE.md section grows past a few paragraphs
  and becomes a procedure. CLAUDE.md = facts; Skill = how-to.
- A user-global `~/.claude/CLAUDE.md` applies across all projects.
- **`@import` syntax:** a line like `@rules/global.mdc` pulls another file's
  content into CLAUDE.md. Imports resolve recursively up to **4 hops**; relative
  paths resolve from the *importing* file. Caveat: imports keep the file tidy but
  do **not** save context — imported content still loads in full at launch.

## `.claude/rules/` (path-scoped rules)

Claude Code also reads `.claude/rules/*.md` — Markdown rule files whose YAML
frontmatter carries a `paths:` pattern. They load **only when Claude edits a
matching file**, so unlike CLAUDE.md they don't tax every request. This is the
context-efficient home for file-scoped guidance (the analogue of a Cursor
`globs` rule). Note the format is `.md` with `paths:` — **not** Cursor's `.mdc`
with `globs`/`alwaysApply`, so Cursor `.mdc` files dropped here are not parsed.

## Slash commands

- Project: `.claude/commands/<name>.md` · Personal: `~/.claude/commands/<name>.md`
- The file body is the prompt; `$ARGUMENTS` interpolates user input.
- Use for short, frequently-typed prompts. For multi-step procedures with
  references/scripts, prefer a **Skill**.

## Authoring tips specific to Claude Code
- Test across models — Haiku needs more explicit detail than Opus.
- Prefer **evaluation-driven** iteration: define a few test scenarios, then
  refine the Skill based on observed behavior, not assumptions.
