<h1 align="center">balakit</h1>

<p align="center"><strong>Opinionated rules and skills for AI coding agents.</strong></p>

<p align="center">
  Standing rules land AGENTS.md-first. Skills go through <a href="https://skills.sh/">skills.sh</a>.<br>
  Domain groups ship as <a href="https://agent-plugins.org">Agent Plugins</a> + Cursor local plugins.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/balakit"><img src="https://img.shields.io/npm/v/balakit.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <a href="https://agent-plugins.org/specification"><img src="https://img.shields.io/badge/Agent%20Plugins-1.0.0-111111.svg" alt="Agent Plugins 1.0.0"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#paste-this-into-your-agent">Paste into your agent</a> ·
  <a href="#faq">FAQ</a>
</p>

Take what you like, ignore the rest: meta-principle, simplicity ladder, changelog / testing / comments discipline, SEO guardrails, and release version lockstep.

## Quick start

```bash
npx balakit                      # guided: this repo vs this machine
npx balakit init -y              # this repo — team rules
npx balakit init --scope user -y # this machine — user rules + Cursor plugins
```

`init` installs **standing rules** (and, on `--scope user`, copies Cursor plugins to `~/.cursor/plugins/local/`). **Skills are a second step** — `init` does not run skills.sh.

```bash
npx balakit add dissect --scope user --agents claude-code,opencode -y
npx balakit status
```

Node `>=18`. Preview with `--dry-run`. `-y` skips confirms.

### Paste this into your agent

Works in Cursor, Claude Code, Copilot, Codex, OpenCode, and anything that can install a plugin or run a shell:

```text
Install Balakit from https://github.com/afaraha8403/balakit (npm package: balakit).

Balakit is an opinionated rules + skills kit. Standing rules go AGENTS.md-first (plus CLAUDE.md and Cursor .mdc). Skills are Agent Skills. Domain groups ship as Agent Plugins 1.0.0 packages (https://agent-plugins.org/specification).

This repo is a marketplace, not a single root plugin.json. Do not /add-plugin the repo root. Portable packages live under plugins/:
- Skill plugins: balakit-engineering, balakit-marketing, balakit-media, balakit-nlm, balakit-seo-skills (each has plugin.json + skills/)
- Cursor also ships balakit-core and balakit-seo (rules) via .cursor-plugin/marketplace.json (pluginRoot: plugins)
Manifests: .cursor-plugin/marketplace.json · .claude-plugin/marketplace.json · .agents/plugins/marketplace.json

Ask me: this repo (--scope project, default) or this machine (--scope user).

If this client can install plugins natively, do that FIRST. Native install loads the skill packages; it does not write AGENTS.md standing rules.

  Cursor: do not /add-plugin the repo URL. User-scope CLI copies plugins to ~/.cursor/plugins/local/. Or add marketplace https://github.com/afaraha8403/balakit from Customize → Plugins, enable the plugins, reload the window.
  Claude Code: /plugin marketplace add afaraha8403/balakit
               then /plugin install <name>@balakit for: balakit-engineering, balakit-marketing, balakit-media, balakit-nlm, balakit-seo-skills
  Codex:       codex plugin marketplace add afaraha8403/balakit
               then `codex plugin add <name>@balakit` for the same five names
  Copilot CLI: copilot plugin marketplace add afaraha8403/balakit
               then `copilot plugin install <name>@balakit` for the same five names
  VS Code:     Command Palette → Chat: Install Plugin From Source wants a single plugin.json. Point it at a plugins/balakit-* folder, or skip and use the CLI below.

Then always write standing rules (`init` does not run skills.sh):

  npx balakit@latest init --scope <project|user> -y

If native plugin install already loaded the five skill plugins, skip the next add. If this client has no plugin install, or native failed:

  npx balakit@latest add authoring-skills-and-rules cloakbrowser-fallback deep-deliberation dissect documentation-writer release-deploy everything-seo seo-audit marketing-psychology startup-marketing-brain media-gen nlm-skill --scope <project|user> --agents <detected or cursor,claude-code,opencode,codex,copilot> -y

Do not npm publish or gh release create. Run `npx balakit@latest status`, tell me what it reports, and remind me to reload Cursor if plugins/local or the plugin UI changed. Customize → User Rules is account UI — the CLI cannot write it.
```

## Highlights

