# `.mental` — Design Spec

> **Status:** Design **locked** 2026-07-07. Build **held** (deferred until explicitly greenlit).
> **Target:** balakit **v1.4.0**.
> This document is the build reference. It captures the agreed design and the reasoning
> behind each decision so the build doesn't re-litigate settled forks.

---

## 1. Purpose & philosophy

`.mental/` is a **personal, gitignored, per-repo second-brain**. Its reader is **the user**, not
the agent — the agent acts as a **scribe / chief-of-staff** keeping the user oriented.

It exists to answer, at any moment (especially on cold return after weeks away):

- *Where am I in this project?*
- *What did I decide, and why?*
- *What did I actually accomplish, and when?*
- *Where did I leave off — what's the next action?*

It also holds plans and documents the user authors or ingests from outside.

This is deliberately **not** a knowledge base built for agent convenience (contrast the marshal
`kb/` model, which exists to feed agents at handover). `.mental` is built for the human's memory
and re-orientation. The agent maintains it *for future-you*, in human-legible narrative.

---

## 2. Format — Open Knowledge Format (OKF)

`.mental` is a **full [OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) bundle** (OKF v0.1). OKF is a minimal, vendor-neutral standard:
markdown + YAML frontmatter + directory hierarchy + a markdown-link knowledge graph. Only `type`
is required; file **path is identity**; `index.md` / `log.md` are reserved files.

Chosen because it is the standardized version of what this design needed anyway — and because
OKF's free, self-contained static HTML visualizer can render the bundle as an interactive graph
(no backend, no data leaves the page), directly serving the "help me see where things stand" goal.

---

## 3. Structure

```
.mental/                          # OKF bundle root
├── index.md                      # entry point + graph navigation (progressive disclosure)
├── status/current.md             # type: Status — DERIVED snapshot, regenerated, never hand-groomed
├── decisions/<YYYY-MM-DD>-<slug>.md   # type: Decision — open | deferred | decided | superseded
├── journal/<YYYY-MM-DD>.md        # type: Journal — append-only; each entry ends with a Resume line
├── notes/<slug>.md               # type: Note — durable, repo-specific knowledge
├── areas/<domain>.md             # type: Area — digest, added only when a domain sprawls
├── plans/<slug>.md               # type: Plan — authored plans
├── docs/
│   ├── internal/                 # type: Document — authored (resource: local path)
│   └── external/                 # type: Document — ingested (resource: source URL) + a concept .md wrapper
└── temp/                         # scratch — explicitly OUTSIDE the bundle; purge freely
```

Top-level directories are organized by **concept type** (OKF-idiomatic), not by lifecycle.
Freshness/retirement is expressed via `status` + `timestamp` in frontmatter, not by which folder
a file lives in.

---

## 4. Concept types & frontmatter

**Type vocabulary:** `Status` · `Decision` · `Journal` · `Note` · `Area` · `Plan` · `Document`.
(There is **no `Task` type** — see §5 "derive, don't maintain" and §8.)

**Frontmatter** = OKF core + one producer extension (`status`):

```yaml
---
type: Decision                 # REQUIRED (the only mandatory OKF field)
title: Adopt OKF for .mental
description: One-line summary shown in the graph/index.
tags: [architecture, mental]
timestamp: 2026-07-07T10:30:00Z   # last updated (OKF)
status: active                    # producer extension — lifecycle, per type (below)
resource: https://…               # optional — link to code/PR/external source
---
```

**`status` lifecycles per type:**

| Type | `status` values |
|---|---|
| Decision | `open` → `deferred` → `decided` → `superseded` |
| Note / Area / Plan / Document / Status | `draft` → `active` → `superseded` |

- **Linking:** standard markdown links, e.g. `[the OKF decision](/decisions/2026-07-07-adopt-okf.md)`.
  Path = identity.
- **Retire:** flip `status: superseded` **in place** — never move the file (moving breaks inbound
  links, because path is identity). No `archive/` folder. The visualizer can dim/hide superseded nodes.

---

## 5. The engine (agent behavior — encoded in the rule + skill)

