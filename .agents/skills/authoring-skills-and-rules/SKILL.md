---
name: authoring-skills-and-rules
description: >-
  Authoritative workflow for creating and updating agent Skills (SKILL.md) and
  rules/instructions across five platforms — Claude Code, Cursor, OpenCode,
  Codex, and GitHub Copilot. Covers the exact file locations, frontmatter fields,
  and activation models for each, plus the universal craft: progressive
  disclosure, writing trigger-rich descriptions, naming, size budgets, and what
  to leave out. Use when the user asks to write, author, scaffold, refactor,
  port, or review a Skill, Cursor rule (.mdc), AGENTS.md, copilot-instructions,
  instructions file, or prompt file — or to make one Skill/rule work across
  multiple agents.
user-invocable: true
disable-model-invocation: false
version: "1.0.0"
author: "Ali Farahat"
tags: ["meta", "skills", "rules", "authoring", "cross-platform", "claude-code", "cursor", "opencode", "codex", "copilot"]
when_to_use: |
  USE WHEN:
  - The user asks to create, scaffold, write, or update a Skill (SKILL.md) or a
    rule/instructions file for any agent.
  - The user wants the SAME capability available across more than one agent
    (Claude Code, Cursor, OpenCode, Codex, Copilot) and needs the correct file
    layout for each.
  - The user asks to port/translate an existing Skill or rule from one platform
    to another, or to review one for quality.
  - The user is unsure which artifact to use (Skill vs rule vs slash command vs
    AGENTS.md) for a given behavior.

  DO NOT USE WHEN:
  - The task is to USE an existing skill, not to author one.
  - The user wants product/feature code with no agent-instruction component.
---

# Authoring Skills and Rules (cross-platform)

A practitioner's guide to writing and maintaining the two artifact families that
steer coding agents — **Skills** (on-demand, procedural capabilities) and
**Rules / instructions** (standing context) — across **Claude Code, Cursor,
OpenCode, Codex, and GitHub Copilot**.

**Trigger:** `/authoring-skills-and-rules`, or any request to write, port, or
review a Skill or rule. If the target platform(s) are unstated, ask before
scaffolding — the file layout differs per platform.

This skill carries the per-platform exact details in `references/` (loaded on
demand). The body below is the decision model and the universal craft.

---

## The one decision that comes first: Skill vs Rule

Pick the artifact by **how the behavior should load**, not by topic.

| | **Skill** (`SKILL.md`) | **Rule / instructions** |
|---|---|---|
| Loads | On demand — only when the task matches its `description` | Standing — always, or auto-attached by file glob |
| Cost | ~Free until triggered (only the description is always in context) | Taxes every request it applies to |
| Best for | Multi-step procedures, reusable workflows, domain playbooks | Project facts, coding standards, guardrails, style |
| Analogy | A specialist you call in | House rules pinned to the wall |
| Portable as | One folder, near-identical across 4 of 5 platforms | Format differs sharply per platform |

Rules of thumb:
- **Procedure or workflow → Skill.** If it has steps, checkpoints, or scripts.
- **Always-true fact or guardrail → Rule.** "We use Vitest", "never commit
  secrets", "this repo is a monorepo".
- **A standing block that grew past a few paragraphs and became procedural →
  graduate it from the rule/`CLAUDE.md` into a Skill.**
- **One capability per Skill.** If the description needs "and" to cover unrelated
  jobs, split it.

---

## Cross-platform support matrix

The big picture: **`SKILL.md` is now a cross-agent standard.** As of Dec 2025,
all five — Claude Code, Cursor, OpenCode, Codex, *and* Copilot — auto-discover
Skills from a `skills/` directory. Author a Skill once and mirror the folder into
each agent's location. What still differs sharply is **rules** (standing
instructions): each platform has its own format and file.

