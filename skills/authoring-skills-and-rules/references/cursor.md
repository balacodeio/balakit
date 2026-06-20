# Cursor — Rules (`.mdc`) and Skills

Sources: [Cursor Rules](https://cursor.com/docs/context/rules) ·
[Cursor Skills](https://cursor.com/docs/skills)

## Rules (`.cursor/rules/*.mdc`)

Project rules are **`.mdc`** files (Markdown + YAML frontmatter) under
`.cursor/rules/`, version-controlled. **Plain `.md` files there are ignored**
(except `AGENTS.md`).

### Frontmatter fields

| Field | Type | Meaning |
|---|---|---|
| `alwaysApply` | boolean | `true` → included in **every** session. When `true`, other fields are ignored. |
| `description` | string | What the Agent reads to decide relevance (drives "Apply Intelligently"). |
| `globs` | comma-separated patterns | Rule auto-attaches when a matching file is in context. |

### The four activation modes (set purely by frontmatter)

| Mode | `alwaysApply` | `description` | `globs` | Trigger |
|---|---|---|---|---|
| **Always** | `true` | — | — | Every session |
| **Agent Requested** ("Apply Intelligently") | `false` | ✅ | — | Agent decides from `description` |
| **Auto Attached** ("Apply to Specific Files") | `false` | — | ✅ | A matching file is in context |
| **Manual** | `false` | — | — | Only via `@rule-name` mention |

Interaction quirks:
- `alwaysApply: true` **overrides** `globs`/`description`.
- A **globs-only** rule attaches *only* when a matching file is in context; if no
  file matches, it does **not** load on topic/description alone.

### Locations & precedence
- **Project:** `.cursor/rules/*.mdc`.
- **Nested:** subdirectories may hold their own `.cursor/rules`; deeper (more
  specific) instructions take precedence and combine with parents.
- **User/global:** Cursor Settings → Rules (no frontmatter, all projects).
- **Team rules** (Team/Enterprise): dashboard-managed; take precedence over
  project rules.
- **`AGENTS.md`:** plain-markdown alternative (no frontmatter), root or subdirs.
- **`.cursorrules` (single root file): legacy/deprecated** — migrate to
  `.cursor/rules/*.mdc` or `AGENTS.md`.

### Content best practices (from docs)
- **"Keep rules under 500 lines."**
- Split large concepts into multiple composable rules.
- Write like a clear internal doc — actionable, concrete.
- Reference files with **`@filename`** instead of pasting content.
- Avoid: copying whole style guides (use a linter), documenting tools the Agent
  knows (`npm`/`git`/`pytest`), rare edge cases, duplicating codebase docs.
- For **Agent-Requested** rules, the `description` is the entire trigger — make
  it specific: name the framework/domain + the situations that should pull it in.
  Community guidance: keep **Always** rules lean (they tax every prompt).

> No official numeric limit on `description` length or rule count; only the
> "under 500 lines" guidance is explicit.

## Skills (`.cursor/skills/*`)

Cursor supports the same Agent Skills format (`SKILL.md`), installable via
[skills.sh](https://skills.sh) (`npx skills add <repo>`), landing in
`.cursor/skills/<name>/` (project) or `~/.cursor/skills/` (global, `-g`). Same
`name` + `description` frontmatter rules as Claude Code apply.
