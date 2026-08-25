# balakit

[![npm](https://img.shields.io/npm/v/balakit)](https://www.npmjs.com/package/balakit)
[![license](https://img.shields.io/npm/l/balakit)](LICENSE)

**Opinionated rules and skills for AI coding agents.** Guided setup installs a
capability-aware kit: standing rules land **AGENTS.md-first** (plus `CLAUDE.md`
and Cursor `.mdc` when needed); skills go through
[skills.sh](https://skills.sh/). The same kit is also packaged as **domain
plugins** ([Agent Plugins](https://agent-plugins.org) + Cursor marketplace) so
each capability group can install separately.

> Take what you like, ignore the rest: meta-principle, simplicity ladder,
> changelog/testing/comments discipline, and SEO guardrails.

## Quick start

```bash
npx balakit                 # guided setup: plan → review → apply
npx balakit init            # same guided flow
npx balakit init -y         # non-interactive team kit
```

```bash
npx balakit add base testing
npx balakit list            # rules, skills, capability matrix
npx balakit status
npx balakit update
npx balakit remove testing
```

Optional global install:

```bash
npm install -g balakit
balakit init
```

## Mental (moved)

Mental is a **standalone** local-first continuity layer. It is no longer a Balakit
rule, skill, plugin, or CLI command.

**New home:** [github.com/afaraha8403/mental](https://github.com/afaraha8403/mental)

Install from that repo (Mental is not on npm yet):

```bash
git clone https://github.com/afaraha8403/mental.git
cd mental
node bin/cli.mjs install
# or: npm link   then:  mental install
```

`mental install` copies the skill and a tiny always-on rule into your user agent
dirs and creates a `~/.mental` skeleton. Existing `.mental/` journals were **not**
deleted when Mental left Balakit.

Leftover Balakit flags (`doctor`, `--personal`, `--mental-*`, `add mental`) print
that URL and exit. Drop leftover kit wiring with `balakit remove mental`.

Override skills targets with `--agents cursor,claude-code` or `--agents all`.
Preview with `--dry-run`. `-y` skips confirms.

### Guided setup

`npx balakit` (and `init` without `-y`) walks:

1. **Intent** — project standing rules, or advanced cherry-pick
2. **Tools** — detected agents as hints; confirm skills targets
3. **Review** — exact destinations → apply

## What gets installed

### Project standing rules

| Artifact | Role |
| --- | --- |
| `AGENTS.md` | Managed block — canonical standing instructions |
| `CLAUDE.md` | Same managed block — Claude Code adapter |
| `.cursor/rules/<name>.mdc` | **Only** glob-scoped rules (e.g. `seo-ai-search`) |

Default team rules: `base`, `testing`, `comments`, `changelog`.

`add` **reconciles** with the project manifest so later adds never shrink the
managed block.

### Skills

Delegated to skills.sh (path maps stay theirs):

```bash
npx skills add balacodeio/balakit
npx skills add balacodeio/balakit -g
npx skills add balacodeio/balakit --skill dissect
```

`balakit add <skill>` runs the equivalent. Skills failures exit non-zero
(partial state is reported). Only skills.sh agent ids on Balakit’s verified
allowlist are passed as `-a` (refresh via live `npx skills` smoke when adding a
new target).

### Domain plugins (Agent Plugins / Cursor)

`skills/` and `rules/` remain the source of truth. `./sync.sh` materializes
installable domain plugins under `plugins/` plus
`.cursor-plugin/marketplace.json` for Cursor’s multi-plugin marketplace layout.

| Plugin | Ships | Format |
| --- | --- | --- |
| `balakit-core` | rules: `base`, `testing`, `comments`, `changelog` | Cursor Plugin |
| `balakit-seo` | `seo-ai-search` rule + `everything-seo`, `seo-audit` | Cursor Plugin |
| `balakit-marketing` | `marketing-psychology`, `startup-marketing-brain` | Agent Plugins + Cursor |
| `balakit-media` | `media-gen` | Agent Plugins + Cursor |
| `balakit-nlm` | `nlm-skill` | Agent Plugins + Cursor |
| `balakit-engineering` | `authoring-skills-and-rules`, `cloakbrowser-fallback`, `deep-deliberation`, `dissect`, `documentation-writer`, `release-deploy` | Agent Plugins + Cursor |

Skills-only plugins include a root `plugin.json` conforming to
[Agent Plugins](https://agent-plugins.org) v1.0.0. Plugins that include rules use
Cursor’s `.cursor-plugin/plugin.json` (rules are outside the portable v1
component set).

See `plugins/README.md`. Regenerate with `node scripts/build-plugins.mjs`.

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
npx balakit remove testing
npx balakit status          # manifests, managed blocks, capability matrix
```

Ownership: `.balakit/installed.json` (project) and `~/.balakit/installed.json`
(user). Schema v2 records agents and surfaces. Older manifests still load.

## Rules

| Rule | Typical use |
| --- | --- |
| `base` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (grouped Features / Fixes / Changes) |
| `comments` | Comments and JSDoc standards |
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
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP server expert |
| `release-deploy` | GitHub tag releases: main→production, staging→beta; changelog-driven notes |
| `seo-audit` | SEO audit workflow |
| `startup-marketing-brain` | Startup marketing: distribution, AI automation, monetization |

## Repository layout

```text
bin/cli.mjs                 # entry — routes to commands/
bin/lib/                    # catalog, plan, capability registry, …
bin/commands/               # init, add, remove, status, interactive, …
skills/<name>/SKILL.md      # source of truth (skills.sh discovery)
rules/<name>.mdc            # source of truth for rules
plugins/<name>/             # generated domain plugins (Agent/Cursor)
.cursor-plugin/marketplace.json  # Cursor multi-plugin marketplace
scripts/build-agent-rules.mjs  # generates CLAUDE.md + AGENTS.md (shared render)
scripts/build-plugins.mjs      # generates plugins/ + marketplace.json
scripts/plugins-catalog.mjs    # domain plugin membership
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
