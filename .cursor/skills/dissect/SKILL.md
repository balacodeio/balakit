---
name: dissect
description: >-
  Evidence-driven dissection of an existing service, written plan, or codebase
  area. Interrogates every entity (table, field, component, endpoint, module,
  boundary) against ground truth from multiple sources at once, red-teams each
  verdict devil's-advocate style, and arrives at the minimal-build optimization
  plan. Runs as a staged pipeline with human checkpoints and parallel read-only
  sub-agents so each investigation stays laser-focused. Use when the user invokes
  /dissect, or asks to audit / optimize / challenge / "tear apart" an existing
  system, schema, or plan.
user-invocable: true
disable-model-invocation: false
version: "2.0.0"
author: "Ali Farahat"
tags: ["dissect", "audit", "red-team", "minimal-build", "refactor", "ground-truth", "orchestration"]
when_to_use: |
  USE WHEN (backward-looking, "what is actually here and what should change?"):
  - User invokes /dissect <target> or asks to audit, dissect, optimize, or
    challenge an EXISTING service, schema, data model, or codebase area.
  - User hands you a WRITTEN PLAN or spec and wants it pressure-tested against the
    code/DB that already exists (intent vs reality).
  - A system feels bloated, over-engineered, or misnamed and you need an
    evidence-backed keep/fold/drop/defer decision per entity.
  - You suspect scope-creep, dead code, stubs masquerading as features, or tables/
    components living in the wrong domain.
  - Before a migration or refactor, to find the minimal set of changes that
    actually meets the requirement.

  DO NOT USE WHEN:
  - The thing does not exist yet and you are choosing an approach to BUILD. That is
    forward-looking design — use the companion `deep-deliberation` skill instead.
  - The task is a quick lookup or a one-line fix with an obvious answer.
  - You only have intent (a plan) with no code/DB/runtime to verify against AND no
    way to get ground truth — dissect's power comes from live evidence; flag the gap.
---

# Dissect

Systematically interrogate and optimize an existing service, written plan, or
system. The goal is not to rubber-stamp the current design — it is to arrive at
the **minimal-build plan** that correctly meets the requirements, by challenging
every assumption with live evidence and an adversarial review panel.

**Trigger:** `/dissect <target>` where `<target>` is a service name, plan file
path, codebase area, or free-form description. If omitted, ask.

`dissect` is the backward-looking counterpart to `deep-deliberation`. They share
DNA — parallel read-only sub-agents, devil's-advocate red-teaming, human
checkpoints, evidence over intent — but point in opposite directions:
deliberation designs what to build; dissect audits what already exists.

---

## User Input

```text
$ARGUMENTS
```

---

## Core principles (never waive)

1. **Ground truth beats intent.** What the code actually does overrides what the
   plan says it should do. Always verify live.
2. **Row counts are a liveness signal only.** A 0-row table can be load-bearing;
   a populated table can be redundant. Never use row count as a keep/drop reason.
3. **Name what it IS, not what it was named.** Entities are frequently misnamed.
   Read a few actual records before drawing conclusions. A table called
   `contact_preference` might store food allergies and golf equipment.
4. **Own vs read.** "Entities this service reads" ≠ "entities this service owns."
   Reading a table does not mean you should count it in the domain.
5. **Stubs are not live.** A function that `throws new Error('not implemented')`,
   a cron that no-ops, or a consumer that re-queues to the DLQ is not a running
   feature. Check before counting it as active behavior.
6. **Minimal build.** Every proposed change must trace to a requirement. Do not
   design for hypothetical future use. Three similar things beat a premature
   abstraction.
7. **Naming audit is phase zero.** Naming confusion causes the most incorrect
   verdicts. Run it before any verdict.
8. **Sub-agents return evidence, the orchestrator returns verdicts.** A sub-agent
   that declares "VERDICT: DROP" unprompted is overstepping. Synthesis happens in
   the main context where all evidence is held together.
9. **Escalate discrepancies, don't resolve them silently.** If code says X and the
   plan says Y, surface both at the checkpoint and let the human decide.

---

## Pipeline overview

