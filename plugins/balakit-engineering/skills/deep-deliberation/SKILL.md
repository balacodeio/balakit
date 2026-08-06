---
name: deep-deliberation
description: >-
  Runs a checkpoint-gated decision process for consequential, forward-looking
  design choices. Use only when the user explicitly invokes deep-deliberation
  to compare approaches, challenge assumptions, and reach an evidence-grounded
  recommendation before implementation. Use dissect instead to audit an
  existing system or written plan.
user-invocable: true
disable-model-invocation: true
invocation-type: manual
version: "2.0.0"
author: "Ali Farahat"
tags: ["decision-making", "red-team", "evidence", "orchestration"]
when_to_use: |
  USE WHEN:
  - The user explicitly invokes deep-deliberation for a consequential decision.
  - Multiple viable approaches exist and the tradeoffs are non-obvious.
  - The cost of choosing incorrectly is meaningfully higher than the cost of deliberating.
  DO NOT USE WHEN:
  - The task is trivial, mechanical, or has one clear answer.
  - The goal is to audit or optimize something that already exists; use dissect.
---

# Deep Deliberation

> **Leading words:** option tree, evidence tournament, reversibility,
> adversarial review, premortem, uncertainty, checkpoint, ground truth.

Deep Deliberation frames a consequential decision, compares viable alternatives,
tests them against evidence, and adjudicates unresolved risks. The pipeline
produces a decision record, not implementation.

## Operating contract

- Do not edit files, implement code, or create formal plan documents while the
  pipeline is active.
- Ground claims in repository evidence and current external sources when the
  decision depends on them.
- Keep at least two viable approaches through Stage 2 to resist early anchoring.
- Preserve material disagreements; never silently average them away.
- Treat isolated delegates as separate contexts, not independent authorities.
- Never invent missing delegate findings or unsupported evidence.
- Stop after every checkpoint. Continue only after the user explicitly responds.
- The user may revise, restart, or end the pipeline at any checkpoint.
- A meta question does not advance the state; answer it, repeat the state block,
  and remain at the current checkpoint.

## Runtime state

Start every pipeline response with this block and update it mechanically:

```text
DELIBERATION_STATE
stage: 1 | 2 | 3
checkpoint: none | 1 | 2 | 3
shortlist: unset | A,B
delegate_results: 0/N
next_action: one action only
```

If the state is missing after a context change, reconstruct it from the latest
completed template and ask the user to confirm before advancing.

## Pipeline

1. **Stage 1 — Frame and shortlist:** define the decision, generate 3–5
   approaches, and shortlist the strongest two.
2. **Checkpoint 1:** user approves the framing and shortlist.
3. **Stage 2 — Evidence tournament:** 3–5 focused reviewers compare both
   shortlisted approaches using a normalized evidence contract.
4. **Checkpoint 2:** user reviews findings and unresolved disputes.
5. **Stage 3 — Adjudication:** targeted evidence review and premortem produce the
   final recommendation.
6. **Checkpoint 3:** user approves, revises, or rejects the recommendation.

No implementation follows automatically. Wait for an explicit post-pipeline
request.

## Stage 1 — Frame and shortlist

Stage 1 is performed by the orchestrator without delegates.

### Entry gate

If the decision is materially ambiguous, ask focused clarification before
starting Stage 1. If the task primarily audits something already built or
written, recommend `dissect` instead.

### Procedure

1. Inspect relevant code, schemas, documentation, constraints, and prior
   decisions.
2. State the decision, desired outcome, constraints, non-goals, assumptions,
   evidence gaps, decision horizon, reversibility, and cost of delay.
3. Declare evaluation criteria before evaluating options. Use `must`,
   `important`, and `preference`; use numeric weights only when defensible.
4. Generate 3–5 meaningfully different approaches. For each, state its
   mechanism, expected benefit, main downside, critical assumptions, supporting
   evidence, reversibility, rough effort, and failure condition.
5. Remove clearly dominated options with an explicit reason.
6. Shortlist the strongest option and strongest challenger. Relabel them
   `Option A` and `Option B` for the remaining stages. Do not make the final
   recommendation yet.

