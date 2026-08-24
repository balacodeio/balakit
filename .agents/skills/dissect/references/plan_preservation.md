# Plan preservation (patch in place)

Load this file when **any** of these is true, **before any write**:

- The session is in **Cursor Plan Mode**
- The session is in **Claude Plan Mode**
- `/dissect` (or equivalent) is aimed at an existing plan file
- A plan document is already open as the session's document of record

Dissect still audits whatever the target is. This file only governs **how
findings land** when that target (or the host) already has a plan document.

## Contents

- Detection
- Goal
- Forbidden
- Required sequence
- Patch map
- Host notes
- Worked example
- Override

## Detection

Record:

```
source_plan: <absolute path | session plan file>
host_plan_mode: cursor | claude | none
```

If the user did not name another target and Plan Mode is active, `source_plan`
**is** the current plan document.

Read the **entire** source plan before proposing edits.

## Goal

Dissect the live plan, then **update it**:

- Fix what is wrong
- Tune what is imprecise
- Fill gaps that the original plan missed
- Leave everything else untouched

The plan after dissect should still be recognizably the same document, improved.

## Forbidden

- Full-file `Write` of `source_plan`
- Creating a second plan file (new `.plan.md`, duplicate in `~/.claude/plans`,
  sibling "dissection plan") that replaces the live one
- Deleting or summarizing sections the patch map marked `KEEP`
- Dumping the Stage 4 six-section report as the new body of the plan
- Using "the plan is messy" as a reason to rewrite

## Required sequence

1. Read the entire source plan.
2. Run the normal dissect pipeline (Stages 0–3) against it (and against
   code/DB/runtime when those exist).
3. Build a **patch map** (below). The Stage 4 report stays in **chat**.
4. At Checkpoint 3, show the report **and** the patch map. Stop.
5. After the human confirms: apply **section-level** `Edit` / `StrReplace` only.
6. Reply with a diff summary: preserved / patched / appended / flagged.

## Patch map

```
KEEP    <heading or anchor> — no edit; leave verbatim
PATCH   <heading> — <what changes and why> — verdict
APPEND  <new heading or insertion point> — newly identified gap/finding
FLAG    <heading> — propose delete; do not delete until the human confirms
```

- **KEEP** is the default. Silence is not a rewrite license.
- **PATCH** fixes or tunes an existing section. Keep the section's heading and
  any todos/IDs unless the verdict says they are wrong.
- **APPEND** is how "things we didn't identify previously" enter the plan.
  Insert them in the most relevant existing section when one exists; otherwise
  add a short clearly-marked section (e.g. `## Dissection additions`). Do not
  use new findings as a pretext to rebuild the rest of the file.
- **FLAG** is a proposed removal. Wait for confirmation.

## Host notes

**Cursor Plan Mode.** Edit the session's existing plan (open `.plan.md` /
`.cursor/plans/*.plan.md` or the plan the UI has open). Use in-place
`StrReplace` / `Edit`. Do not `Write` the whole file. Do not create a sibling
plan. Do not treat the Stage 4 report as a `CreatePlan` payload.

**Claude Plan Mode.** Edit the current session plan file (`plansDirectory` or
`~/.claude/plans`, whichever this session owns). Use `Edit`, not `Write`. Do
not `ExitPlanMode` in order to replace the plan. Do not write a duplicate plan
into the project "for safety."

**Plan file as `/dissect` target (any host).** Same rules on that path, even
if Plan Mode is off.

## Worked example

Source plan has eight headings. Dissect finds two wrong approaches and one
missing risk.

| Section | Action |
|---|---|
| 1–4, 6–7 | KEEP |
| 5. Migration | PATCH — replace the downtime claim; keep the rest of the section |
| 8. Risks | PATCH — add the missing failure mode as a bullet |
| (none) | APPEND — new bullet under Risks, not a new document |

Result: still one file, still eight headings, two sections edited, six
byte-identical. No second plan created.

## Override

Full rewrite is allowed only when the human explicitly says to rewrite /
replace the plan from scratch. Restate that they asked for a rewrite at
Checkpoint 3 before doing it.