```
USER input (service / plan / codebase area)
   ↓
[Stage 0] Intake + Naming Audit                 (1 explore sub-agent)
   🛑 CHECKPOINT 1 — human confirms names + scope boundary
   ↓
[Stage 1] Multi-source Ground Truth             (3 explore sub-agents, parallel)
[Stage 2] Entity-level Devil's Advocate         (1 explore sub-agent per cluster)
   🛑 CHECKPOINT 2 — human reviews per-entity verdicts
   ↓
[Stage 3] Cross-cutting + Adversarial Red-Team  (system challenge + ToT branches)
[Stage 4] Synthesis + Minimal-Build Plan        (orchestrator, main context)
   🛑 CHECKPOINT 3 — human picks the execution branch
```

Copy this checklist and track progress out loud:

```
Progress:
- [ ] Stage 0: Naming audit
- [ ] CHECKPOINT 1 — names + scope confirmed
- [ ] Stage 1: Multi-source ground truth (DB + code + plan, parallel)
- [ ] Stage 2: Entity-level devil's advocate (one agent per cluster)
- [ ] CHECKPOINT 2 — entity verdicts reviewed
- [ ] Stage 3: Cross-cutting challenges + ToT refactor branches + red-team
- [ ] Stage 4: Synthesis → minimal-build plan
- [ ] CHECKPOINT 3 — execution branch chosen
```

> **Right-size the pipeline.** This is heavy. For a small target (a handful of
> entities, one file) collapse Stages 0–2 into a single pass and skip the parallel
> fan-out — but never skip the naming audit and never skip Checkpoint 1.

---

## Stage 0 — Intake + Naming Audit

Surface naming confusion that could corrupt every later verdict, before any
analysis. Dispatch one read-only (`explore`) sub-agent:

```
Prompt: Naming audit for <target>.

For every entity (table, field, service, component, endpoint) in scope:
  1. Does the name accurately describe what it actually holds/does?
  2. Is there another entity with a similar name it could be confused with?
  3. Read 2–3 actual records (or the code body) and compare to the name.
     Flag any mismatch.

Return a table only (no verdicts):
  Entity | What name implies | What it actually contains | Mismatch?
```

### 🛑 Checkpoint 1
Present the naming table and your proposed scope boundary (what this target owns
vs merely reads). Ask the human to confirm corrected names and scope before
proceeding. A mismatch here changes the verdicts in every later stage. Do not
proceed until confirmed.

---

## Stage 1 — Multi-source Ground Truth

Gather evidence from **all three** sources simultaneously via parallel read-only
sub-agents. Each source catches what the others miss.

| Source | What it catches |
|---|---|
| **Live DB / runtime** | Actual schema, real data, column comments, row shapes |
| **App code** | What actually reads/writes each entity; stubs vs live paths |
| **Plan / spec / migrations** | Intent; evolution history; documented decisions |

Launch three `explore` sub-agents in parallel (one message, three `Task` calls):

**A — Live introspection:** every in-scope entity (name, fields, types,
descriptions), 2 sample records each, row counts (liveness only), and FK/ownership
relationships.

**B — Code evidence:** every file that reads/writes each entity (file:line);
whether each reader/writer is live or a stub; the module that OWNS each entity vs
those that merely READ it; any code using the wrong entity for its purpose.

**C — Plan / spec / migration evidence:** the original design doc, migration
history (before/after), documented decisions, what was explicitly deferred or
descoped, and what the plan SAYS is live vs what code/DB show.

Synthesize the three outputs. Note every discrepancy between sources — that is
where the real problems live.

---

## Stage 2 — Entity-level Devil's Advocate

For each entity **cluster** (group related entities), dispatch one focused
`explore` sub-agent that challenges every verdict. **One cluster = one agent.**
Never batch unrelated clusters — context pollution corrupts both verdicts.

Standard question set (apply to every entity):

```
For entity <X>:
1. PURPOSE   — Plain terms: what does it do? What breaks if it vanished tomorrow?
2. OWNERSHIP — Does <service> own it, or merely read it from another domain?
3. NAME      — Does the name match the data? (Reference Stage 0.)
4. EVIDENCE  — Live code that reads AND writes it? file:line each. Writers but no
               readers (or vice-versa) → flag. Read by a service that shouldn't
               own it → flag.
5. FOLD TEST — Can it be absorbed into a parent? (See fold tests below.)
6. PII/BOUNDARY — Personal data? Which DB/domain should it live in? Match current?
7. STUB CHECK — Is the using code live, or a stub/throw/no-op?
8. VERDICT   — Propose from the dynamic taxonomy below, justified with evidence.
               Never justify with row count.
```

