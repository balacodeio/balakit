---
name: mental
description: >-
  Maintain a repo's .mental/ folder — the user's private, gitignored, per-repo
  second-brain (an Open Knowledge Format bundle) that keeps them oriented: where
  the project stands, what they decided and why, what they accomplished, and
  where to resume. Create it on first substantive work in a repo that lacks one;
  consult it before non-trivial work; journal after. Use when beginning
  substantive work in a repo (create .mental/ if absent, else re-orient); when a
  .mental/ directory exists; when the user asks "where are we", "where did I
  leave off", "what's remaining", "what did I decide/accomplish"; when
  substantive work wraps (append a journal entry); when a decision is made,
  deferred, or surfaced; or when the user asks to set up or survey a .mental bundle.
user-invocable: true
disable-model-invocation: false
version: "1.1.0"
author: "Ali Farahat"
tags: ["memory", "knowledge", "journal", "okf", "orientation", "second-brain"]
when_to_use: |
  USE WHEN:
  - You begin substantive work in a repo — if `.mental/` is absent, create it
    (skeleton + first journal entry); if it exists, re-orient from it first.
  - A `.mental/` directory exists in the repo root (consult before non-trivial
    work; journal after substantive work).
  - The user asks any orientation question: "where are we with this project?",
    "where did I leave off?", "what's remaining?", "what did I decide about X?",
    "what did I get done last week?".
  - A work session reaches a natural boundary (work landed, context switch,
    user stops) — append the journal entry.
  - A decision is made, deferred, or surfaced-but-unmade — record it.
  - The user asks to initialize `.mental/` or run the bootstrap survey.

  DO NOT USE WHEN:
  - The turn is read-only or trivial (a quick question, a one-line lookup) —
    don't create `.mental/` or journal for it; wait for real work.
  - The knowledge is cross-repo/personal (who the user is, global preferences) —
    that belongs in the agent's own memory system, not `.mental/`.
---

# The `.mental/` Bundle — the User's Second Brain

> **Leading words:** scribe for future-you, derive don't maintain, resume line,
> decisions are the only tracking, supersede in place, seed the present,
> boundary not turn, never rely on it.

`.mental/` is the user's **private, gitignored, per-repo second-brain**. Its reader
is the **user**, not you — you are the **scribe / chief-of-staff** keeping their
logbook. Every entry you write is for **future-them**, in human-legible narrative:
will this help them re-orient in two weeks?

It answers, at any moment: *Where am I? What did I decide, and why? What did I
actually accomplish? Where do I resume?*

## Format — the OKF bundle (self-contained spec)

`.mental/` follows the **Open Knowledge Format** — a minimal, portable convention
for a knowledge base that is equally readable by a human and an agent. Its rules,
in full (you do not need any external reference):

1. **Just files.** Every concept is one markdown file. No database, no SDK, no
   runtime — the bundle is a directory tree you can read, grep, and diff.
2. **YAML frontmatter carries the metadata.** `type` is the *only* required
   field. Beyond it, a producer defines its own fields — this bundle uses
   `title`, `description`, `tags`, `timestamp`, and a `status` extension.
3. **Directory hierarchy groups by concept type.** `status/`, `decisions/`,
   `journal/`, `notes/`, `areas/`, `plans/`, `docs/` — the folder says what kind
   of concept lives there.
4. **File path = concept identity.** A concept is addressed by its path. So you
   **never move a file to retire it** (that breaks inbound links) — instead flip
   `status: superseded` in place.
5. **Concepts link into a graph** with standard markdown links, e.g.
   `[the auth decision](/decisions/2026-07-07-adopt-jwt.md)` — rooted at the
   bundle. This graph, not folders alone, is how knowledge connects.
6. **Two reserved filenames.** `index.md` = a directory's entry point and
   navigation (progressive disclosure); `log.md` = optional chronological history
   for a directory. Everything else is a normal concept file.
7. **Human- and machine-first, both.** Write for a person skimming in two weeks
   *and* an agent parsing frontmatter — plain, legible, structured.

Concretely, `.mental/` lays out as:

```
.mental/
├── index.md                      # entry point + graph navigation
├── status/current.md             # type: Status — DERIVED snapshot, never hand-groomed
├── decisions/<YYYY-MM-DD>-<slug>.md   # type: Decision — open|deferred|decided|superseded
├── journal/<YYYY-MM-DD>.md        # type: Journal — append-only; entries end with a Resume line
├── notes/<slug>.md               # type: Note — durable repo-specific knowledge
├── areas/<domain>.md             # type: Area — digest, only when a domain sprawls
├── plans/<slug>.md               # type: Plan — authored plans
├── docs/internal/  docs/external/    # type: Document — authored | ingested (resource: link)
└── temp/                         # scratch — outside the bundle, purge freely
```

Frontmatter = OKF core + a `status` extension. `type` is the only required field:

