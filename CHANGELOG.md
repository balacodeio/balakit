# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.9.1]

### Fixes
- **CLI silent no-op via `npx` / global install** — resolve npm `.bin` symlinks before comparing the entry path so `npx balakit`, the interactive menu, and subcommands run on Linux, macOS, and WSL instead of exiting with no output.

## [v1.9.0]

### Features
- **New skill: `media-gen`** — model-agnostic Fal.ai media generation for images, image-to-image edits, video, and upscale. Agents classify intent, route via endpoint and cost references, then execute `scripts/generate.py`.
- **Dual-model ad creative pipeline** — v3 workflow runs Nano Banana Pro Edit and Ideogram v4 I2I side-by-side for social ad concepts, with high-conversion prompting, ad psychology references, and one-image-per-message delivery.

### Fixes
- `generate.py` now saves every returned image URL, validates URL resolution, supports `--strength` for I2I, handles ffmpeg transcodes without audio, and errors clearly when `--target-height` would require downscaling.

## [v1.8.2]

### Fixes
- **Safer `.mental/` bootstrap** — agents now verify the exact `.mental/probe` path before creating private data and defer exclude setup or repair to `balakit doctor` instead of modifying global Git configuration themselves.
- `.mental/` templates now use file-relative links so navigation resolves correctly from nested status and decision files.

### Changes
- **Mental 2.0 narrows `.mental/` to project continuity** — the default bundle now contains only status, journal, decisions, and durable notes; broad documentation, asset-ingestion, plan, and area hierarchies are no longer scaffolded.
- Journaling now happens at deterministic task handoffs rather than an ambiguous session end, with one exact next action and concise open loops.

## [v1.8.1]

### Changes
- **Deep Deliberation 2.0** — replaces fixed ten-person persona panels with a small-model-friendly state machine, two-option evidence tournament, targeted adjudication, explicit uncertainty and reversibility analysis, portable delegate dispatch, and deterministic failure handling.

## [v1.8.0]

### Features
- **Kit-centric CLI** — `init`, `init --personal`, `init --with-personal`, `add`, `remove`, `list`, `status`, `update`, and `doctor` replace the old flag-soup installer. Interactive mode offers Team kit / Personal layer / Cherry-pick presets; agents are auto-detected.
- **AGENTS.md-first rules** — team rules write a managed block to `AGENTS.md` + `CLAUDE.md`; Cursor `.mdc` files are written only for glob-scoped rules. Cline/Kilo/omp multi-file fan-out is no longer the default.
- **Install manifests** — `.balakit/installed.json` (project) and `~/.balakit/installed.json` (personal) track ownership so `status`, `remove`, and `update` work.

### Changes
- **Personal layer (`mental`) is always global** — rule + skill install to user config; the machine-wide `.mental/` git exclude runs whenever mental is enabled (rule or skill). Project-scope mental wiring is no longer offered. `remove mental` keeps the exclude line (other repos may still have data).
- Skills remain delegated to skills.sh; the CLI no longer pretends to own skill path maps.
- Shared rule rendering lives in `bin/lib/render.mjs` and is used by both the consumer installer and `scripts/build-agent-rules.mjs`.

## [v1.7.1]

### Fixes
- **Data-leak guard: the `.mental/` global git-exclude is now actually created.** The `mental` rule promises `.mental/` is ignored machine-wide (so agents never touch a repo `.gitignore`), but on a fresh machine the installer left `core.excludesfile` unset and no ignore file — so `.mental/` was fully visible to git and a private second-brain could be `git add -A`'d and pushed. The installer now idempotently guarantees the exclude: when `core.excludesfile` is unset it wires it to git's XDG default (`~/.config/git/ignore`, OS-appropriate home, forward-slash form on Windows) and creates the file; when already set it uses that file and never overwrites it; the `.mental/` line (with a comment) is appended only if absent. Exact-line, no-duplicate, no-reorder idempotency. Previously it defaulted to `~/.gitignore` and wasn't verified.

### Features
- **`npx balakit --doctor`** — verifies the `.mental/` global exclude is in force (config set, ignore file contains the line, and — inside a repo — `git check-ignore` confirms it live), repairing it idempotently and printing a PASS/FAIL report. Runs automatically after every `mental` install so the regression is caught early.