### 🛑 Checkpoint 2
Present per-entity verdicts as a table (Entity | Proposed verdict | Evidence).
Ask the human to confirm, override, or request more evidence before the
system-level stage. Wait for the answer.

---

## Dynamic verdict taxonomy

`KEEP / FOLD / DROP` is too rigid — it only fits relational tables. A dissection
target may be a written plan, a runtime flow, or a coupled module, so verdicts are
**action-oriented and target-aware**. Pick the most precise verdict; each must
cite evidence (file:line or live DB), never row count.

| Verdict | Meaning | Typical on a PLAN | Typical on EXISTING CODE/DB |
|---|---|---|---|
| **KEEP** | Correct and load-bearing as-is. | Approved in spec. | Active, correct logic. |
| **FOLD** | Absorb into a parent (columns or JSONB). | Merge planned entities. | Schema normalization cleanup. |
| **DROP** | Remove entirely. | Descope the feature. | Delete dead/unused code. |
| **DEFER** | Keep the seam, postpone the build (YAGNI). | Move to a later phase/backlog. | Stub/flag the implementation; ship the interface. |
| **ON-DEMAND** | Replace stored/pre-staged state with compute-at-read. | Don't plan pre-rendering/pre-caching. | Swap a table/cache for a runtime helper. |
| **EXTRACT** | Split a mixed concern apart (design decoupling). | Separate concerns in the design. | Break up a god-component/module. |
| **RE-HOME** | Move ownership to the correct domain/service/DB. | Fix the boundary in the design. | Move logic/table to its real owner. |
| **REFACTOR** | Keep the behavior, rewrite the execution. | Simplify the planned pattern. | Fix tech debt / bad name / wrong library. |
| **OUT-OF-SCOPE** | Belongs to another domain entirely. | Not this plan's concern. | Owned by another service — stop counting it. |

Distinctions that matter:
- **RE-HOME vs EXTRACT.** RE-HOME = good logic, wrong home (move it). EXTRACT =
  tangled concerns (split it before it ossifies).
- **DEFER vs DROP.** DEFER keeps the seam/interface for a known-future need; DROP
  removes it because nothing needs it. Default to DROP unless a requirement names
  the future use.
- **ON-DEMAND vs KEEP.** If stored state can be recomputed cheaply at read time,
  prefer ON-DEMAND — it removes storage, sync, and staleness surface area.

---

## Stage 3 — Cross-cutting challenges + adversarial red-team

After entity verdicts, challenge the **system-level design**, then red-team the
emerging plan from independent adversarial angles. This is where dissect borrows
deep-deliberation's Tree-of-Thought and red-team machinery.

### 3a. System-level questions (one `explore` sub-agent)
1. **Send/process model** — Is there pre-staging/pre-rendering/pre-computation
   that could be deferred to the moment it's needed? What's the throughput ceiling?
2. **Feedback loops** — When something fails (bounce, rejection, error), is the
   signal captured and acted on, or is the feedback path a stub?
3. **Ownership boundaries** — Where does this service read/write data that belongs
   to another? Any misuse of another domain's tables?
4. **Naming & taxonomy** — Are concepts that share a name actually different
   things (kind vs channel vs group)? Conflation causes the worst bugs.
5. **Live vs designed** — For each major feature, is it actually running or a
   stub/planned/throw? List what is NOT live that the plan implies is live.

### 3b. Tree-of-Thought refactor branches (orchestrator)
Do not assume a single target state. Generate **2–4 distinct end-states** for the
optimization, each with idea, pros/cons, main risk, and rough effort (S/M/L).
Example axis for a storage-heavy target:
- *Branch A — ON-DEMAND:* compute at read, zero new storage.
- *Branch B — FOLD/JSONB:* absorb into parent, flexible, fewer joins.
- *Branch C — hard relational consolidation:* columns + strict keys.
Prune dominated branches and say why. Recommend one + a runner-up.

### 3c. Adversarial red-team panel (parallel `explore` sub-agents)
Launch independent personas in parallel; each attacks first, then concedes what
survives, and returns evidence — not a final verdict. Minimum panel:
- **Zero-Utility Hawk** — argues to DROP or FOLD every entity; forces each KEEP to
  earn its place against live evidence.
