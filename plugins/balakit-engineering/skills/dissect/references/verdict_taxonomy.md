# Dynamic Verdict Taxonomy

Depth reference for `dissect` Stage 2 (Entity-level Devil's Advocate). The
verdicts are **action-oriented and target-aware** — `KEEP / FOLD / DROP` is
too rigid; it only fits relational tables. A dissection target may be a
written plan, a runtime flow, or a coupled module. Pick the most precise
verdict; each must cite evidence (file:line or live DB), never row count.

## Verdict table

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

## Distinctions that matter

- **RE-HOME vs EXTRACT.** RE-HOME = good logic, wrong home (move it). EXTRACT =
  tangled concerns (split it before it ossifies).
- **DEFER vs DROP.** DEFER keeps the seam/interface for a known-future need;
  DROP removes it because nothing needs it. Default to DROP unless a
  requirement names the future use.
- **ON-DEMAND vs KEEP.** If stored state can be recomputed cheaply at read
  time, prefer ON-DEMAND — it removes storage, sync, and staleness surface
  area.

## Output format for verdicts

Every verdict cites evidence. No bare assertions.
- Every FOLD/RE-HOME states the target it lands in and which fold test applies.
- Every OUT-OF-SCOPE names the correct domain owner.
- Every DROP names the reason (no code path / derivable / moved / legacy).
- Every DEFER/ON-DEMAND names the requirement that justifies the seam (or its
  absence).
- Row count appears only as liveness context, never as a reason.
