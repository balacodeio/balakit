---
name: mental
description: >-
  Maintains a project-continuity log in each repository (private by default,
  or tracked when the installed Mental data policy says so). Reconstructs where
  work stands from git, the latest journal handoff, and open decisions; records
  why consequential decisions were made; and leaves an exact resume point after
  substantive work. Use when starting or finishing non-trivial repository work,
  answering project-orientation questions, or recording a decision that git
  cannot explain.
user-invocable: true
disable-model-invocation: false
version: "2.1.0"
author: "Ali Farahat"
tags: ["continuity", "journal", "decisions", "orientation", "handoff"]
when_to_use: |
  USE WHEN:
  - You begin substantive work in a repository.
  - The user asks any orientation question: "where are we with this project?",
    "where did I leave off?", "what's remaining?", "what did I decide about X?",
    "what did I get done last week?".
  - A substantive task reaches a verified handoff point.
  - A consequential decision is made, deferred, or awaiting user input.

  DO NOT USE WHEN:
  - The turn is trivial or read-only and does not ask for project orientation.
  - The information is already obvious from code, git, or canonical docs.
  - The information is cross-repository, personal, or secret.
---

# `.mental/` — Project Continuity

> **Leading words:** derive, do not maintain; task boundary; exact handoff;
> decisions explain git; policy-aware privacy; optional, never required.

`.mental/` exists to make a later human or agent session continue without
reconstructing intent from chat history. Git records what changed. `.mental/`
records the small amount git cannot explain: current focus, consequential
decisions and their rationale, durable repository-specific knowledge, and the
next exact action.

Write for the user returning in two weeks. Be concise, factual, and explicit
about observed versus inferred information.

## Non-goals

- Not a task manager, chat transcript, analytics store, or replacement for
  repository documentation.
- Not a place to duplicate code, README content, git history, or issue trackers.
- Not a secret store. Never write credentials, tokens, private keys, or sensitive
  user data.
- Not a dependency. Work must continue when `.mental/` is absent, stale, or
  unavailable.

## Minimal bundle

Use plain Markdown with YAML frontmatter. `type` is required; `title`,
`description`, `timestamp`, and `status` make files easier to scan and parse.
Paths are identities: supersede concepts in place rather than moving them.
Links must be relative to the file containing them.

```text
.mental/
├── index.md
├── status/current.md
├── journal/<YYYY-MM-DD>.md
├── decisions/<YYYY-MM-DD>-<slug>.md
└── notes/<slug>.md
```

Do not scaffold `areas/`, `plans/`, `docs/`, asset ingestion, or another project
management hierarchy. Existing bundles may retain those folders; do not delete
user data, but only maintain optional concepts the user actively uses.

Templates: [references/templates.md](references/templates.md).

## Lifecycle

### 1. Preflight

Read `mentalDataPolicy` from `.balakit/installed.json` or
`~/.balakit/installed.json` (default `global-exclude` when unset).

**Private policies** (`global-exclude`, `clone-exclude`, `repo-gitignore`):
before creating `.mental/`, run:

```text
git check-ignore -q -- .mental/probe
```

If it succeeds, create the minimal skeleton from the templates. If it fails, do
not create `.mental/` and do not modify git configuration, `.gitignore`, or
`.git/info/exclude`. Tell the user to run `npx balakit doctor`, then continue
without the continuity layer.

**Tracked policy** (`tracked`): do not require check-ignore success. Warn once
that there is no privacy promise, then create the skeleton if the user still
wants continuity. Never store secrets.

Skip creation for trivial or read-only turns.

### 2. Orient

Before substantive work, derive current state from:

1. Git: branch, recent commits, uncommitted changes, and relevant open PRs.
2. The latest journal section's final `Resume:` line.
3. Decision files whose status is `open` or `deferred`.

Treat `status/current.md` as a disposable cache. Verify it against those sources;
refresh it when stale. Never block work because the cache is missing.

### 3. Record selectively

Create or update a decision only when a choice changes the project's direction,
constrains future work, or is explicitly deferred:

- `open`: options require a user decision.
- `deferred`: intentionally parked; state what it awaits.
- `decided`: record what was chosen, why, and when.
- `superseded`: preserve the file and link the replacement.

Create a note only for a durable, non-obvious, repository-specific fact likely
to save future investigation. If deleting the note would not cost future time,
do not write it.

### 4. Close at a deterministic task boundary

A task boundary occurs when any of these is true:

- A substantive implementation or investigation has been verified and is ready
  for final handoff.
- The user changes topic, pauses, or explicitly asks to stop.
- A consequential decision is made or deliberately deferred.

At the boundary, append one concise section to today's journal:

```text
## HH:MM — <outcome>
<what changed, evidence of completion, decisions, and only context git cannot explain>

Resume: <one exact next action> — open loops: <none or concise list>
```

Do this once per coherent task, not once per turn. Then regenerate
`status/current.md` from git, the new Resume line, and open decisions.

## Orientation responses

When asked where work stands, answer from freshly derived evidence:

- Current branch and worktree state
- Latest completed outcome
- Open or deferred decisions
- Exact resume action

Separate observed facts from inference. Do not recite the entire journal.

## Privacy and safety

- `.mental/` is per repository. Tooling scope (user-wide vs project) and data
  policy are chosen at install time and recorded in the balakit manifest.
- Under private policies: never stage, commit, publish, attach, or quote
  `.mental/` contents in PRs, issues, release notes, code comments, or external
  messages.
- Under tracked policy: `.mental/` may be shared in git; still never store
  secrets; summarize carefully for public remotes.
- It is acceptable to summarize relevant orientation to the user in the current
  conversation.
- Never alter `.gitignore`, `.git/info/exclude`, or global git configuration.
  `balakit doctor` owns ignore setup and repair for the recorded policy.
- Never store secrets.
- Never delete existing concepts during migration or cleanup without explicit
  user approval.