- **Migration-Risk Hawk** — red-teams the proposed plan itself: does the migration
  create more downtime/risk than leaving the mess in place?
- **Boundary Hawk** — hunts ownership/PII violations and wrong-domain reads.
- **Stub Hunter** — proves which "features" are actually live vs throws/no-ops/DLQ.

(Reuse the deep-deliberation persona prompt shape: identity → relevant file paths
→ approach under review → attack, then concede, then evidence.)

---

## Stage 4 — Synthesis + minimal-build plan

Done in the main context (synthesis needs all evidence held together). Output:

**0. Naming corrections** — every mismatch found, with corrected names (apply
throughout).
**1. Scope boundary corrections** — entities wrongly counted in this domain; the
real owner of each; any live code that incorrectly crosses the boundary.
**2. Entity verdicts** — one table: Entity | Verdict | Rationale (file:line / live
evidence) | Lands (if FOLD/RE-HOME). No row-count justifications.
**3. System-level changes** — for each cross-cutting issue, in this format:
- **Decision:** [what]
- **Why:** [evidence-backed reason]
- **Other options:** [alternatives + why rejected]
**4. Bug / misuse log** — places where code uses the wrong entity or wires an
entity to the wrong system. Correctness issues, distinct from optimization.
**5. Execution order** — the minimal-build sequence: highest-value/most-independent
first, what depends on what, what to defer.
**6. Deferred / out of scope** — what is intentionally NOT changing, each with a
reason.

### 🛑 Checkpoint 3
Present the plan led by a plain-terms summary (for the product owner) followed by
the technical detail (for the engineer), with the recommended ToT branch and
ranked alternatives. Ask the human which branch to execute. Do not start
implementing unless they ask.

---

## Fold tests (reference)

| Cardinality | Fold type | Blocker |
|---|---|---|
| 1:1 with parent | Columns on parent | None — do it |
| 1:N, bounded set (≤~10) | JSONB on parent | Independent relational access needed |
| 1:N, unbounded/queried | Keep as table | — |
| N:M | Keep as table | — |
| Any | Cannot fold across a PII/DB boundary | PII crosses a DB line |

**Independent relational access** = does anything query this entity directly by
its own key, join it independently, or filter/sort it without going through the
parent? If yes → fold is blocked.

---

## Sub-agent dispatch rules

- **Parallel for the Stage 1 triple** (DB + code + plan) — independent, run at once.
- **One cluster per Stage 2 agent** — never mix unrelated clusters.
- **Read-only only.** All dissection agents use `subagent_type: "explore"`. No write
  access. Do NOT pass a `model` — sub-agents inherit the parent model.
- **Agents return raw evidence, not verdicts.** Synthesis is the orchestrator's job.
- **Escalate discrepancies** to the checkpoint; never resolve them silently.

---

## Key lessons (baked in)

- **Read the actual data first.** A table named `managed_preference` might contain
  "Favorite Drink → Moscow Mule." You would never know without reading it.
- **Channel ≠ kind ≠ group.** Multiple orthogonal taxonomies get conflated; that
  produces wrong verdicts. Keep them distinct.
- **"Built for" vs "used for."** A table built for one purpose can be misused for
  another. If design intent and actual use diverge, that's a bug, not a design.
- **The eligibility/read pipeline is not authoritative.** What a pipeline reads
  doesn't define the correct data model — it may be reading the wrong thing.
- **Stubs inflate the system.** A cron that throws, a consumer that re-queues, a
  client that returns `permanent_failure` for all inputs — none are live.
- **Plan and code diverge.** The plan is intent; the code is reality. Ground the
  optimization in reality.

---

## Output format notes

- Every verdict cites evidence. No bare assertions.
- Every FOLD/RE-HOME states the target it lands in and which fold test applies.
- Every OUT-OF-SCOPE names the correct domain owner.
- Every DROP names the reason (no code path / derivable / moved / legacy).
- Every DEFER/ON-DEMAND names the requirement that justifies the seam (or its
  absence).
- Row count appears only as liveness context, never as a reason.
- Lead with plain-terms summaries, then technical detail. Write both.
