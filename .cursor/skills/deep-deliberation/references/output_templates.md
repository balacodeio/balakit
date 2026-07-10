# Output templates

Use these structures exactly. Fill every section; write `None` when a section
has no content. Do not replace them with an unstructured narrative.

## Stage 1 — Frame and shortlist

```markdown
DELIBERATION_STATE
stage: 1
checkpoint: 1
shortlist: A,B
delegate_results: 0/0
next_action: Wait for the user's Checkpoint 1 decision.

## Decision
[Decision, desired outcome, decision horizon, and cost of delay.]

## Constraints and non-goals
- Must: [...]
- Important: [...]
- Preference: [...]
- Non-goals: [...]

## Assumptions and evidence gaps
- Assumption: [...] — evidence: [source or unverified]

## Reversibility
[One-way or two-way door, rollback cost, and cost of being wrong.]

## Options
### Branch A — [name]
- Mechanism: [...]
- Expected benefit: [...]
- Main downside: [...]
- Critical assumptions: [...]
- Supporting evidence: [...]
- Reversibility: [...]
- Rough effort: S | M | L
- Failure condition: [...]

[Repeat for Branches B–E as needed.]

## Evaluation
- Branch A: [pass | partial | fail | unknown by criterion]
- Branch B: [pass | partial | fail | unknown by criterion]
- Pruned: [branch and explicit reason, or None]

## Shortlist
- Option A: [original branch] — [why it advances as the leading option]
- Option B: [original branch] — [why it advances as the strongest challenger]
- Evidence most likely to change this shortlist: [...]

## Checkpoint 1
[Ask the user to approve, revise, restart, or end the pipeline.]
```

## Stage 2 — Evidence tournament

```markdown
DELIBERATION_STATE
stage: 2
checkpoint: 2
shortlist: A,B
delegate_results: [returned]/[launched]
next_action: Wait for the user's Checkpoint 2 decision.

## Review missions
- [Mission]: [returned | failed | unavailable]

## Evidence-backed blockers
- [Claim] — [source] — affects [A | B | both]

## Fixable risks
- [Claim] — [source] — mitigation: [...]

## Minor concerns
- [Claim] — [source]

## Unverified claims
- [Claim] — missing evidence: [...]

## Material disagreements
- [Conflict] — [why it remains unresolved]

## Challenger case
[Strongest evidence favoring the current runner-up.]

## Synthesis
- Option A survives because: [...]
- Option B survives because: [...]
- Decision-changing unknowns: [...]
- Return to Stage 1 required: yes | no

## Checkpoint 2
[Ask the user to proceed, revise, reopen Stage 1, or end the pipeline.]
```

## Final recommendation

```markdown
DELIBERATION_STATE
stage: 3
checkpoint: 3
shortlist: A,B
delegate_results: [returned]/[launched]
next_action: Wait for the user's Checkpoint 3 decision.

## Recommendation
[Chosen option, confidence, and concise rationale.]

## Criteria comparison
- Must: [...]
- Important: [...]
- Preference: [...]

## Determining evidence
- [Evidence] — [source] — [implication]

## Assumptions and uncertainty
- Verified: [...]
- Unverified: [...]
- Residual uncertainty: [...]

## Material disagreements
- [Disagreement and why the recommendation proceeds despite it, or None]

## Reversibility and rollback
[Rollback path, switching cost, and point of no return.]

## Premortem
- Failure mode: [...] — mitigation: [...] — early warning: [...]

## Conditions that change the recommendation
- Switch or reopen the decision if: [...]

## Ranked alternatives
1. [Alternative] — prefer when [...]
2. [Alternative] — prefer when [...]

## Cheapest de-risking action
[Smallest experiment, prototype, or evidence-gathering action that could reduce
the most important uncertainty.]

## Next step
[One action appropriate to the session's current capabilities. Do not execute it.]

## Checkpoint 3
[Ask the user to approve, revise, choose an alternative, or request a separate
planning/implementation action.]
```
