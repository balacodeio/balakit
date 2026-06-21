# balakit

[![npm](https://img.shields.io/npm/v/balakit)](https://www.npmjs.com/package/balakit)
[![license](https://img.shields.io/npm/l/balakit)](LICENSE)

**Opinionated, cross-agent rules and skills for AI coding agents.** One `npx`
command installs the rules and skills you pick into **Cursor, Claude Code,
Codex, OpenCode, and GitHub Copilot**. Rules install into the current project;
skills can be installed per-project or globally.

> These are *opinionated* defaults: a meta-principle, a dual-mode communication
> style, a simplicity ladder, surgical-change discipline — plus a library of
> reusable skills (SEO, marketing, documentation, deep deliberation, and more).
> Take what you like, ignore the rest.

## Quick start

```bash
npx balakit
```

An interactive menu lets you choose **what** (rules and/or skills), **which**
(per rule / per skill), and **where** (which agents). Rules always install into
the current project; for skills you also pick a **scope** (this project or
global). No clone, no manual copying.

Or run it straight from GitHub without npm:

```bash
npx github:balacodeio/balakit
```

## What gets installed where

Rules are agent-specific in both format and location; the installer handles each:

| Agent | Rules land in | Notes |
| --- | --- | --- |
| Cursor | `.cursor/rules/*.mdc` | verbatim — native `globs` / `alwaysApply` honored |
| Claude Code | `CLAUDE.md` | managed block, merged (your other content is preserved) |
| Codex / OpenCode / Copilot | `AGENTS.md` | managed block, merged |

- **Idempotent** — re-running replaces the managed block between markers; it never duplicates or clobbers your own content.
- **Self-contained** — glob-scoped rules carry their scope note inline, so merged files never point at files you don't have.
- **Project-only** — rules always install into the current repo. They describe how to work in *this* project and belong under version control, so installing them globally (and silently applying one project's conventions everywhere) is intentionally not offered. Only **skills** can be installed globally.

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

`.mdc` files for Cursor **Rules** (and the source for `CLAUDE.md` / `AGENTS.md`).
Review each rule's `description` and globs before enabling `alwaysApply` in a new repo.

| Rule | Typical use |
| --- | --- |
| `global` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (grouped Features / Fixes / Changes) |
| `comments` | Comments and JSDoc standards |
| `seo-ai-search` | SEO + AI-search implementation (file-scoped) |
| `testing` | Testing philosophy |

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
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP server expert |
| `seo-audit` | SEO audit workflow |
| `startup-marketing-brain` | Startup marketing: bootstrapping, distribution, AI automation, monetization |

## Repository layout

```text
bin/cli.mjs                    # the `npx balakit` installer
skills/<skill-name>/SKILL.md   # source of truth (skills.sh discovery)
rules/<name>.mdc               # source of truth for rules
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
| **Skills** (`SKILL.md`) | `.cursor/skills/`, `.claude/skills/`, `.agents/skills/` | All five — Claude Code, Cursor, OpenCode, Codex, and Copilot (since Dec 2025) auto-discover skills from these directories |
| **Rules** — Cursor | `.cursor/rules/*.mdc` | Cursor (native; `globs` + `alwaysApply` honored) |
| **Rules** — Claude Code | root `CLAUDE.md` | Claude Code |
| **Rules** — Codex / OpenCode / Copilot | root `AGENTS.md` | Codex, OpenCode, Copilot (also Cursor) |

`CLAUDE.md` / `AGENTS.md` inline every `alwaysApply: true` rule and list
file-scoped rules under a "Conditional rules" index. They are generated by
`scripts/build-agent-rules.mjs` (needs `node` on PATH) — edit `rules/`, never
these files.

## License

MIT — see [LICENSE](LICENSE).