### Changes
- The `mental` skill now instructs the agent to confirm `.mental/` is git-ignored (via `git check-ignore`) before creating it, and to secure it through the **global excludes** — never a repo `.gitignore` — if the installer's guard is somehow absent (e.g. a skills-only install). Belt-and-suspenders against the leak at folder-creation time.
- Added a test suite (`node --test`) covering the unset-excludesfile case, idempotent re-runs, respect-existing-config, no-trailing-newline append, and the doctor check.

## [v1.7.0]

### Fixes
- **`.mental/` now actually gets created.** Previously the rule/skill said "if `.mental/` is absent, do nothing — never scaffold unprompted," so the folder never came into existence and the layer never "kicked in." The agent now **creates the per-repo `.mental/` automatically on its first substantive work** in a repo (skeleton + first journal entry) — it's gitignored, so creation never touches commits. Read-only/trivial turns still don't trigger it.
- **OKF spec is now self-contained.** The `mental` skill previously linked out to Google Cloud's Open Knowledge Format blog post for the format it depends on. The full OKF format spec (files-only, `type`-required frontmatter, path-as-identity, markdown-link graph, reserved `index.md`/`log.md`) is now inlined in the skill; the external URL is removed from the rule and skill.

### Changes
- Reworded the rule + skill to emphasize `.mental/` is **per-repo, never global** (only the rule/skill *wiring* is global) and to drop the "never create unprompted" guard in favor of "create on first substantive work, skip trivial turns."

## [v1.6.0]

### Features
- **Fully automated global installs for all 8 agents — zero manual steps.** The four previously-manual global targets now write real files: Cursor → `~/.cursor/rules/*.mdc` (with a printed heads-up about Cursor's workspace-less agent-session bug; Settings → Rules mirroring is optional), GitHub Copilot → VS Code profile `User/prompts/balakit-*.instructions.md` with `applyTo` frontmatter (detects Code / Code - Insiders / VSCodium), Kilo Code → `~/.kilocode/rules/` (the still-supported global rules dir), and omp → `~/.omp/agent/AGENTS.md` (its config home, mirroring pi's `~/.pi/agent/` convention). All researched against current platform docs/forums.

### Changes
- The `manual` target kind and its "Manual steps" panel are gone; targets can instead carry a `note` surfaced in a "Heads-up" panel after install (used for the Cursor caveat).

## [v1.5.2]

### Fixes
- **Bundled skills are now visible in the interactive flow** — selecting the `mental` rule looked like it left the `mental` skill unselected (the auto-add only surfaced later, in Review). The skill's picker entry now carries an "auto-installs with the mental rule — no need to select it here" hint, and the moment selection resolves the CLI announces `mental skill added automatically (bundled with the mental rule)`.

## [v1.5.1]

### Changes
- **Personal-rule scope guard** — `mental` is now marked as a personal-layer rule. The interactive scope prompt defaults it to Global (with hints explaining why); with `-y` and no `--scope` it installs globally when it's the whole selection; and any project-scope install prints a warning that project scope writes the rule into committed files (`CLAUDE.md`/`AGENTS.md`/rule dirs) — only the `.mental/` data folder is gitignored, never the rule wiring. Mixed selections (personal + team rules) keep the project default so team rules are never silently routed into user config.

## [v1.5.0]

### Features
- **Rule+skill pairing** — paired rules now install their skill automatically with no opt-out: selecting the `mental` rule always brings the `mental` skill (the always-on pointer is useless without the procedure it points at). Bundled skills are surfaced in the review step, e.g. `mental (bundled with the mental rule)`.
- **Revamped install flow** — one grouped picker selects rules and skills together (no more separate "what do you want to install?" step), agents next, then a single scope prompt covering both rules and skills (`--skills-scope` still overrides). The review step now previews the exact destination every rule will land in, per agent, before anything is written.
- **`--dry-run`** — shows the full review, the would-be file writes, the git-excludes action, and the exact skills.sh command without writing anything.

### Fixes
- **Cline global rules path corrected** — v1.4.0 wrote global Cline rules to `~/.cline/rules/`; the documented location is `~/Documents/Cline/Rules` (with `~/Cline/Rules` as the Linux fallback). Verified against docs.cline.bot.

