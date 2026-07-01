# Fold Tests

Depth reference for `dissect` Stage 2 (Entity-level Devil's Advocate). The
fold test decides whether an entity can be absorbed into a parent (columns
or JSONB) or must remain a standalone table.

## Cardinality → fold type

| Cardinality | Fold type | Blocker |
|---|---|---|
| 1:1 with parent | Columns on parent | None — do it |
| 1:N, bounded set (≤~10) | JSONB on parent | Independent relational access needed |
| 1:N, unbounded/queried | Keep as table | — |
| N:M | Keep as table | — |
| Any | Cannot fold across a PII/DB boundary | PII crosses a DB line |

## Independent relational access

The key blocker for 1:N bounded sets. Does anything query this entity
directly by its own key, join it independently, or filter/sort it without
going through the parent?

- **Yes** → fold is blocked. Keep as a table.
- **No** → fold into JSONB on the parent.

## PII / DB boundary

Folding across a PII or DB boundary is never allowed, regardless of
cardinality. PII must stay in the DB/domain that is permitted to hold it.