```yaml
---
type: Decision        # Status | Decision | Journal | Note | Area | Plan | Document
title: Adopt JWT for auth
description: One-line summary shown in graph/index.
tags: [auth]
timestamp: 2026-07-07T14:30:00Z
status: decided       # Decision: open→deferred→decided→superseded · others: draft→active→superseded
resource: https://…   # optional — code/PR/external source
---
```

File templates for every type: [references/templates.md](references/templates.md).

## The engine

### 1. Orient — derive, don't maintain

There is **no to-do list anywhere in the bundle** (to-do lists rot; grooming is
disconnected from the work). When the user asks *"where are we / what's left /
where did I leave off"* — or you start non-trivial work — **derive** the answer
from three self-updating signals:

1. **Git** — current branch, recent commits, uncommitted diff, stashes, open PRs.
2. **Journal tail** — the latest entry's `Resume:` line (next action + open loops).
3. **Open decisions** — `decisions/` concepts with `status: open | deferred`
   (the parked work git can't see).

Synthesize those into the answer, and refresh `status/current.md` with the
composed snapshot (it is a **cache of the derivation**, never a hand-maintained
list — see the template). Stale or missing `current.md` is fine: re-derive.

### 2. Journal — one entry per session, at a boundary

Self-trigger **one consolidated entry per work-session** at a natural boundary —
a coherent chunk of work landed, the user stops or switches context, a decision
was made. **Never per turn; skip trivial and read-only turns.** Append a
`## HH:MM — <topic>` section to today's `journal/<YYYY-MM-DD>.md` (create with
frontmatter if missing): what happened, what was accomplished, what was decided,
the user's stated intent/headspace when voiced.

**The one discipline that cannot be skipped: every entry's last line is**
`Resume: <next action> — open loops: <threads>`. Append-only means an old Resume
line is superseded, never wrong. A missed entry is tolerable — the derive flow
backfills from git + the previous Resume line.

### 3. Decisions — the only discrete tracking

Decisions are rare, deliberate, high-value — the one thing worth tracking as
items. A Decision concept can be born **un-made**:

- You surface options the user must pick from → create concepts with `status: open`.
- User says "focus on this, park the rest" → the rest flip to `status: deferred`.
- User decides → flip to `status: decided`, record **what + why + when**.

The same file tracks the whole arc. Open/deferred decisions are exactly the
"what's remaining that git can't see" input to the derive flow.

### 4. Curate — freely, with a bar

When you learn a **durable, reusable, non-obvious, repo-specific** fact, write or
update a `Note` (or `Plan`) without asking. Do NOT record what code, README, or
git history already states plainly, or what won't matter beyond today. Add an
`Area` digest only when one domain sprawls across many notes. Ingested external
documents get a `Document` concept wrapping the asset with a summary +
`resource:` link. Keep `index.md` navigation current as concepts are added.

### 5. Bootstrap — create it on first substantive work

**When you begin substantive work in a repo and `.mental/` does not exist, create
it — automatically, without being asked.** It is gitignored (via the user's
global git excludes), so it never touches commits and creating it is harmless.
This is where the layer "kicks in": the first real task in each repo. Do **not**
create it for a read-only or trivial turn (a quick question, a one-line lookup) —
wait until there is actual work to record.

Two levels:

- **Skeleton** (default, automatic): create the directory tree + `index.md` +
  `status/current.md` from [references/templates.md](references/templates.md),
  then write the first `journal/<YYYY-MM-DD>.md` entry for the work you're doing.
  It grows from forward work.
- **Survey** (richer; when the user asks, or when it clearly helps to seed a
  larger existing project): also read ground truth — git state, README, open
  PRs, CLAUDE.md/ADRs, code layout — and seed the **present**: a fuller
  `status/current.md`, only **high-confidence** decisions/notes (mark
  observed-vs-inferred; never fabricate rationale). Do **not** reconstruct
  history — git holds it.

Mention in one line that you created `.mental/` so the user knows it exists.

## Guardrails

- **Per-repo, never global** — every repo gets its own `.mental/`; there is no
  shared/global bundle. It is absent in CI and on other machines, so never treat
  it as a precondition or block work on it — create it when missing, use it when
  present.
- **Keep it out of git via the GLOBAL excludes, never a repo `.gitignore`.**
  `.mental/` is ignored machine-wide via the user's global git excludes (the
  balakit installer sets this up). **Before you create `.mental/`, confirm the
  guard is real:** run `git check-ignore -q .mental` — if it does *not* report
  ignored, secure it yourself by adding `.mental/` to the global excludes file
  (the path from `git config --global --get core.excludesfile`, or create
  `~/.config/git/ignore` and point `core.excludesfile` at it when unset), then
  proceed. Never add `.mental/` to the repo's own `.gitignore` (that commits the
  fact of it) and never leave the folder unignored — an unignored `.mental/` can
  be `git add`-ed and pushed, leaking a private second-brain.
- **Never leak** — `.mental/` content stays out of commits, PRs, code comments,
  and anything leaving the machine.
- **Scope split** — repo-specific knowledge only. Cross-repo personal facts
  belong in your own memory system.
- **Scribe voice** — human-legible narrative for future-them, not agent-terse
  facts.