### Changes
- omp now maps to skills.sh's `pi` agent id for skill installs (oh-my-pi is a distribution of the `pi` coding agent), so skills reach it instead of being skipped.
- The `kilocode → kilo` skills.sh id mapping is now verified against skills.sh's agent validation (no behavior change).
- Skill description extraction moved to a shared helper; menu hints and `--list` output are truncated cleanly.

## [v1.4.0]

### Features
- **`.mental/` personal knowledge layer** — new `mental` rule + `mental` skill pair. The rule is a one-paragraph always-on pointer; the skill carries the full procedure for maintaining a private, gitignored, per-repo second-brain as an [Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) bundle: derived status (no rot-prone to-do lists — "where are we" is reconstructed from git + the journal's Resume lines + open decisions), boundary-triggered journaling, decision concepts with an open→deferred→decided lifecycle, free curation of durable repo facts, and an optional bootstrap survey that seeds the present without fabricating history. Design rationale in `docs/mental-design.md`.
- **Three new agents** — Cline (`.clinerules/`), Kilo Code (`.kilocode/rules/`), and omp (AGENTS.md-compatible) join Cursor, Claude Code, Codex, OpenCode, and Copilot as rule-install targets. Cline/Kilo get one plain `.md` file per rule (`balakit-<name>.md`, updated in place on reinstall).
- **Global (user-level) rule installs** — rules can now install to each agent's user config (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.config/opencode/AGENTS.md`, `~/.cline/rules/`) via a new scope prompt / `--scope global`. Agents without a scriptable global home (Cursor's Settings UI, Copilot, Kilo's `kilo.jsonc`) degrade gracefully: exact manual instructions are printed instead of erroring.
- **Non-interactive CLI** — every prompt now has a flag: `--rules`, `--skills`, `--agents` (each accepting `all`), `--scope`, `--skills-scope`, `-y/--yes`, plus `--list`, `--help`, `--version`. Interactive mode is unchanged when no selection flags are given.
- **Global git excludes for `.mental/`** — installing the `mental` rule idempotently wires `core.excludesFile` (creating `~/.gitignore` only when unset) and appends `.mental/`, so the folder is ignored machine-wide without touching any project's `.gitignore`.

### Changes
- Rules are no longer hard-locked to project scope; the README's guidance now frames scope as a deliberate choice (project conventions stay project-scoped; personal layers like `mental` go global).
- Installer review/outro messaging now surfaces the chosen rule scope and the `npx balakit@latest` update path.
- Agents without confirmed skills.sh support are excluded from skill installs with a printed note instead of failing the whole install.

## [v1.3.0]

### Features
- Applied the "Building Great Agent Skills: The Missing Manual" source principles (queried via the `nlm` CLI from the AI Harness NotebookLM notebook) to every skill in the kit. The shared thread: **leading words** banners that anchor agent reasoning, **phase separation** with human checkpoints that block progression, **progressive disclosure** that pushes branch-specific depth behind context pointers into `references/`, and intentional **invocation flag** choices (BOTH for common safe workflows, USER-ONLY for heavy pipelines).
- `deep-deliberation` v1.4.0 (#1, #10): added a NON-NEGOTIABLE block after the title with per-turn rules, a forbidden-before-checkpoint list, an explicit Stage 2 launch contract (5 parallel `Task` calls in one turn, `subagent_type: explore`, no `model`), and a self-check checklist the agent runs before sending each stage output. Stage 1 now requires copy-paste of the template skeleton with exact headers (`## Problem`, `## Branches`, `### Branch A —`, `## Evaluation`, `## Recommendation`). Each checkpoint ends with the literal phrase `CHECKPOINT N — waiting for your reply. I will not proceed until you respond.` plus AskQuestion-no-answer behavior (re-print, ask in plain text, do not advance; meta questions answered without advancing). New anti-patterns section enumerates 9 skill-violation modes. Frontmatter description rewritten as a MANDATORY pipeline contract. Subagent prompt template and output templates moved to `references/` with context pointers (296 → 243 lines). Leading words banner added.
- `authoring-skills-and-rules` v1.1.0 (#2): leading words banner; new user-invoked vs model-invoked decision table (BOTH vs USER-ONLY vs MODEL-ONLY with heuristic); cross-platform support matrix pruned (the 5-row per-platform table moved out of body, lives in `references/cross-platform.md`); new "Leading words — the agent's reasoning anchor" subsection; "What to leave out" expanded with no-ops + sediment failure modes and the deletion test; workflow restructured from a flat 7-item checklist into 4 deliberate phases (Scope > Draft > Distribute > Validate) with checkpoints; validation checklist expanded with invocation-flags, leading-words, and deletion-test checks.
- `marketing-psychology` v2.0.0 (#3, breaking): generalized from Yappi-only to universal. Yappi content preserved as worked examples in `references/yappi_examples.md`. New decision model table maps 7 surfaces (CTA, pricing, onboarding, feature description, reviews, dashboard, error/empty state) to primary + secondary principles. 4-phase workflow (Audit > Design > Write > Validate) with checkpoints. 3 new reference files: `principles.md` (cognitive biases + Fogg Behavior Model), `ethical_boundaries.md` (dark patterns, addiction design, product-truth overrides, ethical-influence test), `yappi_examples.md`. Proper frontmatter with `when_to_use`.
- `seo-audit` v2.0.0 (#4, breaking): generalized audit workflow applies to any public-profile / local-business / landing page. 4-phase workflow (Crawl > Audit > Fix > Verify) with checkpoints. Delegates depth to the `everything-seo` skill's existing references. New `references/local_seo_checklist.md` with the full LocalBusiness JSON-LD field list, common schema mistakes, Bing considerations, and robots.txt patterns. "What NOT to do" hard boundaries: no black-hat, no ignoring Bing, no CSR for ranked content, no skipping schema drift.
- `documentation-writer` v1.1.0 (#5): leading words banner; proper frontmatter with `when_to_use` (model-invoked BOTH); each of the 5 phases (Discover > Research > Outline > Draft > Verify) now ends with an explicit checkpoint; BLUF (Bottom Line Up Front) added to core principles and Draft phase — lead each section with the direct answer in 40-60 words, then expand, so docs are AI-readable; trigger-rich description packed with concrete surfaces and accuracy triggers.
- `cloakbrowser-fallback` v1.1.0 (#6): leading words banner; proper frontmatter with `when_to_use`; invocation flags set to USER-ONLY (`disable-model-invocation: true`) — CloakBrowser launches a real Chromium binary and should only fire on explicit user request or provable built-in-browser failure, not on agent auto-detection; "When to reach for this" reframed as the **headless failover pattern** (start headless, failover to `--headed` for Turnstile managed, stop and report on image CAPTCHAs).
- `everything-seo` v1.2.0 (#7): leading words banner; invocation flags set to model-invoked (BOTH); body restructured from flat reference doc into 3 phases (Audit > Optimize > Maintain) with checkpoints. Pruned verbose inline framework sections (5-pillar audit, 4 pillars of intent mapping, E-E-A-T signal stack, digital PR flywheel, SEO+CRO integration loop, Bing vs Google decision matrix) — these already live in the existing `references/` files. Removed inline "Examples of Good Responses" and "Agent Compatibility Notes" sections (184 → 149 lines).
- `startup-marketing-brain` v1.2.0 (#8): leading words banner; invocation flags set to model-invoked (BOTH); body restructured into 4 phases (Validate > Distribute > Automate > Monetize) with checkpoints. **New runtime eligibility check in Phase 2 (Distribute)** — addresses m13v's review comment that a fresh account can tick "lurked in 5 communities, posting daily" and still get its posts silently removed by automod karma/age gates. The check verifies account age, karma/engagement score, verification gates, and account history BEFORE the founder posts. Phase-2 checkpoint now requires "distribution actually landing (measurable signups / engagement, not just 'I posted')". Key mental models trimmed from 10 in body to the 3 that anchor reasoning (the other 7 live in references/). Pruned verbose inline framework sections (194 → 167 lines).
- `nlm-skill` v0.7.0 (#9): massive token trim (714 → 138 lines, 80% reduction). CLI command reference now points to the existing `references/command_reference.md` instead of duplicating every command signature in the body. New `references/mcp_tools.md` consolidates the scattered MCP tool mentions into one reference. Phase separation (Authenticate > Operate > Generate) with checkpoints. Leading words banner. Critical Rules (11) and Tool Detection decision tree kept in body — they must always be in context. Proper frontmatter with `when_to_use` (BOTH — heavy ops but user-invocation is the primary path).
- `dissect` v2.1.0 (#11): leading words banner; dynamic verdict taxonomy (the 9-verdict table + distinctions) moved to `references/verdict_taxonomy.md`; fold tests table moved to `references/fold_tests.md` (body keeps a 4-line quick reference); sub-agent dispatch rules compressed (367 → 291 lines).

### Fixes
- `deep-deliberation` (#1): fixed the observed failure mode where agents invoking `/deep-deliberation` would paraphrase Stage 1 instead of using the required template, skip visible `### Branch A —` sections, never launch the 5 parallel `Task` subagents in Stage 2/3, collapse checkpoints into `AskQuestion` without a hard stop, or jump to implementation. The NON-NEGOTIABLE block + structural header requirement + Stage 2 launch contract + self-check checklist make compliance structurally harder to miss. Also clarified that `disable-model-invocation: true` governs auto-load only and does NOT excuse subagent dispatch.
- `startup-marketing-brain` (#8): fixed the silent-removal failure mode surfaced by m13v's review comment. The Phase 2 checklist previously verified the founder did the steps but not that the account cleared each platform's runtime eligibility gates (Reddit automod karma/age, verification gates, account history). The new runtime eligibility check + landing-not-posting checkpoint close this gap.

### Changes
- All 10 skills now carry consistent invocation flags (`user-invocable` + `disable-model-invocation`) chosen intentionally per the manual's heuristic (heavy → USER-ONLY, common safe → BOTH).
- All 10 skills now have a leading words banner under the title (dense phrases the agent echoes in reasoning traces to anchor behavior without long prose).
- All multi-stage skills now use phase separation with explicit checkpoints that block progression, per the manual's primary compliance lever.
- Branch-specific depth (templates, taxonomies, framework details, MCP tool reference, CLI command reference, worked examples) consistently lives in `references/` behind context pointers, per the manual's progressive disclosure technique.
- Mirrors under `.cursor/skills/`, `.claude/skills/`, `.agents/skills/` synced from the source-of-truth `skills/` directory via `sync.ps1`.

## [v1.2.0]

### Changes
- Made the bundled rules language- and project-agnostic so the kit is a genuine drop-in for any repository. The `testing` rule no longer assumes a specific stack (previously referenced a named monorepo, tRPC, Cloudflare Workers, a specific component library, and a specific QA tool); it now states the same opinionated philosophy — tests must prevent a real user-facing bug, integration over unit, failing-test-first for bug fixes, no speculative E2E — in stack-neutral terms. The `comments` rule was broadened from "Comments & JSDoc" to "Comments & Documentation": the opinionated stance (zero comments by default, document the *why*, document every exported symbol, externally-surfaced docs ship to consumers) is preserved, but the guidance no longer hard-codes TypeScript/JSDoc and instead defers to each language's doc-comment convention. The `changelog` rule's release section no longer assumes a specific GitHub Actions workflow file. The rules remain opinionated by design — only the language- and project-specific bindings were removed.

### Removed
- Removed the ability to install **rules** globally. Rules describe how to work in a specific repository and belong under version control, so a global install would silently apply one project's conventions everywhere. The installer now always writes rules into the current project (Cursor `.cursor/rules/`, Claude Code `CLAUDE.md`, and Codex/OpenCode/Copilot `AGENTS.md`). **Skills** are unaffected and can still be installed per-project or globally via skills.sh — the scope prompt now appears only when skills are selected and applies to skills alone. Removed the now-dead global-path resolution (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, etc.) and the unused `expand`/`homedir` helpers from the CLI.

## [v1.1.1]

### Features
- Added a one-command interactive installer: `npx balakit` (or `npx github:balacodeio/balakit`). Built on `@clack/prompts`, it lets you choose which rules and skills to install, which agents to target (Cursor, Claude Code, Codex, OpenCode, GitHub Copilot), and whether to install per-project or globally. Rules are installed natively — Cursor `.mdc` files written verbatim, and an idempotent managed block merged into `CLAUDE.md` / `AGENTS.md` that preserves any surrounding content — while skills are delegated to skills.sh so its maintained per-agent paths are reused. This fills the gap skills.sh leaves open (it installs skills only, never rule files) and replaces the previous manual "copy rules by hand" step.
- Added a new `authoring-skills-and-rules` skill (`skills/authoring-skills-and-rules/SKILL.md`): a meta-skill that guides creating and updating agent Skills (`SKILL.md`) and rules/instructions across five platforms — Claude Code, Cursor, OpenCode, Codex, and GitHub Copilot. Includes a Skill-vs-rule decision model, a cross-platform support matrix (exact file locations and frontmatter per platform), the universal authoring craft (trigger-rich descriptions, progressive disclosure, naming, size budgets, what to omit), create/update workflows, a validation checklist, and six on-demand `references/` files (one per platform plus a write-once-run-everywhere cross-platform strategy). Built from authoritative 2025-2026 documentation for each platform.
- Added a `.claude/skills/` mirror so the repository's Skills are now discoverable by Claude Code directly, alongside the existing `.cursor/skills/` and `.agents/skills/` mirrors.
- Added `sync.ps1` and `sync.sh` plus a "Developing" section in `README.md` that formalize the source-of-truth workflow: `skills/` and `rules/` are edited directly, then a single sync command replaces the `.cursor/`, `.claude/`, and `.agents/` mirrors (each now carrying both `skills/` and `rules/`) from source so they never drift.
- Added `scripts/build-agent-rules.mjs`, which the sync scripts invoke to generate root `CLAUDE.md` (for Claude Code) and `AGENTS.md` (for OpenCode, Codex, Cursor, and Copilot) directly from `rules/*.mdc`. Always-on rules are inlined; file-scoped rules are listed under a "Conditional rules" index. This makes the rule set active across every agent — not just Cursor — while keeping `rules/` the single source of truth.
- Added a new `dissect` skill (`skills/dissect/SKILL.md`): an evidence-driven, staged pipeline for auditing an existing service, written plan, or codebase area and producing a minimal-build optimization plan. Adapted from an internal Canopy skill and significantly upgraded — author set to Ali Farahat, explicit `when_to_use` metadata, three human checkpoints, parallel read-only sub-agents, a Tree-of-Thought refactor-branch stage, an adversarial red-team panel, and a dynamic action-oriented verdict taxonomy (KEEP, FOLD, DROP, DEFER, ON-DEMAND, EXTRACT, RE-HOME, REFACTOR, OUT-OF-SCOPE) that replaces the rigid keep/fold/drop set.
- Added a new `global` rule (`rules/global.mdc` and `.cursor/rules/global.mdc`) defining the core meta-principle, dual-mode AI communication guidelines, simplicity standards, and repository hygiene practices.
- Refreshed the `everything-seo` and `startup-marketing-brain` skills with advanced, modern 2026 playbooks retrieved from Google NotebookLM using the `nlm` CLI.
- Integrated Generative Engine Optimization (GEO) and Retrieval-Augmented Generation (RAG) optimization techniques, including the BLUF method and formatting bias (HTML tables and definition lists).
- Added technical SEO updates for 2026, covering Bot Governance (distinguishing retrieval bots like `OAI-SearchBot` from training scrapers), the December 2025 Rendering Shift (non-200 HTTP status exclusion), INP supremacy (< 200ms using `scheduler.yield()`), and Schema Drift prevention.
- Added Agentic Growth Operations frameworks to `startup-marketing-brain`, detailing ad bulk-generation, automated optimization scripts, and real-time data tracking via MMPs.
- Added modern organic distribution playbooks (Engineering as Marketing, TikTok Organic-to-Paid funnel, and Twitter/X Content Loop) and monetization metrics (Founding 50 pre-sales, Lifetime Deals, and 3:1 LTV:CAC targets).

### Removed
- Removed the bundled installer CLI (`bin/cli.js`, the `my-awesome-ai` bin entry in `package.json`, and its README section). Skills now install exclusively via [skills.sh](https://skills.sh/) (`npx skills`), and rules are copied manually into `.cursor/rules/`.

### Fixes
- Fixed the installer's skills.sh delegation passing the agent id `copilot` instead of `github-copilot`. skills.sh rejects unknown agent ids and aborts the entire command, so selecting GitHub Copilot previously prevented *all* skills from installing. (Supersedes the unlisted 1.1.0 npm publish, which shipped this bug.)
- Corrected the `authoring-skills-and-rules` skill after verifying each platform's behavior against its official 2025-2026 docs. GitHub Copilot **does** support Agent Skills (`SKILL.md`) as of December 18, 2025 and auto-discovers them from `.github/skills/`, `.claude/skills/`, and `.agents/skills/` — the earlier "Copilot has no Skills" claim was wrong. Updated the cross-platform support matrix in `SKILL.md`, `references/copilot.md`, and `references/cross-platform.md`, and added the Claude Code `@import` (4-hop max) and `.claude/rules/*.md` path-scoped rule facts to `references/claude-code.md`.
- Fixed broken reference links in the `seo-audit` skill by pointing them directly to the canonical `everything-seo` reference files instead of creating duplicate parallel files.

### Changes
- Renamed the package to `balakit` (published unscoped on npm) and moved the project to the `balacodeio` GitHub organization as a public, discoverable repository. Repositioned the description as opinionated, cross-agent rules and skills, expanded `package.json` keywords and repository metadata (homepage, bugs, `publishConfig.access: public`), and re-pointed all install commands — including `npx skills add balacodeio/balakit` — to the new location.
- Simplified the mirror/sync model after confirming what each agent actually reads. Skills now mirror to `.cursor/`, `.claude/`, and `.agents/` (every agent — including Copilot since Dec 2025 — auto-discovers skills from those directories), while `.mdc` rules mirror only to `.cursor/rules/` (Cursor is the sole native `.mdc` consumer). Removed the previously committed `.claude/rules/` and `.agents/rules/` mirrors, which no agent reads: Codex, OpenCode, and Copilot take rules only from the generated root `AGENTS.md` file content, and Claude Code from `CLAUDE.md`. Updated `sync.ps1`, `sync.sh`, and the README "Developing" section to match.
- Refined the `global` rule (`rules/global.mdc`) for clarity and cross-model robustness: explicitly **defined Caveman Mode** as the chat/summary register and bound it to the [caveman](https://github.com/JuliusBrussee/caveman) token-compression skill (`full` level), so later "Caveman" references resolve to a single definition. Added a "reason fully, speak Caveman" rule clarifying that compression applies to the surfaced message only — reasoning and planning stay full-fidelity — which protects smaller models from treating brevity as a reasoning shortcut. Added a rule-conflict precedence order (safety & secrets > correctness > simplicity > brevity), an "ask only when it pays" threshold to curb over-asking on reversible decisions, an explicit trigger for the post-change summary block (file-modifying turns only; skipped on read-only turns), and split the conflated CONCERNS line into a report step and an in-code tag step. Aligned the changelog grouping with `rules/changelog.mdc` (`Features` / `Fixes` / `Changes`) to remove a direct contradiction between the two rules.
- Integrated the core principles of the [ponytail](https://github.com/DietrichGebert/ponytail) project ("lazy senior developer" minimalism) into the `global` rule's "Simplicity First" section (`rules/global.mdc` and `.cursor/rules/global.mdc`). Added the six-rung decision ladder (YAGNI → stdlib → native platform → installed dependency → one line → minimum that works) and an explicit "Lazy, Not Negligent" non-negotiable guardrail that trust-boundary validation, data-loss handling, security, and accessibility are never cut.
- Enhanced the `deep-deliberation` skill: added explicit `when_to_use` / "do not use" metadata, a ground-truth pre-branching step in Stage 1, and a companion-skill note clarifying that it is the forward-looking (design) counterpart to the backward-looking (audit) `dissect` skill. Bumped to v1.2.0.
- Documented the `dissect` skill in `README.md` and clarified the `deep-deliberation` summary as forward-looking design vs `dissect` as backward-looking audit.
- Standardized frontmatter metadata across all eight skills in the repository, adding consistent `author: "Ali Farahat"`, versioning, tags, and `when_to_use` fields.
- Synchronized the mirrored skill files under `.agents/skills/` with the canonical `skills/` directory to prevent silent forks for OpenCode consumers.
- Documented the `global` rule in `README.md`.