| Platform | Skills? | Skill location | Rules / instructions | Rule frontmatter |
|---|---|---|---|---|
| **Claude Code** | ✅ | `.claude/skills/<name>/SKILL.md` · `~/.claude/skills/` | `CLAUDE.md` (+ `@import`); `.claude/rules/*.md` (`paths:` scoped); `.claude/commands/*.md` | — (`.md`, not `.mdc`) |
| **Cursor** | ✅ (via skills.sh) | `.cursor/skills/<name>/SKILL.md` | `.cursor/rules/*.mdc` | `description`, `globs`, `alwaysApply` |
| **OpenCode** | ✅ | `.opencode/skills/<name>/SKILL.md`; also reads `~/.claude/skills`, `~/.agents/skills` (+ project `.claude/`, `.agents/`) | `AGENTS.md` + `instructions[]` in `opencode.json` | — |
| **Codex** | ✅ (since Dec 2025) | `.agents/skills/<name>/SKILL.md` (+ parent / repo-root / `~/.agents/skills` / `/etc/codex/skills`) | `AGENTS.md` / `AGENTS.override.md` + `~/.codex/config.toml` | — |
| **Copilot** | ✅ (since Dec 2025) | `.github/skills/<name>/SKILL.md`; also reads `.claude/skills`, `.agents/skills` | `.github/copilot-instructions.md`; `.github/instructions/*.instructions.md`; `.github/prompts/*.prompt.md`; `AGENTS.md` | `applyTo` (instructions); `description`/`agent`/`model`/`tools` (prompts) |

> **Key leverage point:** `.agents/skills/` and `.claude/skills/` are shared
> cross-agent directories — Codex, OpenCode, *and* Copilot all read them (and
> Claude Code reads `.claude/skills/`). A single authored folder, mirrored (or
> symlinked) into the right places, covers every agent for skills. The remaining
> per-agent work is **rules**. See [references/cross-platform.md](references/cross-platform.md)
> for the mirror strategy this very repo uses.

Per-platform exact paths, precedence, and field semantics:
- [references/claude-code.md](references/claude-code.md)
- [references/cursor.md](references/cursor.md)
- [references/opencode.md](references/opencode.md)
- [references/codex.md](references/codex.md)
- [references/copilot.md](references/copilot.md)

---

## Universal craft (applies to every platform)

### 1. The description is the product
On every platform, the **description is the only thing always in context** — it
is what the model reads to decide whether to pull in the Skill or rule. Spend
your effort here.

- Write it in the **third person**, stating **what it does + when to use it**.
- Pack in **concrete triggers**: file types, tool names, verbs, user phrases.
  - ✅ "Extract text and tables from PDFs, fill forms, merge documents. Use when
    the user mentions PDFs, forms, or document extraction."
  - ❌ "Helps with documents." / "I can help you with files."
- For an **Agent-Requested Cursor rule**, the description is the *whole* trigger —
  name the framework/domain and the situations that should pull it in.
- **Limits:** Anthropic Skill `description` ≤ **1024 chars**; `name` ≤ **64 chars**,
  lowercase + digits + hyphens only, no `anthropic`/`claude`.

### 2. Progressive disclosure — keep the entry file lean
Once a Skill/rule loads, every token competes with the conversation. Structure so
detail loads only when needed.

- **SKILL.md body: keep it well under ~500 lines.** Cursor docs say the same for
  rules: **"Keep rules under 500 lines."**
- Put depth in **`references/*.md`** (zero token cost until the agent reads them)
  and executable logic in **`scripts/`** (run, not loaded into context).
- **Reference one level deep only.** A reference that links to another reference
  may get truncated (the agent previews with `head`) and lose context.

```
<skill-name>/
├── SKILL.md            # metadata + decision model + workflow (lean)
├── references/         # per-topic detail, loaded on demand
│   └── <topic>.md
└── scripts/            # executable helpers (optional)
```

### 3. Naming and scope
- **One capability per Skill.** Gerund or plain-descriptive names
  (`processing-pdfs`, `authoring-skills-and-rules`) beat vague ones (`helper`,
  `utils`). The Skill folder name **must equal** the `name` in frontmatter (and
  on OpenCode/Codex, match the directory).
- **One concept per rule.** Split large standards into composable rules rather
  than one giant file.

### 4. Write for a smart reader, concretely
- Assume the agent is capable — don't explain `git`, `npm`, or basic concepts.
- Be **actionable and specific**, like a sharp internal doc. Prefer examples and
  `@file` / path references over pasting whole files.
