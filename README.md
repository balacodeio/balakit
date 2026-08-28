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

Works in Cursor, Claude Code, Copilot, Codex, OpenCode, and anything that can run a shell:

```text
Install Balakit from https://github.com/afaraha8403/balakit (npm package: balakit).

Balakit is an opinionated rules + skills kit for AI coding agents. Standing rules go AGENTS.md-first (plus CLAUDE.md and Cursor .mdc). Skills go through skills.sh. Domain plugins copy to ~/.cursor/plugins/local/ on user-scope install.

Mental continuity is a separate product. Keep Mental. Do not delete ~/.mental, ~/.cursor/rules/mental.mdc, skills named mental, or ~/.cursor/plugins/local/mental. Do not run `balakit remove mental` expecting files to disappear — that flag only prints https://github.com/afaraha8403/mental.

Cleanup leftover Balakit 1.x Mental wiring only:
- If ~/.balakit/installed.json lists rule/skill "mental" from an old kit, delete that ledger (or strip the mental entries). Mental's own files stay.
- Remove stale leftover skill dirs from old global installs if they are not Mental: nlm-skill, release-deploy under ~/.cursor/skills, ~/.claude/skills, ~/.agents/skills (release-deploy now lives inside the balakit-engineering plugin). Keep Cloudflare / other non-Balakit plugins.

Ask me: this repo (--scope project, default) or this machine (--scope user). Then:

  npx balakit@latest status
  npx balakit@latest init --scope <project|user> -y --agents <detected or cursor,claude-code,opencode,codex,copilot>

init writes team rules (base, testing, comments, changelog, release). User scope also copies plugins/balakit-* into ~/.cursor/plugins/local/ beside Mental. It does not install skills.

Then install all kit skills for the agents I named:

  npx balakit@latest add authoring-skills-and-rules cloakbrowser-fallback deep-deliberation dissect documentation-writer release-deploy everything-seo seo-audit marketing-psychology startup-marketing-brain media-gen nlm-skill --scope <project|user> --agents <same agents> -y

Do not also npm publish or gh release create. After install, run `npx balakit@latest status`, tell me what it reports, and remind me to reload Cursor if plugins/local changed. Customize → User Rules is account UI — the CLI cannot write it.
```

## Highlights

- **Two scopes.** `--scope project` (this repo) vs `--scope user` (this machine, all projects).
- **Rules ≠ skills.** `init` = standing rules. `add <skill>` = skills.sh (`-g` on user scope).
- **Cursor plugins are copies.** User-scope install writes `~/.cursor/plugins/local/balakit-*` so they survive `npx` cache eviction. Reload the window, then check Customize.
- **One version when you ship.** Git tag `vX.Y.Z`, `package.json` `"version"`, CHANGELOG heading, and npm publish are the same semver (`release` rule).
- **Mental moved out.** Continuity lives in [@balacode/mental](https://www.npmjs.com/package/@balacode/mental). Balakit does not own `~/.mental`.

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

`--agents <ids|all>` selects skills.sh targets (default: detect). `--personal` is **not** user scope — leftover Mental flag; it prints the Mental URL and exits. Same for `doctor` and `--mental-*`.

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

Rules are **not** stuffed into Agent Plugins `extensions`. Every plugin `version` equals `package.json`. Skill `SKILL.md` `version:` stays independent.

Cursor public marketplace: do **not** submit from a routine change. When you are ready, `./sync.sh` then follow [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

## Mental (moved)

Continuity is **[Mental](https://github.com/afaraha8403/mental)**, not Balakit.

```bash
npm i -g @balacode/mental
mental install
```

Journals in `~/.mental` were not deleted when Mental left this kit. Keep them.

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
`init` writes standing rules (and user-scope plugins). Run `balakit add <skills> --scope … --agents …`.

**Will install wipe Mental?**
No, if you follow the paste prompt. Do not delete Mental files. `balakit remove mental` does not delete them; it prints the Mental URL.

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
