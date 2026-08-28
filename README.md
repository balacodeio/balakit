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
npx balakit init -y         # non-interactive team kit (this repo)
npx balakit init --scope user -y   # this machine (all projects)
```

```bash
npx balakit add base testing
npx balakit add dissect --scope user
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

1. **Intent** — this repo, this machine (all projects), or advanced cherry-pick
2. **Tools** — detected agents as hints; confirm skills targets
3. **Review** — exact destinations → apply

`--scope project|user` (default `project`) selects the same split on the
non-interactive path. `--personal` is **not** that flag; it still prints that
Mental has moved.

## What gets installed

CLI writes **standing rules**. Skills go through skills.sh (Balakit passes `-g`
for user scope and then fills Cursor-native gaps). Domain **plugins** are the
portable Agent Plugins 1.0.0 packages.

### Project (`--scope project`, default)

| Artifact | Role |
| --- | --- |
| `AGENTS.md` | Managed block — canonical standing instructions |
| `CLAUDE.md` | Same managed block — Claude Code adapter |
| `.cursor/rules/<name>.mdc` | Always-on **and** glob-scoped rules (`alwaysApply: true` or `globs`) |
| `.claude/rules/<name>.md` | Scoped twin (`paths:`) when Claude Code is selected |
| `.github/instructions/<name>.instructions.md` | Scoped twin (`applyTo`) when Copilot is selected |
| `.agents/skills/<name>` | skills.sh Cursor project target |
| `.cursor/skills/<name>` | Symlink to `.agents/skills/<name>` after skills.sh (Cursor also loads this path) |

Default team rules: `base`, `testing`, `comments`, `changelog`.

`add` **reconciles** with `.balakit/installed.json` so later adds never shrink
the managed block.

### User (`--scope user`)

Writes **this machine**, all projects. Manifest: `~/.balakit/installed.json`.

| Artifact | Role |
| --- | --- |
| `~/.cursor/rules/*.mdc` | File-based user rules |
| `~/.claude/CLAUDE.md` | Claude Code user standing file |
| `~/.codex/AGENTS.md` | Codex user standing file |
| `~/.config/opencode/AGENTS.md` | OpenCode user standing file |
| `~/.cursor/skills`, `~/.agents/skills`, … | skills.sh `-g` per selected agent |
| `~/.cursor/plugins/local/<plugin>/` | Copied domain plugins (survives `npx` cache eviction) |

**Customize → User Rules** in Cursor is **account UI, not files**. This CLI
cannot write that surface.

### Skills

Delegated to skills.sh (path maps stay theirs). Balakit adds `-g` for user
scope and does not treat `.agents` as Cursor’s only branded path.

```bash
npx skills add balacodeio/balakit
npx skills add balacodeio/balakit -g
npx skills add balacodeio/balakit --skill dissect
```

`balakit add <skill>` runs the equivalent. Skills failures exit non-zero
(partial state is reported). Only skills.sh agent ids on Balakit’s verified
allowlist are passed as `-a` (refresh via live `npx skills` smoke when adding a
new target).

### Per-agent destinations (skills.sh + CLI)

