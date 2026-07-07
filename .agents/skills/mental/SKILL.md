---
name: mental
description: >-
  Maintain a repo's .mental/ folder — the user's private, gitignored second-brain
  (an Open Knowledge Format bundle) that keeps them oriented: where the project
  stands, what they decided and why, what they accomplished, and where to resume.
  Use when a .mental/ directory exists in the repo root; when the user asks
  "where are we", "where did I leave off", "what's remaining", "what did I
  decide/accomplish"; when substantive work wraps (append a journal entry); when
  a decision is made, deferred, or surfaced; or when the user asks to set up,
  bootstrap, or survey a .mental bundle.
user-invocable: true
disable-model-invocation: false
version: "1.0.0"
author: "Ali Farahat"
tags: ["memory", "knowledge", "journal", "okf", "orientation", "second-brain"]
when_to_use: |
  USE WHEN:
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
  - No `.mental/` directory exists and the user hasn't asked to create one —
    never scaffold it unprompted.
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

## Format — an OKF bundle

`.mental/` is an [Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
bundle: markdown + YAML frontmatter + directory hierarchy + a markdown-link graph.
**File path = identity** — never move a file to retire it; flip `status: superseded`
in place (moving breaks inbound links). Standard markdown links, e.g.
`[the auth decision](/decisions/2026-07-07-adopt-jwt.md)`.

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

### 5. Bootstrap — seed the present (optional survey)

Setting up `.mental/` happens only on explicit request. Two levels:

- **Skeleton** (default): create the directory tree + `index.md` from
  [references/templates.md](references/templates.md). Done — it grows from
  forward work.
- **Survey** (opt-in, when asked): read ground truth — git state, README, open
  PRs, CLAUDE.md/ADRs, code layout — and seed the **present**: a rich
  `status/current.md`, only **high-confidence** decisions/notes (mark
  observed-vs-inferred; never fabricate rationale), and a first journal entry
  ("Bootstrapped from repo survey"). Do **not** reconstruct history — git holds it.

## Guardrails

- **Never rely on it** — `.mental/` is a bonus when present, never a
  precondition; it is absent in CI and on other machines. Never block work on it.
- **Never touch `.gitignore`** — `.mental/` is ignored machine-wide via the
  user's global git excludes (set up by the balakit installer). Don't check,
  create, or edit ignore files for it.
- **Never leak** — `.mental/` content stays out of commits, PRs, code comments,
  and anything leaving the machine.
- **Scope split** — repo-specific knowledge only. Cross-repo personal facts
  belong in your own memory system.
- **Scribe voice** — human-legible narrative for future-them, not agent-terse
  facts.
