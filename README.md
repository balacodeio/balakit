# balakit

[![npm](https://img.shields.io/npm/v/balakit)](https://www.npmjs.com/package/balakit)
[![license](https://img.shields.io/npm/l/balakit)](LICENSE)

**Opinionated rules and skills for AI coding agents.** Guided setup installs a
capability-aware kit: standing rules land **AGENTS.md-first** (plus `CLAUDE.md`
and Cursor `.mdc` when needed); skills go through
[skills.sh](https://skills.sh/). Mental continuity tooling and `.mental/` data
policy are chosen explicitly.

> Take what you like, ignore the rest: meta-principle, simplicity ladder,
> changelog/testing/comments discipline, SEO guardrails, and a `.mental/`
> project-continuity layer.

## Quick start

```bash
npx balakit                 # guided setup: plan → review → apply
npx balakit init            # same guided flow
npx balakit init --personal -y --mental-data global-exclude
npx balakit init --with-personal -y
```

```bash
npx balakit add global testing
npx balakit add mental --mental-tooling user --mental-data clone-exclude
npx balakit list            # rules, skills, capability matrix
npx balakit status
npx balakit update
npx balakit remove testing
npx balakit doctor          # mode-aware Mental data-policy check/repair
npx balakit doctor --lift-ignore   # explicit unignore for tracked mode (confirm required)
```

Optional global install:

```bash
npm install -g balakit
balakit init
```

Override skills targets with `--agents cursor,claude-code` or `--agents all`.
Preview with `--dry-run`. `-y` skips safe confirms; it **cannot** silently accept
`tracked` or `repo-gitignore` Mental data policies, and **cannot** combine with
`--lift-ignore` (lifting ignore lines always needs an interactive confirm).

### Guided setup

`npx balakit` (and `init` without `-y`) walks:

1. **Intent** — project standing rules, Mental continuity, both, or advanced cherry-pick
2. **Tools** — detected agents as hints; confirm skills targets
3. **Mental choices** (when selected) — tooling scope + data policy, with consequences
4. **Review** — exact destinations → apply

## What gets installed

### Project standing rules

| Artifact | Role |
| --- | --- |
| `AGENTS.md` | Managed block — canonical standing instructions |
| `CLAUDE.md` | Same managed block — Claude Code adapter |
| `.cursor/rules/<name>.mdc` | **Only** glob-scoped rules (e.g. `seo-ai-search`) |

Default team rules: `global`, `testing`, `comments`, `changelog`.

`add` **reconciles** with the project manifest so later adds never shrink the
managed block.

### Mental role (`mental` rule + skill)

Two independent choices:

| Axis | Options |
| --- | --- |
| **Tooling scope** | `user` (default) — `~/.claude`, `~/.codex`, `~/.cursor/rules` + skills `-g`; `project` — wiring in this repo (collaborators see it) |
| **Data policy** | `global-exclude` (default) · `clone-exclude` (`.git/info/exclude`) · `repo-gitignore` · `tracked` (no privacy promise) |

Flags: `--mental-tooling user|project` and
`--mental-data global-exclude|clone-exclude|repo-gitignore|tracked`.

The data folder `.mental/` is **per-repo** (created by the agent on first
substantive work when policy allows). Remove never deletes `.mental/` data and
never silently removes ignore lines. If you choose `tracked` while a global (or
other) `.mental/` exclude still exists, Balakit reports the sources and offers
`doctor --lift-ignore` — it will not auto-strip a global exclude under `-y`.

### Skills

Delegated to skills.sh (path maps stay theirs):

```bash
npx skills add balacodeio/balakit
npx skills add balacodeio/balakit -g
npx skills add balacodeio/balakit --skill dissect
```

`balakit add <skill>` runs the equivalent. The `mental` rule always brings the
`mental` skill. Skills failures exit non-zero (partial state is reported).
Only skills.sh agent ids on Balakit’s verified allowlist are passed as `-a`
(refresh via live `npx skills` smoke when adding a new target).

## Capability model

Balakit does **not** claim every tool is fully supported. Each entry records:

- **rules confidence** — verified / optional / unknown / unsupported
- **standing surface** — usually `AGENTS.md` (+ `CLAUDE.md` / Cursor scoped `.mdc` when required)
- **skills** — delegated to skills.sh when a target id exists

`balakit list` and `balakit status` print the matrix (`*` = detected). Detection
is a recommendation only.

| Tier | Meaning |
| --- | --- |
| Common | `AGENTS.md` + Agent Skills / `SKILL.md` via skills.sh |
| Required natives | `CLAUDE.md` twin; Cursor scoped `.mdc` for globs |
| Optional / delegated | Windsurf, Roo, Gemini CLI, Zed, Amp, Cline, Kilo, pi, … — skills via skills.sh; rules via AGENTS.md when they read it |
| Unknown / unsupported | e.g. Aider (config-only AGENTS), Amazon Q native rules — documented, not auto-written |

## Updating & removing

```bash
npx balakit update          # refresh everything recorded in manifests
npx balakit remove mental   # drops wiring + skill; keeps data policy ignores
npx balakit status          # manifests, managed blocks, Mental policy, matrix
```

Ownership: `.balakit/installed.json` (project) and `~/.balakit/installed.json`
(user). Schema v2 records agents, surfaces, Mental tooling scope, and data
policy. Older manifests migrate to `user` + `global-exclude` when Mental is
present.

## The `.mental/` continuity layer

`mental` (rule + skill) teaches agents to maintain a per-repo continuity log at
`.mental/`. Preflight respects the **recorded data policy**: private modes
require `git check-ignore`; tracked mode does not.

```bash
npx balakit doctor                 # verify / repair for the recorded policy
npx balakit doctor --lift-ignore   # remove discovered .mental/ ignore lines (confirm)
npx balakit doctor --lift-ignore --dry-run   # preview only
```

## Rules

| Rule | Typical use |
| --- | --- |
| `global` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (grouped Features / Fixes / Changes) |
| `comments` | Comments and JSDoc standards |
| `mental` | Continuity layer — choose tooling scope + data policy; bundles `mental` skill |
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
| `mental` | Project continuity: decisions, outcomes, and exact handoffs |
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP server expert |
| `release-deploy` | GitHub tag releases: main→production, staging→beta; changelog-driven notes |
| `seo-audit` | SEO audit workflow |
| `startup-marketing-brain` | Startup marketing: distribution, AI automation, monetization |

## Repository layout

```text
bin/cli.mjs                 # entry — routes to commands/
bin/lib/                    # catalog, plan, capability registry, mental policy, …
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
