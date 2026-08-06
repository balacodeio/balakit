# Delegate dispatch and prompt

Used by Stage 2 and Stage 3 of `deep-deliberation`. Delegates are isolated
review contexts, not independent authorities. Their value comes from distinct
missions, evidence requirements, and context isolation—not fictional
credentials.

## Dispatch

Prefer the host's read-only delegation mechanism:

- **Cursor:** use parallel `Subagent` calls with `subagent_type: "explore"` and
  `readonly: true`.
- **Other hosts:** use the nearest isolated, read-only delegate or subtask
  capability.
- Use the host's default model unless the user explicitly requests another.
- If only sequential delegation exists, preserve mission isolation and run the
  prompts separately.
- If no delegation exists, report `DELEGATED_REVIEW_UNAVAILABLE`. Continue with
  labelled orchestrator passes only after user approval.

Launch all delegates for a stage before synthesizing. Tool calls and synthesis
belong to separate assistant steps: dispatch first, wait for returned results,
then synthesize.

## Prompt template

Fill every bracketed field. Send one self-contained prompt per mission.

```text
REVIEW MISSION
[feasibility and integration | failure, security, and edge cases |
operations, migration, and cost | challenger advocate |
evidence adjudicator | premortem challenger | domain specialist]

DECISION
[decision statement, desired outcome, constraints, and non-goals]

EVALUATION CRITERIA
[must / important / preference criteria]

OPTIONS UNDER REVIEW
Option A: [complete summary]
Option B: [complete summary]

RELEVANT EVIDENCE
Repository paths: [specific files, directories, symbols, or entry points]
External sources: [authoritative current sources, or "none"]

PRIOR FINDINGS
[Stage 2 findings for Stage 3; otherwise "none"]

TASK
1. Inspect the supplied evidence and any directly relevant adjacent material.
2. Compare both options through this mission's lens.
3. Attack assumptions and identify failure modes before describing strengths.
4. Return at most three findings. Do not vote or manufacture consensus.
5. If evidence is insufficient, label the finding unverified.

RETURN EACH FINDING EXACTLY AS
claim:
evidence:
source:
impact: blocker | fixable | minor | unverified
confidence: high | medium | low
affected_option: A | B | both
falsifier:

Finish with:
surviving_strengths:
preferred_option_for_this_mission: A | B | neither | uncertain
reason:
```

## Evidence rules

- Repository evidence cites a path plus line, symbol, or configuration key when
  available.
- External evidence cites the authoritative source and retrieval date.
- Repeated assertions are not corroboration unless they rely on distinct
  evidence.
- A high-confidence blocker requires direct evidence and a plausible causal
  path to failure.
- Missing evidence lowers confidence; it never becomes evidence through
  repetition.