### Derive, don't maintain
There is **no maintained to-do list** (to-do lists rot — grooming is disconnected from the work).
Instead the agent **derives** "where are we / what's left / where did I leave off" **on demand**,
from three self-updating signals:

1. **Git** — current branch, recent commits, uncommitted diff, stashes, open PRs.
2. **The journal** — the latest entry's **Resume** line (next action + open loops).
3. **Open Decisions** — concepts with `status: open | deferred` (the parked/pending work git can't see).

`status/current.md` is a **regenerated snapshot** the agent composes from those signals (and may
cache), never a hand-groomed list. Because nothing is kept in sync, it structurally cannot rot.

### Journal discipline
The agent **self-triggers one consolidated entry per work-session**, at a **natural boundary**
(a coherent chunk of work landed / the user stops or switches context / a decision was made) —
**not per turn**, and never for trivial or read-only turns. Entries append a `## HH:MM — <topic>`
section to *today's* dated file. **Every entry's last line is the Resume pointer** (next action +
open loops). Append-only ⇒ an old "next action" is superseded, never wrong. A missed entry is
tolerable — the derive-model backfills from git + the previous Resume line.

The single encoded discipline: *"never end a substantive session without appending a journal entry
whose last line is the Resume pointer."*

### Decisions — the only discrete tracking
A `Decision` concept can be born **un-made**: the agent records surfaced-but-unmade decisions as
`status: open`; "focus on this, defer the rest" flips the rest to `deferred`; making one flips it to
`decided` and fills in the rationale. The **same concept** tracks the whole arc (raised → deferred →
decided + why). This is the only thing tracked as discrete items — decisions are rare, deliberate,
and high-value, so capturing them isn't cumbersome.

### Curation
When the agent learns a durable, reusable, non-obvious, repo-specific fact, it writes/updates a
`Note` (or `Area`/`Plan`) **freely** — no need to ask. Ingested external docs become `Document`
concepts with a `resource:` link + a body summary. All in scribe voice, for future-you.

### Bootstrapping
- Default install lays only the **empty skeleton** (directories + `index.md` templates).
- A **survey is optional** — an opt-in mode of the `mental` skill. When invoked, it reads ground
  truth (git state, README, open PRs, `CLAUDE.md`/ADRs, code layout) and **seeds the PRESENT**:
  a rich `status/current.md` + only **high-confidence** decisions/notes + a first journal entry,
  marking **observed-vs-inferred**. It does **not** reconstruct full history (git already holds it),
  and never fabricates rationale.
- `.mental` works fine if the survey is never run — it grows from forward work + journaling.

### Guardrails
- **Never rely on `.mental` existing** — treat it as a bonus when present, never a precondition;
  never block work on it. It is absent in CI and on other machines.
- **Never police git** — `.mental/` is ignored machine-wide via the user's global git excludes
  (see §7). Do not check, create, or edit any `.gitignore` for it.
- **Never leaks** — never surface `.mental` contents in committed code, PRs, or anything leaving
  the machine.

---

## 6. Memory boundary

- `.mental/` holds **repo-specific** knowledge and state.
- **Cross-repo** personal facts (who the user is, global preferences) stay in the agent's own
  memory system — **not** here. The two are complementary, split by scope.

---

## 7. Distribution & build plan (balakit)

### Hybrid: a tiny rule + a full skill
- **`rules/mental.mdc`** — a ~1-paragraph `alwaysApply: true` pointer: *if `.mental/` exists →
  read `status/current.md` to re-orient, log to `journal/` after substantive work, curate freely;
  see the `mental` skill; never rely on it, never touch `.gitignore`.*
- **`skills/mental/SKILL.md`** — the full procedure (structure, frontmatter, derive-flow, journal
  discipline, decision lifecycle, optional survey, scribe voice). A model-invocable skill's
  **description is always in context**, so it doubles as the always-on cross-agent trigger; the
  skill installs globally-clean via the existing skills.sh path (no new machinery for this half).

Rationale: matches balakit's own authoring guidance — *"a standing block that grew procedural →
graduate it into a Skill."* `.mental` curation is procedural.

### Installer expansion (`bin/cli.mjs`) — general, not `.mental`-specific
Add new agents + a **rule scope prompt (project | global)**. Verified per-agent rule destinations:

| Agent | Project rule → | Global rule → | Notes |
|---|---|---|---|
| Claude Code | `CLAUDE.md` (+ `.claude/rules/*.md` scoped) | `~/.claude/CLAUDE.md` | clean both |
| Codex | `AGENTS.md` | `~/.codex/AGENTS.md` | clean both |
| OpenCode | `AGENTS.md` (`CLAUDE.md` fallback) | `~/.config/opencode/AGENTS.md` | clean both |
| Cline | `.clinerules/*.md` | `~/.cline/rules/*.md` | new "markdown-dir" target kind |
| Kilo Code | `.kilocode/rules/*.md` (v7 `kilo.jsonc`) | `~/.config/kilo/kilo.jsonc` | project clean; **global = config → graceful skip + printed instructions** |
| Cursor | `.cursor/rules/*.mdc` | Settings UI (no file) | project clean; **global not scriptable → printed instructions** |
| Copilot | `AGENTS.md` (kept — reads it natively) | VS Code profile | project clean; global fuzzy → skip. **Decision: keep AGENTS.md, do not split to `.github/copilot-instructions.md`.** |
| omp ([omp.sh](https://omp.sh/)) | `AGENTS.md` (assumed-compatible) | unknown home | project free via shared AGENTS.md; **global deferred until verified** |

Design principles for the global mode:
- **Graceful degradation:** an unscriptable global target (Cursor UI, Copilot profile, Kilo config)
  never errors — it prints exact copy-paste instructions.
- **Gitignore mechanic:** global install idempotently wires `git config --global core.excludesFile`
  (never clobbering an existing excludes file) and appends `.mental/`. One-time, per machine. The
  per-project agent never touches `.gitignore`.
- The new agents + global mode apply to **all** balakit rules, not just `.mental`.

### Version / housekeeping
- `build-agent-rules.mjs` auto-includes `mental.mdc` (alwaysApply inlines) — no change unless we
  want balakit's own repo to self-host cline/kilo formats (optional).
- Update `sync.sh`/`.ps1`, `README.md` (new agents + rules table + global mode), `CHANGELOG.md`
  (Features), bump **1.3.0 → 1.4.0**.

### Build steps (ordered, when greenlit)
1. Trim the existing `rules/mental.mdc` draft → the ~1-paragraph pointer.
2. Author `skills/mental/SKILL.md` (+ mirror via `sync`).
3. Extend `bin/cli.mjs` — new agents, rule scope prompt, global targets, graceful-skip-with-
   instructions, gitignore setup.
4. README + CHANGELOG + version bump to 1.4.0.
5. Run `sync`; dry-run the installer against a throwaway target to smoke-test.

### Open items to resolve at/around build
- **omp global home** — unknown; project covered free via `AGENTS.md`, global deferred.
- **Kilo global** — `kilo.jsonc` config surgery; skipped with printed instructions.

---

## 8. Rejected alternatives (and why)

- **To-do / Task list or `type: Task`** — rejected. Grooming is disconnected from the work; granular
  and churny; goes stale and loses trust. Replaced by derive-don't-maintain (§5).
- **Per-project committed `.gitignore` entry** — rejected. Would leak the personal convention into
  shared repo history. Replaced by machine-wide global `core.excludesFile` (§7).
- **Rule-only (no skill)** — rejected. Global rule install is clean for only ~4 of 8 agents.
- **Skill-only (no rule)** — rejected. On-demand loading weakens the always-on guarantee (mitigated
  but not guaranteed by the always-in-context description). Hybrid keeps both strengths.
- **Physical `archive/` folder** — rejected. Moving a file changes its OKF identity (path) and breaks
  inbound links. Replaced by `status: superseded` in place.
- **Deep git-history reconstruction at bootstrap** — rejected. Fabrication-prone and low-value; git
  already holds history. Bootstrap seeds the present only, high-confidence, observed-vs-inferred.
- **OKF-flavored / borrow-ideas-only** — rejected in favor of a full OKF bundle (interop + visualizer).
