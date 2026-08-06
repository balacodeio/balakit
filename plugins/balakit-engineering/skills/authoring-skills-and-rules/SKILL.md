---
name: authoring-skills-and-rules
description: >-
  Author Skills (SKILL.md) and rules/instructions across Claude Code, Cursor,
  OpenCode, Codex, and GitHub Copilot. Covers frontmatter, file layout,
  activation model, cross-platform mirroring, and the universal craft:
  progressive disclosure, trigger-rich descriptions (context pointers), leading
  words, token budget, naming, and what to leave out.
  Use when the user asks to write, scaffold, refactor, port, or review a Skill,
  Cursor rule (.mdc), AGENTS.md, copilot-instructions, or prompt file — or to
  make one Skill/rule work across multiple agents.
user-invocable: true
disable-model-invocation: false
version: "1.1.0"
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

> **Leading words:** progressive disclosure, context pointer, token budget,
> trigger-rich description, leading words, phase separation, branch-specific
> reference, single source of truth, deletion test.

A practitioner's guide to writing and maintaining the two artifact families that
steer coding agents — **Skills** (on-demand, procedural capabilities) and
**Rules / instructions** (standing context) — across **Claude Code, Cursor,
OpenCode, Codex, and GitHub Copilot**.

**Trigger:** `/authoring-skills-and-rules`, or any request to write, port, or
review a Skill or rule. If the target platform(s) are unstated, ask before
scaffolding — the file layout differs per platform.

This skill carries the per-platform exact details in `references/` (loaded on
demand). The body below is the decision model + the universal craft + a
phase-separated workflow.

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

## User-invoked vs Model-invoked

For Skills, the second decision (after Skill-vs-Rule) is **how the Skill is
triggered**. The `description` is the swing vote.

| Flag combination | What the agent sees | What the user does | When to pick |
|---|---|---|---|
| `user-invocable: true` + `disable-model-invocation: false` (BOTH) | Description in context — agent may auto-invoke | May also `/command` invoke | Common, safe workflows where auto-detect is desired (this skill) |
| `user-invocable: true` + `disable-model-invocation: true` (USER-ONLY) | Description hidden from agent | Must `/command` invoke explicitly | Heavy pipelines the user must opt into (e.g. `deep-deliberation`) — minimizes context load + unpredictability |
| `user-invocable: false` (MODEL-ONLY, rare) | Description in context | Cannot invoke manually | Almost never — restricts user control |

**Heuristic:** if the workflow is cheap and the user benefits from the agent
auto-detecting the need → BOTH. If the workflow is heavy (multiple subagents,
human checkpoints, large context budget) → USER-ONLY, so the agent does not
fire it on a whim.

---

## Cross-platform support — the leverage point

**`SKILL.md` is now a cross-agent standard.** As of Dec 2025, all five — Claude
Code, Cursor, OpenCode, Codex, *and* Copilot — auto-discover Skills from a
`skills/` directory. Author a Skill once and mirror the folder into each agent's
location. What still differs sharply is **rules** (standing instructions).

**Key leverage:** `.agents/skills/` and `.claude/skills/` are shared cross-agent
directories — Codex, OpenCode, *and* Copilot all read them (and Claude Code
reads `.claude/skills/`). A single authored folder, mirrored (or symlinked) into
the right places, covers every agent for skills. The remaining per-agent work
is **rules**.

For the per-platform exact paths, precedence, field semantics, and the mirror
strategy this very repo uses, see:
- [references/cross-platform.md](references/cross-platform.md) — write-once-run-everywhere strategy
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

### 3. Leading words — the agent's reasoning anchor
**Leading words** are dense phrases that pack a lot of meaning into a small
space. Put them in the skill body (typically under the title as a banner) and
the agent will repeat them in its own reasoning traces, which anchors its
behavior to your intent without long prose.

- ✅ `vertical slice` instead of "don't code layer by layer; seek feedback early".
- ✅ `ground truth` instead of "always read the real artifacts before branching".
- Place them once as a banner, then echo them where the corresponding behavior
  is required. The agent's thinking traces are the audit channel — if it is not
  echoing the leading word, the steering did not take.