- **No time-sensitive phrasing** ("after August 2025, do X"). Skills are
  long-lived; describe the current way and collapse legacy into an aside.
- **Justify constants** (why `timeout=30`), and **declare dependencies** and how
  to install them — never assume a tool is present.

### 5. What to leave out
- Secrets, API keys, tokens — ever.
- Whole style guides (use a linter) and generic tool docs the agent already knows.
- Rare edge cases and duplicated codebase docs (link to the canonical source).

---

## Workflow — creating a new Skill or rule

Track progress out loud:

```
- [ ] 1. Classify: Skill vs rule (use the table above)
- [ ] 2. Confirm target platform(s) — ask if unstated
- [ ] 3. Draft the description (triggers + what + when), third person
- [ ] 4. Scaffold the correct file layout per platform (see references/)
- [ ] 5. Write the lean body; push depth to references/, logic to scripts/
- [ ] 6. Mirror/port to every requested platform
- [ ] 7. Validate against the checklist
```

1. **Classify.** Skill (procedure) or rule (standing context)? If procedural,
   default to a Skill so it stays out of context until needed.
2. **Confirm platforms.** Which agents must this serve? This sets the file
   layout and whether a Copilot translation is needed.
3. **Description first.** Write and pressure-test it before the body — if you
   can't name the triggers crisply, the scope is still fuzzy.
4. **Scaffold** using the exact paths/frontmatter in the per-platform reference.
5. **Body lean, depth out.** Decision model + workflow in the entry file;
   everything else in `references/`.
6. **Mirror/port.** For Skills, copy the folder to each platform's location (see
   [references/cross-platform.md](references/cross-platform.md)). For Copilot,
   translate the Skill into `.github/instructions/*.instructions.md` (use
   `applyTo` if path-scoped) or a `.prompt.md`.
7. **Validate** (below).

---

## Workflow — updating an existing Skill or rule

1. **Locate every copy.** A Skill often lives in a source dir plus mirrors
   (`.cursor/`, `.agents/`, `.claude/`). Find them all before editing — `grep`
   the `name:` slug across the repo.
2. **Edit the source of truth**, then re-mirror — never hand-edit one copy and
   leave the others to drift.
3. **Bump the `version`** (SemVer) in frontmatter if the Skill carries one.
4. **Re-check the description** against the new behavior — stale triggers are the
   most common rot.
5. **Validate** and update the changelog/README if the repo tracks them.

---

## Validation checklist (before declaring done)

- [ ] `name` matches the folder name; lowercase-hyphen; no reserved words.
- [ ] `description` is third person, ≤1024 chars, and states **what + when** with
      concrete triggers.
- [ ] Entry file is lean (well under 500 lines); depth is in `references/`.
- [ ] References are one level deep; no nested reference chains.
- [ ] No secrets; dependencies declared; constants justified.
- [ ] Correct frontmatter for the platform (e.g. Cursor `globs`/`alwaysApply`;
      Copilot `applyTo`).
- [ ] If multi-platform: every requested platform has its copy/translation, and
      mirrors are in sync.
- [ ] One capability per Skill / one concept per rule.

---

## References

| File | Use it for |
|---|---|
| [references/claude-code.md](references/claude-code.md) | Claude Code: SKILL.md fields, `.claude/` paths, CLAUDE.md, slash commands |
| [references/cursor.md](references/cursor.md) | Cursor: `.mdc` frontmatter, the 4 activation modes, `.cursor/` layout |
| [references/opencode.md](references/opencode.md) | OpenCode: AGENTS.md, `opencode.json`, agents/commands/skills dirs |
| [references/codex.md](references/codex.md) | Codex: AGENTS.md hierarchy, `config.toml`, `.agents/skills`, prompts (deprecated) |
| [references/copilot.md](references/copilot.md) | Copilot: copilot-instructions, `*.instructions.md` (`applyTo`), prompt files |
| [references/cross-platform.md](references/cross-platform.md) | Write-once-run-everywhere: the mirror/symlink strategy + AGENTS.md convergence |
