<!-- GENERATED FILE — do not edit by hand.
     Source of truth: rules/*.mdc · Regenerate: ./sync.sh or sync.ps1 -->

# Project Rules

Standing rules for Claude Code, generated from this repository's `rules/*.mdc`. Edit the source rules, then run the sync script to regenerate this file.

<!-- from rules/global.mdc -->
## Global Rules

Applies to every task in this repo. Project-scoped rules extend or override these.

### The Meta-Principle
**The human is monitoring you in the IDE. They can see everything. Your job is to minimize the mistakes they need to catch while maximizing the useful work you produce.**

**On conflict (within these rules):** safety & secrets > correctness > simplicity > brevity. Never compress away a security, data-loss, or accessibility safeguard to satisfy Caveman or Simplicity.

### AI Behavior & Communication (Dual-Mode)

**Caveman Mode (defined):** Terse, compressed prose for the human. Fragments over sentences. Drop filler and articles (a/an/the). Use symbols (→, =, vs) and logical emojis (🐛, 🚀, 🛑, 📝) so the human scans fast. Compress *style* only — never correctness — and leave code, paths, URLs, and commands verbatim. (Mirrors the **Caveman** skill at its `full` level: "why use many token when few token do trick.")

**Reason fully, speak Caveman.** Caveman constrains the *surfaced message*, not your thinking. Plan and reason at full fidelity internally; compress only the text the human reads. Brevity is an output constraint, never a reasoning shortcut.

Two registers — pick by surface:

**1. Chat + summaries → Caveman.** Goal: instant human "aha" at minimum tokens.

**2. Artifacts → Standard Professional Mode.** Code, comments, JSDoc, architecture plans, `CHANGELOG.md`, commit messages, and docs stay highly detailed, articulate, and properly formatted for future developers. Never Caveman.

**Post-Change Summary (Caveman).** On any turn that modifies files, end with this exact block (skip it on read-only / answer-only turns):
- `✅ CHANGES:` [file] — [short reason, e.g. "Auth logic → fixed login bug"]
- `⏭️ BYPASSED:` [file/concept] — [reason, e.g. "Out of scope", "Wait for human"]
- `⚠️ CONCERNS:` [files, or "none"] — [edge cases / risks found]
- For any in-code concern, also inject the matching tag at the line: `// BUG:`, `// FIXME:`, `// TODO:`, `// CONCERN:`, `// OPTIMIZE:`.

### Think Before Coding
**No assumptions. No hidden confusion. Surface tradeoffs.**
- **State assumptions:** Do this before coding. Genuinely blocked? Stop → name the confusion → ask.
- **Ask only when it pays:** Ask when blocked, or when a choice is costly / hard to reverse. Otherwise pick the sane default, act, and state the call in one line. Don't stall on reversible decisions.
- **Surface tradeoffs:** On real forks, present options → let human pick. No silent high-stakes choices.
- **Push back:** Not a yes-machine. Bad human approach? Explain downside → propose alternative. Accept override.

### Simplicity First (Lazy, Not Negligent)
**Best code = the code you never wrote. Write only what the task needs.**

Climb the ladder before writing code → stop at the first rung that works:
1. **Need it?** → No: skip it (YAGNI).
2. **Stdlib does it?** → Use it.
3. **Native platform feature?** → Use it.
4. **Installed dependency?** → Use it. No new dep for what a higher rung covers.
5. **One line?** → One line.
6. **Only then:** the minimum that works.

- **Naive → Optimize:** Build correct naive version first. Verify. Optimize later. Correctness > Performance.
- **Only requested features:** Build exact request. No unasked "flexibility," no speculative abstraction.
- **Duplicate > Abstraction:** No abstractions for single-use code.
- **Validate at trust boundaries:** user input, external API — and not internal glue.
- **Refine:** 200 lines → 50 lines.
- **NEVER cut [non-negotiable]:** trust-boundary validation, data-loss handling, security, accessibility. Code stays small because it is *necessary*, not golfed.

### Surgical Changes & Code Discipline
**Touch only what is needed. Clean your own mess.**
- **Fix cause, not symptom:** Change must trace directly to request. 
- **Leave adjacent code alone:** No side-effect refactoring or formatting tweaks.
- **Match existing style:** Always.
- **Explain "Why":** Articulate, clear inline comments or JSDoc for *why*, not *what* (Standard Mode).
- **Dead code hygiene:** List unreachable code after refactor. Ask to delete. No silent corpses.

### Filesystem, Environment & Execution
- **Strict filesystem:** Ask before creating files. No `.md` unless instructed.
- **Windows-safe commands:** Avoid `&&`. Use separate lines/scripts. Use PowerShell.
- **Protect secrets [CRITICAL]:** Never commit `.env`, credentials, API keys.
- **Env vars:** Update `.env.example` in same change. Comment purpose, format, source.

### Goal-Driven Execution & Validation
**Tests = safety net. Changesets = record.**
- **Test-first:** Complex logic? Write failing test → implement → pass. Show both.
- **Establish criteria:** - Validation: failing test → pass.
  - Bug: failing reproduction → pass.
  - Refactor: pass before → pass after.
- **Skipped tests:** Explain in chat, not code comments.

### Change Log Maintenance
**Maintain human-readable history (Standard Mode - No Caveman).**
- **Version:** SemVer ([Major].[Minor].[Patch]).
- **Grouping:** `[Unreleased]` on top; group entries under `Features` / `Fixes` / `Changes`. A project changelog rule (e.g. `rules/changelog.mdc`), if present, is authoritative.
- **Chronological:** Newest top.
- **Human-Centric:** Clear, articulate impact descriptions. No pure technical logs. 
- **Atomic:** Update `CHANGELOG.md` in same commit/PR.

<!-- from rules/changelog.mdc -->
## Changelog maintenance

### When to update

Update `CHANGELOG.md` (at project root) whenever you or the user:

- Add a **new feature**
- Ship a **significant fix** (bug fix that affects behavior or correctness)
- Make a **notable change** (refactor, config, dependency, or UX change worth documenting)
- Remove or deprecate something user-facing

Do **not** add trivial edits (typos, comment-only, formatting-only) unless the user asks.

### Format (grouped by type)

- **Unreleased at top.** The first section is `## [Unreleased]` for changes not yet in a release.
- **Released versions below.** Each release has a section `## [vX.Y.Z]` or `## [X.Y.Z]` (e.g. `## [v0.0.1-beta.7]`, `## [1.0.0]`). Use the exact version string that will be tagged (with or without leading `v`).
- **Newest release first** under Unreleased. When you cut a release, the previous `[Unreleased]` content can be moved under a new `## [vX.Y.Z]` section.
- **Group by type.** Within each version section, organize entries under three subsections: `### Features`, `### Fixes`, `### Changes`.
- **No type prefix.** Items do not need `**Feature:**`, `**Fix:**`, or `**Change:**` prefixes since they are grouped by section.
- One line per item; keep text concise.

Structure:

```markdown
## Changelog

### [Unreleased]

#### Features
- Short description of new feature.
- Another feature.

#### Fixes
- Bug fix description.
- Another fix.

#### Changes
- Refactor or UX change description.

### [v0.0.1-beta.7]

#### Features
- Something shipped in this version.

#### Changes
- Another change.

### [v0.0.1-beta.6]
- ...
```

### Releases and GitHub

If the project uses a tag-triggered release workflow, it typically looks in `CHANGELOG.md` for a section whose heading matches the pushed tag (e.g. `## [v1.2.3]` or `## [1.2.3]`) and uses that section as the release notes body. Add the version section before tagging so the release notes are populated; if it's missing, the release should still succeed with a default body.

### If the file is missing

If `CHANGELOG.md` does not exist, create it with a title, an `## [Unreleased]` section, and add the relevant entry/entries.

<!-- from rules/comments.mdc -->
## Comments & Documentation

### Default to zero comments

Names document code. Add an inline comment only when the WHY is non-obvious:

- A hidden constraint not visible in the code.
- A subtle invariant a reader might violate.
- A workaround for a specific bug (link the upstream issue).
- Behavior a competent reader would find surprising.

If removing the comment wouldn't confuse a future reader, delete it.

### Never write

- Restatements of the code — `increment counter` above `counter++`.
- Task / ticket references — `added for CAN-123`, `fixes billing bug`.
- Caller references — `used by the contacts module`.
- Change history — `was async before`, `removed old logic`.
- Commented-out code.
- Banner comments — `=== SECTION ===`.

### Authorized Tracking Tags (Exception)

You MUST use the following authorized tags to track technical debt and risks (as required by the Global Rules), using your language's comment syntax. These should cleanly describe the issue for IDE tracking:
- `BUG:` — For critical, immediate issues.
- `FIXME:` — For broken code or technical debt needing refactor.
- `TODO:` — For general planned work.
- `CONCERN:` — For edge cases or architectural risks.
- `OPTIMIZE:` — For performance improvements or clean-up tasks.

### Document every exported symbol

Every part of a module's public surface — exported functions, types, classes, constants — gets a documentation comment in your language's convention (doc comment, docstring, etc.). Internal/private helpers only get one when the WHY is non-obvious.

- The first line is a one-sentence summary ending with a period.
- Document a parameter only when its name isn't self-explanatory. Never restate information the signature already carries (e.g. the type, in a typed language).
- Document the return only when it isn't obvious from the function name.
- Document every error/exception the function can raise as part of its contract.
- Add an example for non-trivial public APIs and shared utilities.
- Don't duplicate what the language already expresses — let the type system, signatures, and tooling do their job.

### Externally-surfaced docs

When documentation strings are generated into a public API surface (OpenAPI/Swagger, SDK docs, generated reference sites, schema descriptions), **those strings ship to external consumers** — write them for API users, not just your team.

- Describe every public field/parameter with a short user-facing sentence.
- Map each endpoint/handler summary to the generated summary and description.
- Declare at least one example response for each public route.

<!-- from rules/mental.mdc -->
## The `.mental/` Personal Knowledge Layer

`.mental/` is the user's private, **per-repo**, gitignored second-brain — a structured knowledge bundle (Open Knowledge Format; the **`mental` skill** carries the full format and procedure) that keeps the user oriented: where the project stands, what they decided and why, what they accomplished, where to resume. **When you begin substantive work in a repo and `.mental/` does not exist yet, create it** (skeleton + a first journal entry) — it is gitignored, so this never touches commits. Don't create it for a read-only or trivial turn. Once it exists: before non-trivial work, re-orient from `.mental/status/current.md` — or derive current state from the latest `journal/` entry's `Resume:` line + git state (branch, recent commits, diff, open PRs) + `decisions/` with `status: open|deferred`. After substantive work, append one consolidated entry to `.mental/journal/<YYYY-MM-DD>.md` ending with a `Resume:` line (next action + open loops). Record decisions — including deferred ones — as concepts in `decisions/`; curate durable, non-obvious, repo-specific facts into `notes/` freely. It is per-repo (each repo gets its own), absent in CI and on other machines — so never surface its contents in commits/PRs or anything leaving the machine, and never touch `.gitignore` for it (it is ignored machine-wide via the user's global git excludes). Cross-repo personal facts belong in your own agent memory, not here. Full structure, templates, and the OKF format: the **`mental` skill**.

<!-- from rules/testing.mdc -->
## Testing

### Philosophy

Every test must earn its place by preventing a bug that would affect users. Do not write tests to hit a coverage number. If you cannot explain what bug a test would catch, do not write it.

Favor integration tests over unit tests. Test real code paths — input validated, work performed, result returned. Reserve unit tests for complex business logic: pricing calculations, date handling, permission resolution. Do not write unit tests for glue code or tests that mock everything away.

### Folder Convention

Mirror the source structure under a single top-level tests location (or your framework's convention), separating tiers clearly:

- Unit tests — complex business logic only.
- Integration tests — the default tier for most behavior.
- End-to-end tests — full-stack flows.

Follow whatever layout the project already uses; do not impose a new one mid-project.

### Tooling

- Use the test runner the project already adopts. Do not introduce an additional test framework without team agreement.
- Match the existing assertion style, fixtures, and mocking approach.
- Keep end-to-end tests pointed at a deployed/staging-like environment rather than hard-coded local URLs when the project's flow expects that.

### When to Write Tests

A behavior change in a PR requires a test that exercises that behavior. "Behavior change" means: what the user sees or what the API returns is different. Refactors that preserve behavior do not require new tests — existing tests should still pass.

**Bug fixes:** Write the failing test first. The test is the proof the bug existed and that the fix works.

### End-to-End Tests

E2E tests are often slow and run against a deployed environment rather than locally. Do not write E2E tests that assume a local server or a specific hard-coded URL unless the project is set up for that.

Do not write E2E tests speculatively. Only write them after the user confirms the feature is done. When a feature implementation appears complete, proactively ask the user (Caveman format):
- *"Feature done? Write E2E?"*

### Secrets [CRITICAL]

Never commit API keys, tokens, passwords, or database URLs in any file — including config, `.env`, source code, or test fixtures.
- Use local-only secret files (e.g. `.env.local`, `.dev.vars`) that are gitignored.
- Use the platform's secret manager for deployed environments.
- Prefer an automated secret scanner (e.g. `gitleaks`) in pre-commit hooks and CI to enforce this.

### Skipping Tests

If you skip tests, say so in chat with the reason — never in a code comment.
**Acceptable reasons:**
1. The path is provably unreachable.
2. An existing test already covers the exact behavior.
3. The human explicitly overrode the test requirement.

## Conditional rules

Apply these only when working on matching files:

- **seo-ai-search** (globs: `**/*.{astro,ts,tsx,jsx,vue,svelte,md,mdx}`) — Universal guidelines for SEO and AI-search implementation — meta tags, JSON-LD, llms.txt, crawlability, and adversarial security. → see `rules/seo-ai-search.mdc`
