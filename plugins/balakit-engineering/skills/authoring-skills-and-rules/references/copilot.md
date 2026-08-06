# GitHub Copilot — Skills, instructions & prompt files

Copilot supports **three** customization mechanisms: Agent Skills (`SKILL.md`,
since Dec 2025), standing instruction files, and invokable prompt files. Sources:
[GitHub: about agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) ·
[Changelog: Copilot supports Agent Skills (18 Dec 2025)](https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/) ·
[GitHub: add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) ·
[VS Code: custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) ·
[VS Code: prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)

## Agent Skills (`SKILL.md`) — supported since Dec 18, 2025
- Copilot auto-discovers Skills from `.github/skills/<name>/SKILL.md`, and **also
  reads `.claude/skills/` and `.agents/skills/`** — so Skills authored for Claude
  Code / Codex are picked up automatically, no porting needed.
- Same `name` + `description` frontmatter as every other agent. Works across the
  Copilot coding agent, code review, Copilot CLI, the Copilot app, and VS Code
  agent mode.
- **Implication:** a Skill is now the portable, write-once unit across *all five*
  agents. Reach for the instructions/prompt files below only for standing rules
  or quick slash-command prompts — not as a Skill substitute.

## Repository custom instructions — `.github/copilot-instructions.md`
- **Path:** `.github/copilot-instructions.md` (repo root). Plain Markdown, **no
  required frontmatter**.
- **Scope:** applies to **all** Copilot requests in the repo; auto-added. VS Code
  auto-detects it; can be generated with `/init` in Chat.

## Path-specific instructions — `.github/instructions/*.instructions.md`
- **Folder:** `.github/instructions/` (subdirs allowed; configurable via
  `chat.instructionsFilesLocations`).
- **Suffix:** filename must end with **`.instructions.md`**.
- **Frontmatter `applyTo`** — glob(s) controlling auto-application:
  - `applyTo: "**"` (all files), `applyTo: "**/*.ts"`, multi:
    `applyTo: "**/*.ts,**/*.tsx"`, scoped: `applyTo: "src/**/*.py"`.
  - If `applyTo` is omitted, the file is **not** applied automatically (can still
    be attached manually).
  - Optional `excludeAgent`: `"code-review"` or `"cloud-agent"`.
- **Combination:** matching path-specific files combine with repo-wide
  `copilot-instructions.md`; multiple matches all apply.

## Prompt files — `.github/prompts/*.prompt.md` (VS Code)
- **Folder:** `.github/prompts/` (or user profile; `chat.promptFilesLocations`).
- **Suffix:** **`.prompt.md`**. Invoke with `/<prompt-name>` in Chat.
- **Frontmatter (all optional):** `description`, `name` (defaults to filename),
  `argument-hint`, `agent` (`ask`/`agent`/`plan`/custom — this is the current
  field; the old `mode` is superseded), `model`, `tools` (supports
  `<server>/*`).

## AGENTS.md support
- Copilot treats `AGENTS.md` (and `CLAUDE.md` / `GEMINI.md`) as **agent
  instructions**; can live anywhere — the **nearest** in the tree wins.
- **Precedence** (high → low): path-specific `*.instructions.md` →
  `.github/copilot-instructions.md` → `AGENTS.md`. Overall: personal > repository
  > organization. AGENTS.md and copilot-instructions.md generally **combine**.

## Relevant VS Code settings
- `chat.instructionsFilesLocations`, `chat.promptFilesLocations`,
  `chat.useCustomizationsInParentRepositories`,
  `chat.useAgentsMdFile` / `chat.useNestedAgentsMdFiles` / `chat.useClaudeMdFile`.
- Legacy/deprecated (VS Code 1.102): `github.copilot.chat.codeGenerationInstructions`,
  `...testGenerationInstructions` — replaced by `*.instructions.md`. Still active:
  `...reviewSelection.instructions`, `...commitMessageGeneration.instructions`,
  `...pullRequestDescriptionGeneration.instructions`.

## Content best practices (GitHub)
- **Short, self-contained statements** — each adds context to every request.
- **"Must be no longer than 2 pages"** and **"must not be task specific."**
- Good `copilot-instructions.md` content: repo summary (size/languages/
  frameworks), validated build/test/run/lint sequences, project layout & key
  paths, pre-check-in validation steps.
- Avoid external links and conflicting/overlapping instructions.

## Instructions vs Skills — when to use which
- **Reusable procedure / capability** → a **Skill** (`SKILL.md`). Copilot now
  loads these natively (with `references/` + `scripts/`), so the same folder you
  mirror to `.claude/skills` / `.agents/skills` already serves Copilot. No
  stripping or translation needed.
- **Always-on project guidance** → `.github/copilot-instructions.md`.
- **Language/path-scoped guidance** → `.github/instructions/<x>.instructions.md`
  with `applyTo`.
- **Quick slash-command prompt** → `.github/prompts/<x>.prompt.md`, invoked
  `/<name>`.
