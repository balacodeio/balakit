# balakit

[![npm](https://img.shields.io/npm/v/balakit)](https://www.npmjs.com/package/balakit)
[![license](https://img.shields.io/npm/l/balakit)](LICENSE)

**Opinionated, cross-agent rules and skills for AI coding agents.** One `npx`
command installs the rules and skills you pick into **Cursor, Claude Code,
Codex, OpenCode, GitHub Copilot, Cline, Kilo Code, and omp**. Rules and skills
can each be installed per-project or globally (user-level).

> These are *opinionated* defaults: a meta-principle, a dual-mode communication
> style, a simplicity ladder, surgical-change discipline, a personal `.mental/`
> knowledge layer — plus a library of reusable skills (SEO, marketing,
> documentation, deep deliberation, and more). Take what you like, ignore the rest.

## Quick start

```bash
npx balakit
```

One grouped menu picks rules and skills together, then agents, then scope
(this project or global). The review step previews exactly where every rule
will land per agent before anything is written. No clone, no manual copying.

**Paired rules bring their skill automatically** — selecting the `mental` rule
always installs the `mental` skill (the always-on pointer is useless without
the procedure it points at), no opt-out.

**Personal-layer rules steer to global scope** — `mental` describes *your*
workflow, not the repo's, so the scope prompt defaults it to Global, and
installing it at project scope warns: project scope writes the rule into
committed files (`CLAUDE.md`/`AGENTS.md`) that teammates see. Only the
`.mental/` data folder is gitignored — never the rule wiring.

Prefer non-interactive? Every prompt has a flag:

```bash
npx balakit --rules global,mental --agents claude-code,cursor,cline -y   # project scope
npx balakit --rules mental --agents all --scope global -y                # user-level, every repo
npx balakit --rules mental --agents all --scope global --dry-run         # preview, write nothing
npx balakit --list                                                       # browse what's available
npx balakit --help
```

Or run it straight from GitHub without npm:

```bash
npx github:balacodeio/balakit
```

## Updating

Re-run the installer with `@latest` and the same selections — it is idempotent:

```bash
npx balakit@latest
```

Managed blocks (`CLAUDE.md` / `AGENTS.md`) are replaced between their markers,
installed rule files are overwritten in place, and your own surrounding content
is never touched or duplicated. Skills update the same way via skills.sh.

## What gets installed where

Rules are agent-specific in both format and location; the installer handles each,
at either scope:

| Agent | Project rules | Global (user-level) rules |
| --- | --- | --- |
| Cursor | `.cursor/rules/*.mdc` (verbatim — native `globs`/`alwaysApply`) | `~/.cursor/rules/*.mdc` † |
| Claude Code | `CLAUDE.md` (managed block, merged) | `~/.claude/CLAUDE.md` (managed block) |
| Codex | `AGENTS.md` (managed block, merged) | `~/.codex/AGENTS.md` (managed block) |
| OpenCode | `AGENTS.md` (shared) | `~/.config/opencode/AGENTS.md` (managed block) |
| GitHub Copilot | `AGENTS.md` (shared — Copilot reads it natively) | VS Code profile `User/prompts/balakit-*.instructions.md` (`applyTo` scoped) |
| Cline | `.clinerules/balakit-*.md` (one file per rule) | `~/Documents/Cline/Rules/balakit-*.md` |
| Kilo Code | `.kilocode/rules/balakit-*.md` | `~/.kilocode/rules/balakit-*.md` (auto-included alongside `kilo.jsonc`) |
| omp | `AGENTS.md` (shared — AGENTS.md-compatible) | `~/.omp/agent/AGENTS.md` (pi-fork convention) |

† Cursor caveat: `~/.cursor/rules` applies reliably when a project/workspace is
open; a forum-tracked Cursor bug can skip it in workspace-less Agent sessions.
The installer prints this heads-up; mirroring the rule in Cursor Settings →
Rules is optional belt-and-braces.

- **Fully automated at both scopes** — every agent has a real file destination;
  no manual steps. Platform caveats are printed as heads-ups, not homework.
- **Idempotent** — re-running replaces the managed block between markers / the
  installed rule files; it never duplicates or clobbers your own content.
- **Self-contained** — glob-scoped rules carry their scope note inline, so merged
  files never point at files you don't have.
- **Scope is a real choice** — project rules describe how to work in *this*
  repo and belong under version control; global rules are personal, apply to
  every repo on the machine, and live in your user config. Pick deliberately —
  a project's conventions usually should **not** be installed globally, while a
  personal layer like `mental` usually should.

**Skills** are delegated to [skills.sh](https://skills.sh/): the installer runs
`npx skills add` under the hood, so its maintained per-agent paths and global
locations are reused. You can also install skills directly:

```bash
npx skills add balacodeio/balakit                  # all skills, into current project
npx skills add balacodeio/balakit -g               # globally
npx skills add balacodeio/balakit --skill dissect  # just one
npx skills add balacodeio/balakit --list           # browse without installing
```

## Rules

`.mdc` files for Cursor **Rules** (and the source for `CLAUDE.md` / `AGENTS.md` /
Cline / Kilo Code rule files). Review each rule's `description` and globs before
enabling `alwaysApply` in a new repo.

| Rule | Typical use |
| --- | --- |
| `global` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (grouped Features / Fixes / Changes) |
| `comments` | Comments and JSDoc standards |
| `mental` | The `.mental/` personal knowledge layer — always-on pointer; auto-installs the `mental` skill |
| `seo-ai-search` | SEO + AI-search implementation (file-scoped) |
| `testing` | Testing philosophy |

### The `.mental/` personal knowledge layer

`mental` (rule + skill) teaches agents to maintain a **private, gitignored,
per-repo second-brain** — an Open Knowledge Format bundle at `.mental/` (the
skill carries the full format spec — no external dependency) that keeps *you*
oriented: where the project stands, what you decided and why, what you
accomplished, where to resume after weeks away. The agent **creates `.mental/`
automatically on its first substantive work in a repo** (it's gitignored, so it
never touches commits), then re-orients from it before non-trivial work,
journals after, and records decisions — deriving "where are we" from git + the
journal + open decisions rather than maintaining rot-prone to-do lists. Each
repo gets its own `.mental/`; there is no global bundle.

Installing the `mental` rule also idempotently guarantees `.mental/` is in your
**global git excludes**, so a private second-brain can never be `git add`-ed and
pushed — the folder is ignored in every repo on the machine without touching any
project's `.gitignore`. If `core.excludesfile` is unset, the installer wires it
to git's XDG default (`~/.config/git/ignore`) and adds the `.mental/` line; if it
is already set, that file is used and never overwritten. Install the rule
globally (`--scope global`) plus the `mental` skill globally (`-g`) to enable the
layer across everything you work on.

Verify (or repair) the exclude at any time — it also runs automatically on every
install:

```bash
npx balakit --doctor
```

## Skills

| Skill | Summary |
| --- | --- |
| `authoring-skills-and-rules` | Meta-skill: create/update Skills and rules across Claude Code, Cursor, OpenCode, Codex, and Copilot |
| `cloakbrowser-fallback` | Stealth Chromium when normal automation is blocked |
| `deep-deliberation` | Forward-looking design: Tree-of-Thought + red-team debates before building |
| `dissect` | Backward-looking audit: dissect an existing service, plan, or codebase into a minimal-build plan |
| `documentation-writer` | Research-first technical documentation workflow |
| `everything-seo` | Comprehensive SEO playbook: technical audits, semantic search, digital PR, CRO, GEO |
| `marketing-psychology` | Psychology for product and marketing copy |
| `mental` | Maintain a repo's `.mental/` second-brain (OKF bundle): journal, decisions, derived status, optional bootstrap survey |
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP server expert |
| `seo-audit` | SEO audit workflow |
| `startup-marketing-brain` | Startup marketing: bootstrapping, distribution, AI automation, monetization |

## Repository layout

```text
bin/cli.mjs                    # the `npx balakit` installer
skills/<skill-name>/SKILL.md   # source of truth (skills.sh discovery)
rules/<name>.mdc               # source of truth for rules
docs/                          # design specs (not published to npm)
scripts/build-agent-rules.mjs  # generates CLAUDE.md + AGENTS.md from rules/
.cursor/  .claude/  .agents/   # committed skill mirrors (skills/ only)
.cursor/rules/                 # Cursor's native .mdc rules (rules mirror here)
CLAUDE.md  AGENTS.md           # generated standing rules (do not edit by hand)
sync.ps1  sync.sh              # push source -> the above, then regenerate
```

## Developing

`skills/` and `rules/` are the **source of truth** — develop and iterate there.
When a change is finalized, run the sync script. It (1) mirrors `skills/` into
`.cursor/`, `.claude/`, and `.agents/`, (2) mirrors `rules/*.mdc` into
`.cursor/rules/`, and (3) regenerates root `CLAUDE.md` and `AGENTS.md` from
`rules/`. Mirrors are fully replaced each run, so deletions propagate — no stale
forks.

```bash
./sync.sh                                              # macOS / Linux / Git Bash
```

```powershell
powershell -ExecutionPolicy Bypass -File .\sync.ps1    # Windows
```

### How each artifact reaches each agent

Verified against each platform's docs (2025–2026):

| Artifact | Lives in | Read by |
| --- | --- | --- |
| **Skills** (`SKILL.md`) | `.cursor/skills/`, `.claude/skills/`, `.agents/skills/` | Claude Code, Cursor, OpenCode, Codex, and Copilot (since Dec 2025) auto-discover skills from these directories |
| **Rules** — Cursor | `.cursor/rules/*.mdc` | Cursor (native; `globs` + `alwaysApply` honored) |
| **Rules** — Claude Code | root `CLAUDE.md` | Claude Code |
| **Rules** — Codex / OpenCode / Copilot / omp | root `AGENTS.md` | Codex, OpenCode, Copilot, omp (also Cursor) |
| **Rules** — Cline / Kilo Code | `.clinerules/`, `.kilocode/rules/` | Cline, Kilo Code (plain `.md`, one file per rule) |

`CLAUDE.md` / `AGENTS.md` inline every `alwaysApply: true` rule and list
file-scoped rules under a "Conditional rules" index. They are generated by
`scripts/build-agent-rules.mjs` (needs `node` on PATH) — edit `rules/`, never
these files.

## License

MIT — see [LICENSE](LICENSE).