| Agent | Skills (project) | Skills (user) | Standing (project) | Standing (user) |
| --- | --- | --- | --- | --- |
| Cursor | `.cursor/skills` **and** `.agents/skills` | `~/.cursor/skills` **and** `~/.agents/skills` | `.cursor/rules/*.mdc` + `AGENTS.md` | Files: `~/.cursor/rules/*.mdc`. Plugins: `~/.cursor/plugins/local/` |
| Claude Code | `.claude/skills` | `~/.claude/skills` | `CLAUDE.md`; scoped `.claude/rules` | `~/.claude/CLAUDE.md` |
| Codex | `.agents/skills` | Vendor: `~/.agents/skills`. skills.sh `-g`: `~/.codex/skills` | `AGENTS.md` | `~/.codex/AGENTS.md` |
| OpenCode | `.opencode/skills` (+ `.agents` / `.claude`) | `~/.config/opencode/skills` | `AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| Copilot | `.github/skills` (+ `.agents` / `.claude`) | `~/.copilot/skills` | `AGENTS.md` + `.github/instructions` | Personal Copilot settings (left alone) |

Optional agents (Cline, Kilo, Windsurf, Gemini CLI, Roo, Zed, Amp, …): skills.sh
only; standing = `AGENTS.md` if they read it.

### Domain plugins (Agent Plugins / Cursor)

`skills/` and `rules/` remain the source of truth. `./sync.sh` materializes
installable domain plugins under `plugins/` plus marketplace catalogs.

**Split:** plugins are the portable **skills** package (Agent Plugins 1.0.0).
The CLI is the **standing-rules** installer. Rules are **not** smuggled into
AP `extensions`.

| Plugin | Ships | Format |
| --- | --- | --- |
| `balakit-core` | rules: `base`, `testing`, `comments`, `changelog` | Cursor Plugin |
| `balakit-seo` | `seo-ai-search` rule only | Cursor Plugin |
| `balakit-seo-skills` | `everything-seo`, `seo-audit` | Agent Plugins + Cursor twin |
| `balakit-marketing` | `marketing-psychology`, `startup-marketing-brain` | Agent Plugins + Cursor |
| `balakit-media` | `media-gen` | Agent Plugins + Cursor |
| `balakit-nlm` | `nlm-skill` | Agent Plugins + Cursor |
| `balakit-engineering` | `authoring-skills-and-rules`, `cloakbrowser-fallback`, `deep-deliberation`, `dissect`, `documentation-writer`, `release-deploy` | Agent Plugins + Cursor |

Skills-only plugins include a root `plugin.json` conforming to
[Agent Plugins](https://agent-plugins.org) v1.0.0 (closed schema, validated at
build). Cursor marketplace still needs `.cursor-plugin/plugin.json` (the indexer
does not fall back to root `plugin.json`). The same payload also gets thin
`.codex-plugin/` and `.claude-plugin/` wrappers plus catalogs at
`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`.

Every plugin manifest version equals `package.json` `version` (the kit version).
Skill `SKILL.md` frontmatter `version:` stays independent.

See `plugins/README.md`. Regenerate with `node scripts/build-plugins.mjs`.

#### Cursor public marketplace

Do **not** submit from a routine change. When you are ready:

1. `./sync.sh` (lockstep versions with `package.json`).
2. Follow [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).
3. Point the listing at this repo’s `.cursor-plugin/marketplace.json` / `plugins/`.

## Capability model

Balakit does **not** claim every tool is fully supported. Each entry records:

- **rules confidence** — verified / optional / unknown / unsupported
- **standing surface** — usually `AGENTS.md` (+ `CLAUDE.md` / always-on and scoped Cursor `.mdc` when required)
- **skills** — delegated to skills.sh when a target id exists

`balakit list` and `balakit status` print the matrix (`*` = detected). Detection
is a recommendation only.

| Tier | Meaning |
| --- | --- |
| Common | `AGENTS.md` + Agent Skills / `SKILL.md` via skills.sh |
| Required natives | `CLAUDE.md` twin; Cursor `.mdc` for always-on and glob-scoped rules |
| Optional / delegated | Windsurf, Roo, Gemini CLI, Zed, Amp, Cline, Kilo, pi, … — skills via skills.sh; rules via AGENTS.md when they read it |
| Unknown / unsupported | e.g. Aider (config-only AGENTS), Amazon Q native rules — documented, not auto-written |

## Updating & removing

```bash
npx balakit update                    # refresh project manifest
npx balakit update --scope user       # refresh ~/.balakit/installed.json
npx balakit remove testing
npx balakit status                    # manifests, home/project Cursor surfaces, matrix
```

Ownership: `.balakit/installed.json` (project) and `~/.balakit/installed.json`
(user). Schema v2 records agents and surfaces. Older manifests still load.
`status` shows home surfaces (rules / skills / plugins/local) and drift vs
manifests. `doctor` remains a Mental redirect.

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
.claude-plugin/marketplace.json  # Claude thin catalog (skills-only plugins)
.agents/plugins/marketplace.json # Codex thin catalog (skills-only plugins)
.github/workflows/          # CI lockstep + tag-triggered release/npm publish
scripts/build-agent-rules.mjs  # generates CLAUDE.md + AGENTS.md (shared render)
scripts/build-plugins.mjs      # generates plugins/ + marketplace catalogs
scripts/plugins-catalog.mjs    # domain plugin membership
scripts/check-lockstep.mjs     # fail if plugin versions ≠ package.json
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

Plugin / marketplace versions must equal `package.json` `version`. Never
hand-edit generated `version` fields — bump `package.json`, then `./sync.sh`.

```bash
npm test
npm run lockstep    # rebuild plugins and fail if versions drift or git is dirty
```

CI on `master` / `staging` runs tests + lockstep. Pushing a `v*` tag runs
`.github/workflows/release.yml`: lockstep, changelog notes, GitHub Release,
`npm publish` (`latest` or dist-tag `beta` when the tag contains `-beta.`).
Needs repo secret `NPM_TOKEN`. Skill `SKILL.md` `version:` stays independent of
the kit version.

## License

MIT — see [LICENSE](LICENSE).