- **Two scopes.** `--scope project` (this repo) vs `--scope user` (this machine, all projects).
- **Rules ≠ skills.** `init` = standing rules. `add <skill>` = skills.sh (`-g` on user scope).
- **Native plugins when the client supports them.** Marketplace manifests ship in-repo. Cursor: `~/.cursor/plugins/local/` (CLI copy) or add the GitHub marketplace. Claude / Codex / Copilot: marketplace add `afaraha8403/balakit`, then install the five skill plugins. Standing rules still come from `balakit init`.
- **One version when you ship.** Git tag `vX.Y.Z`, `package.json` `"version"`, CHANGELOG heading, and npm publish are the same semver (`release` rule).

## Scopes

| | Project (`--scope project`) | User (`--scope user`) |
| --- | --- | --- |
| Manifest | `.balakit/installed.json` | `~/.balakit/installed.json` |
| Standing | `AGENTS.md` + `CLAUDE.md` managed blocks; `.cursor/rules/*.mdc` | `~/.cursor/rules/*.mdc`; `~/.claude/CLAUDE.md`; `~/.codex/AGENTS.md`; `~/.config/opencode/AGENTS.md` |
| Skills | skills.sh into the repo; Cursor also gets `.cursor/skills` → `.agents/skills` | skills.sh `-g`; Claude Code symlinks under `~/.claude/skills`; OpenCode loads `~/.agents/skills` (and `~/.config/opencode/skills`) |
| Plugins | not copied | `~/.cursor/plugins/local/balakit-*` |

Default team rules: `base`, `testing`, `comments`, `changelog`, `release`.

`add` **reconciles** with the matching manifest so later adds never shrink the managed block.

## Commands

```bash
npx balakit                         # guided setup
npx balakit init                    # same guided flow
npx balakit init -y                 # team kit, this repo
npx balakit init --scope user -y    # team kit + Cursor plugins, this machine
npx balakit add base testing
npx balakit add dissect --scope user --agents claude-code,opencode
npx balakit list
npx balakit status
npx balakit update                  # project manifest
npx balakit update --scope user     # home manifest
npx balakit remove testing
```

```bash
npm install -g balakit
balakit init
```

`--agents <ids|all>` selects skills.sh targets (default: detect). `--personal`, `doctor`, and `--mental-*` are leftover flags: they print a URL and exit.

## Destinations

| Agent | Skills (project) | Skills (user) | Standing (project) | Standing (user) |
| --- | --- | --- | --- | --- |
| Cursor | `.cursor/skills` **and** `.agents/skills` | `~/.cursor/skills` **and** `~/.agents/skills` | `.cursor/rules/*.mdc` + `AGENTS.md` | `~/.cursor/rules/*.mdc`. Plugins: `~/.cursor/plugins/local/` |
| Claude Code | `.claude/skills` | `~/.claude/skills` (often symlinks to `~/.agents/skills`) | `CLAUDE.md`; scoped `.claude/rules` | `~/.claude/CLAUDE.md` |
| Codex | `.agents/skills` | `~/.agents/skills`; skills.sh `-g` may also use `~/.codex/skills` | `AGENTS.md` | `~/.codex/AGENTS.md` |
| OpenCode | `.opencode/skills` (+ `.agents` / `.claude`) | `~/.agents/skills` (skills.sh “universal”); also `~/.config/opencode/skills` | `AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| Copilot | `.github/skills` (+ `.agents` / `.claude`) | `~/.copilot/skills` | `AGENTS.md` + `.github/instructions` | Personal Copilot settings (left alone) |

Optional agents (Cline, Kilo, Windsurf, Gemini CLI, Roo, Zed, Amp, …): skills.sh only; standing = `AGENTS.md` if they read it.

`balakit list` and `balakit status` print the capability matrix (`*` = detected). Detection is a hint, not a guarantee.

Direct skills.sh:

```bash
npx skills add afaraha8403/balakit
npx skills add afaraha8403/balakit -g
npx skills add afaraha8403/balakit --skill dissect
```

## Plugins

`skills/` and `rules/` are the source of truth. `./sync.sh` materializes `plugins/` plus marketplace catalogs.

| Plugin | Ships | Format |
| --- | --- | --- |
| `balakit-core` | rules: `base`, `testing`, `comments`, `changelog`, `release` | Cursor Plugin |
| `balakit-seo` | `seo-ai-search` rule only | Cursor Plugin |
| `balakit-seo-skills` | `everything-seo`, `seo-audit` | Agent Plugins + Cursor twin |
| `balakit-marketing` | `marketing-psychology`, `startup-marketing-brain` | Agent Plugins + Cursor |
| `balakit-media` | `media-gen` | Agent Plugins + Cursor |
| `balakit-nlm` | `nlm-skill` | Agent Plugins + Cursor |
| `balakit-engineering` | `authoring-skills-and-rules`, `cloakbrowser-fallback`, `deep-deliberation`, `dissect`, `documentation-writer`, `release-deploy` | Agent Plugins + Cursor |

Rules are **not** a portable Agent Plugins v1 component (they stay in Cursor plugins + `AGENTS.md`). Every plugin `version` equals `package.json`. Skill `SKILL.md` `version:` stays independent.

Native marketplace add:

```bash
# Claude Code (in chat)
/plugin marketplace add afaraha8403/balakit
/plugin install balakit-engineering@balakit