Read [references/output_templates.md](references/output_templates.md), emit the
complete Stage 1 template, set `checkpoint: 1`, and stop.

Checkpoint 1 choices:

- Approve the framing and shortlist.
- Replace, merge, or revise an option.
- Change criteria or constraints.
- End the pipeline because the decision is now obvious.

## Stage 2 — Evidence tournament

Stage 2 compares both shortlisted approaches. It does not defend a winner chosen
in Stage 1.

### Reviewer missions

Use these four default missions:

1. **Feasibility and integration**
2. **Failure, security, and edge cases**
3. **Operations, migration, and cost**
4. **Challenger advocate**

Add one domain specialist only when the decision clearly requires expertise not
covered above. Omit a default mission only when it is demonstrably irrelevant;
never run fewer than three reviews without user approval.

### Procedure

1. Identify specific repository files and authoritative external sources needed
   to evaluate the decision.
2. Read [references/subagent_prompt.md](references/subagent_prompt.md).
3. Launch one isolated, read-only delegate per mission using the host's supported
   mechanism. Use the host's default model unless the user requested another.
4. Launch delegates together when parallel dispatch is available. Launch and
   synthesis are separate assistant steps.
5. After results return, normalize and cluster them into evidence-backed
   blockers, fixable risks, minor concerns, unverified claims, disagreements,
   and evidence favoring the challenger.
6. If evidence invalidates both options, return to Stage 1 after user approval.

Each delegate returns no more than three findings. Every finding must contain:

```text
claim:
evidence:
source:
impact: blocker | fixable | minor | unverified
confidence: high | medium | low
affected_option: A | B | both
falsifier:
```

A blocker without evidence is `unverified`, not fatal.

Read [references/output_templates.md](references/output_templates.md), emit the
complete Stage 2 template, set `checkpoint: 2`, and stop.

Checkpoint 2 choices:

- Proceed to adjudication.
- Revise an option and repeat Stage 2.
- Reopen Stage 1 with changed criteria or alternatives.
- End the pipeline.

## Stage 3 — Adjudication

Stage 3 resolves uncertainty instead of repeating Stage 2 with new personas.

Run these two read-only review missions:

1. **Evidence adjudicator:** verify disputed and high-impact claims; distinguish
   corroboration from repeated assertion.
2. **Premortem challenger:** assume the leading option failed six months after
   launch, identify the most plausible causes, and present the strongest
   remaining case for the runner-up.

Add a third domain adjudicator only when a Stage 2 dispute requires specialized
resolution.

The orchestrator then produces:

- Recommendation and rationale
- Comparison against the declared criteria
- Evidence that determined the decision
- Verified and unverified assumptions
- Material disagreements
- Reversibility and rollback cost
- Premortem risks and mitigations
- Conditions that would change the recommendation
- Ranked alternatives
- Cheapest experiment or spike that could reduce remaining uncertainty
- One next action appropriate to the session's current capabilities

Read [references/output_templates.md](references/output_templates.md), emit the
complete Final template, set `checkpoint: 3`, and stop.

Checkpoint 3 choices:

- Approve the recommendation.
- Request revision.
- Select an alternative.
- Request planning or implementation as a separate next action.

## Delegate failure protocol

1. Retry one transient delegate failure.
2. Report unavailable missions explicitly.
3. If fewer than three Stage 2 reviews or fewer than two Stage 3 reviews return,
   ask whether to retry or continue in labelled degraded mode.
4. If delegation is unavailable, state `DELEGATED_REVIEW_UNAVAILABLE` and ask
   before substituting isolated orchestrator passes.
5. Never synthesize findings that were not returned.

## Completion check

Before declaring the pipeline complete, verify:

- At least two viable approaches received adversarial comparison.
- High-impact claims carry evidence or are labelled unverified.
- Reversibility and residual uncertainty are explicit.
- Material disagreements remain visible.
- The recommendation states what evidence would overturn it.
- No implementation occurred before explicit post-checkpoint approval.

## References

- [references/subagent_prompt.md](references/subagent_prompt.md) — portable
  delegate dispatch, reviewer prompt, evidence contract, and failure handling.
- [references/output_templates.md](references/output_templates.md) — exact
  Stage 1, Stage 2, and Final response structures.