### 4. Naming and scope
- **One capability per Skill.** Gerund or plain-descriptive names
  (`processing-pdfs`, `authoring-skills-and-rules`) beat vague ones (`helper`,
  `utils`). The Skill folder name **must equal** the `name` in frontmatter (and
  on OpenCode/Codex, match the directory).
- **One concept per rule.** Split large standards into composable rules rather
  than one giant file.

### 5. Write for a smart reader, concretely
- Assume the agent is capable — don't explain `git`, `npm`, or basic concepts.
- Be **actionable and specific**, like a sharp internal doc. Prefer examples and
  `@file` / path references over pasting whole files.
- **No time-sensitive phrasing** ("after August 2025, do X"). Skills are
  long-lived; describe the current way and collapse legacy into an aside.
- **Justify constants** (why `timeout=30`), and **declare dependencies** and how
  to install them — never assume a tool is present.

### 6. What to leave out
- Secrets, API keys, tokens — ever.
- Whole style guides (use a linter) and generic tool docs the agent already knows.
- Rare edge cases and duplicated codebase docs (link to the canonical source).
- **No-ops** — paragraphs that, if deleted, would not change agent behavior. Run
  the deletion test: if the agent would still do the right thing without it, cut it.
- **Sediment** — stale instructions left by previous authors. Audit and prune.

---

## Workflow — 4 phases (creating or updating)

Each phase ends with a checkpoint. Do not skip ahead — phase separation prevents
the agent from rushing to draft before the scope is locked.

### Phase 1 — Scope

```
- [ ] Classify: Skill vs rule (use the table above)
- [ ] Choose invocation: BOTH vs USER-ONLY (use the decision table above)
- [ ] Confirm target platform(s) — ask if unstated
```

🛑 **Checkpoint:** State the classification, invocation flag, and platform list
in one sentence. Do not proceed to Draft until the user confirms (or you are
explicitly operating solo and the scope is unambiguous).

### Phase 2 — Draft

```
- [ ] Write the description first (triggers + what + when), third person
- [ ] Scaffold the correct file layout per platform (see references/)
- [ ] Write the lean body; inject leading words; push depth to references/,
      logic to scripts/
```

🛑 **Checkpoint:** Read the description aloud. If you cannot name the triggers
crisply, the scope is still fuzzy — go back to Phase 1.

### Phase 3 — Distribute

```
- [ ] Mirror/port the source folder to every requested platform
- [ ] For Copilot, translate to .github/instructions/*.instructions.md
      (applyTo if path-scoped) or .prompt.md
- [ ] For Skills: copy the folder to each platform's location
      (see references/cross-platform.md)
```

🛑 **Checkpoint:** `grep` the `name:` slug across the repo. Every mirror must be
in sync before validating.

### Phase 4 — Validate

Run the checklist below. Any miss → back to the relevant phase.

### Updating an existing Skill or rule

The 4 phases apply, with these additions:
- **Phase 1:** `grep` the `name:` slug across the repo to locate every copy
  (source + mirrors under `.cursor/`, `.agents/`, `.claude/`).
- **Phase 2:** Edit the **source of truth** only; never hand-edit a mirror.
  Bump the `version` (SemVer) in frontmatter. Re-check the description against
  the new behavior — stale triggers are the most common rot.
- **Phase 3:** Re-mirror from source so mirrors never drift. Update the
  changelog/README if the repo tracks them.
- **Phase 4:** Same checklist.

---

## Validation checklist (before declaring done)

- [ ] `name` matches the folder name; lowercase-hyphen; no reserved words.
- [ ] `description` is third person, ≤1024 chars, and states **what + when** with
      concrete triggers.
- [ ] Invocation flags set intentionally (BOTH vs USER-ONLY) and match the
      workflow's weight.
- [ ] Leading words injected as a banner and echoed where the corresponding
      behavior is required.
- [ ] Entry file is lean (well under 500 lines); depth is in `references/`.
- [ ] References are one level deep; no nested reference chains.
- [ ] No secrets; dependencies declared; constants justified.
- [ ] Correct frontmatter for the platform (e.g. Cursor `globs`/`alwaysApply`;
      Copilot `applyTo`).
- [ ] If multi-platform: every requested platform has its copy/translation, and
      mirrors are in sync.
- [ ] One capability per Skill / one concept per rule.
- [ ] Deletion test run on every paragraph — no no-ops, no sediment.

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