# Codex
codex plugin marketplace add afaraha8403/balakit
codex plugin add balakit-engineering@balakit

# GitHub Copilot CLI
copilot plugin marketplace add afaraha8403/balakit
copilot plugin install balakit-engineering@balakit
```

Cursor public marketplace: do **not** submit from a routine change. When you are ready, `./sync.sh` then follow [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

## Rules

| Rule | Typical use |
| --- | --- |
| `base` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (Features / Fixes / Changes) |
| `comments` | Comments and documentation comments |
| `release` | Git tag, CHANGELOG heading, `package.json`, and npm publish share one semver |
| `seo-ai-search` | SEO + AI-search implementation (file-scoped) |
| `testing` | Testing philosophy |

## Skills

| Skill | Summary |
| --- | --- |
| `authoring-skills-and-rules` | Create/update Skills and rules across agents |
| `cloakbrowser-fallback` | Stealth Chromium when normal automation is blocked |
| `deep-deliberation` | Checkpointed option comparison before building |
| `dissect` | Audit an existing service/plan into a minimal-build plan |
| `documentation-writer` | Research-first technical documentation |
| `everything-seo` | Comprehensive SEO playbook |
| `marketing-psychology` | Psychology for product and marketing copy |
| `media-gen` | Fal.ai image, video, upscale, dual-model ad creative |
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP |
| `release-deploy` | GitHub tag releases; changelog-driven notes |
| `seo-audit` | SEO audit workflow |
| `startup-marketing-brain` | Startup marketing: distribution, automation, monetization |

## FAQ

**Project or user?**
This repo only → `--scope project` (default). Every project on this PC → `--scope user`. User scope also copies Cursor plugins.

**Why didn’t skills show up after `init`?**
`init` writes standing rules (and user-scope Cursor plugin copies). Skills come from native plugin install **or** `balakit add <skills> --scope … --agents …`.

**Does native plugin install replace the CLI?**
No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the AGENTS.md / CLAUDE.md standing kit. Skip `balakit add` only when this client already loaded the five skill plugins.

**Customize → User Rules is empty.**
That UI is Cursor account settings, not files. The CLI writes `~/.cursor/rules/*.mdc` and `~/.cursor/plugins/local/`. Reload the window.

**Can I mix agents?**
Yes. `--agents cursor,claude-code,opencode` (or `all`). Only verified skills.sh ids are passed as `-a`.

## Developing

`skills/` and `rules/` are the source of truth.

```bash
./sync.sh
npm test
npm run lockstep
```

```powershell
powershell -ExecutionPolicy Bypass -File .\sync.ps1
```

Never hand-edit generated plugin `version` fields — bump `package.json`, then `./sync.sh`.

CI on `master` / `staging`: tests + lockstep. A `v*` tag runs `.github/workflows/release.yml` (GitHub Release + `npm publish`). Repo secret `NPM_TOKEN` must be an npm **Automation** token (publish/classic tokens fail with `EOTP`).

```text
bin/cli.mjs                 # entry
skills/<name>/SKILL.md      # skills source
rules/<name>.mdc            # rules source
plugins/<name>/             # generated domain plugins
.cursor-plugin/marketplace.json
.github/workflows/          # CI + tag-triggered npm publish
sync.sh / sync.ps1
```

---

**npm:** [balakit](https://www.npmjs.com/package/balakit) · **repo:** [afaraha8403/balakit](https://github.com/afaraha8403/balakit) · **license:** [MIT](LICENSE)
