# balakit

[![npm](https://img.shields.io/npm/v/balakit)](https://www.npmjs.com/package/balakit)
[![license](https://img.shields.io/npm/l/balakit)](LICENSE)

**Opinionated rules and skills for AI coding agents.** One kit, package-manager
verbs — install into your project (team) or your machine (personal). Skills go
through [skills.sh](https://skills.sh/); standing rules land **AGENTS.md-first**
(plus a `CLAUDE.md` adapter and Cursor `.mdc` only when globs matter).

> Take what you like, ignore the rest: meta-principle, simplicity ladder,
> changelog/testing/comments discipline, SEO guardrails, and a personal
> `.mental/` project-continuity layer.

## Quick start

Run through **`npx`** (recommended) or a **global install** — bare `balakit` is
not on your `PATH` until you install globally.

```bash
npx balakit                 # interactive menu: Team kit | Personal | Cherry-pick
npx balakit init            # team defaults → this project
npx balakit init --personal # mental (global) + git exclude + doctor
npx balakit init --with-personal
```

```bash
npx balakit add global testing
npx balakit add mental          # always global + exclude
npx balakit list
npx balakit status
npx balakit update
npx balakit remove testing
npx balakit doctor
```

Optional global install (Linux, macOS, WSL, Windows):

```bash
npm install -g balakit
balakit init
```

No agent multiselect by default — agents are **auto-detected**. Override with
`--agents cursor,claude-code` or `--agents all`. Preview with `--dry-run`; skip
prompts with `-y`.

### Interactive menu

`npx balakit` with no subcommand opens a terminal UI (arrow keys + Enter):

1. **Team kit** — project rules (`global`, `testing`, `comments`, `changelog`)
2. **Personal layer** — global `mental` rule + skill + `.mental/` git exclude
3. **Team kit + personal layer**
4. **Cherry-pick** — choose individual rules and skills

Use `-y` to skip confirmation prompts, or pass a subcommand directly
(`init`, `add`, `list`, …).

## What gets installed

### Team kit (`init` / project rules)

| Artifact | Role |
| --- | --- |
| `AGENTS.md` | Managed block — canonical standing instructions (Codex, OpenCode, Copilot, Cursor, …) |
| `CLAUDE.md` | Same managed block — Claude Code adapter |
| `.cursor/rules/<name>.mdc` | **Only** glob-scoped rules (e.g. `seo-ai-search`) |

Default team rules: `global`, `testing`, `comments`, `changelog`.

### Personal layer (`init --personal` / `add mental`)

| Piece | Where |
| --- | --- |
| `mental` rule | `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.cursor/rules/mental.mdc` |
| `mental` skill | Global via `npx skills add … -g` |
| `.mental/` ignore | Machine-wide `core.excludesfile` — **never** a repo `.gitignore` |

The data folder `.mental/` is **per-repo** (created by the agent on first
substantive work). Only the *wiring* is global. Project-scope install of the
mental rule is refused — it would commit a personal pointer into shared files.

### Skills

Delegated to skills.sh (path maps stay theirs):

```bash
npx skills add balacodeio/balakit
npx skills add balacodeio/balakit -g
npx skills add balacodeio/balakit --skill dissect
```

`balakit add <skill>` runs the equivalent under the hood. The `mental` rule
always brings the `mental` skill (pointer without procedure is useless).

## Updating & removing

```bash
npx balakit update          # refresh everything recorded in manifests
npx balakit remove mental   # drops wiring + skill; keeps the global exclude
npx balakit status          # project + personal manifests, managed blocks, exclude health
```

Ownership is tracked in `.balakit/installed.json` (project) and
`~/.balakit/installed.json` (personal).

## The `.mental/` personal knowledge layer

`mental` (rule + skill) teaches agents to maintain a **private, gitignored,
per-repo continuity log** at `.mental/`. It derives current state from git, the
latest exact handoff, and open decisions; then records only consequential
decisions and durable facts that git cannot explain.

**Git contract (non-negotiable):** `.mental/` is ignored via your **global** git
excludes (`core.excludesfile`, typically `~/.config/git/ignore`). The CLI doctor
owns exclude setup and repair. Agents never modify git configuration or write a
repo `.gitignore` entry for it.

```bash
npx balakit doctor   # verify / repair the exclude
```

## Rules

| Rule | Typical use |
| --- | --- |
| `global` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (grouped Features / Fixes / Changes) |
| `comments` | Comments and JSDoc standards |
| `mental` | Personal `.mental/` layer — always global; auto-installs the `mental` skill |
| `seo-ai-search` | SEO + AI-search implementation (file-scoped → Cursor `.mdc`) |
| `testing` | Testing philosophy |

## Skills

| Skill | Summary |
| --- | --- |
| `authoring-skills-and-rules` | Meta-skill: create/update Skills and rules across agents |
| `cloakbrowser-fallback` | Stealth Chromium when normal automation is blocked |
| `deep-deliberation` | Checkpointed option comparison, evidence tournament, and adjudication before building |
| `dissect` | Audit an existing service/plan into a minimal-build plan |
| `documentation-writer` | Research-first technical documentation workflow |
| `everything-seo` | Comprehensive SEO playbook |
| `marketing-psychology` | Psychology for product and marketing copy |
| `media-gen` | Fal.ai image, video, and upscale generation with dual-model ad creative workflow |
| `mental` | Private project continuity: decisions, outcomes, and exact handoffs |
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP server expert |
| `seo-audit` | SEO audit workflow |
| `startup-marketing-brain` | Startup marketing: distribution, AI automation, monetization |

## Repository layout

```text
bin/cli.mjs                 # entry — routes to commands/
bin/lib/                    # catalog, render, rules-install, skills-bridge, …
bin/commands/               # init, add, remove, status, interactive, …
skills/<name>/SKILL.md      # source of truth (skills.sh discovery)
rules/<name>.mdc            # source of truth for rules
scripts/build-agent-rules.mjs  # generates CLAUDE.md + AGENTS.md (shared render)
.cursor/  .claude/  .agents/   # committed skill mirrors
sync.ps1  sync.sh              # push source → mirrors, then regenerate
```

## Developing

`skills/` and `rules/` are the **source of truth**. After edits:

```bash
./sync.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File .\sync.ps1
```

## License

MIT — see [LICENSE](LICENSE).
