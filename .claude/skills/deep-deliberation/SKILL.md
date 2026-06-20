---
name: deep-deliberation
description: >-
  Deeply analyze a problem, feature, or decision through a 3-stage pipeline:
  Tree-of-Thought branch exploration, an expert red-team debate, and a senior
  developer red-team debate, ending in a grounded final recommendation with
  ranked alternatives. Use when the user explicitly invokes deep-deliberation,
  or asks to deeply explore / stress-test / red-team a problem, feature idea,
  architecture choice, or hard decision before committing to an approach.
disable-model-invocation: true
version: "1.2.0"
author: "Ali Farahat"
tags: ["deep-deliberation", "orchestration", "red-team", "decision-making"]
when_to_use: |
  USE WHEN (forward-looking, "what should we build?"):
  - User explicitly invokes deep-deliberation or asks to "deep think" a problem.
  - A high-stakes decision is on the table and a wrong approach is expensive to reverse
    (architecture choice, data model, framework/vendor selection, migration strategy).
  - The solution space is genuinely open: multiple plausible approaches exist and the
    tradeoffs are non-obvious.
  - The user wants an idea, feature, or plan stress-tested / red-teamed before committing.
  - Ambiguity or disagreement needs to be surfaced and resolved with grounded evidence.

  DO NOT USE WHEN:
  - The task is trivial, mechanical, or has one obvious correct answer (just do it).
  - Speed matters more than rigor (this pipeline is deliberately heavy: up to 10 subagents
    + 3 checkpoints).
  - The goal is to AUDIT or OPTIMIZE an entity that ALREADY EXISTS (a shipped service,
    written plan, or codebase area). For that, use the companion `dissect` skill instead —
    deliberation generates and chooses; dissect interrogates ground truth and prunes.
---

# Deep Deliberation

A structured "deep think" pipeline for high-stakes problems where the cost of a
wrong approach is high. It explores the solution space, then attacks the chosen
approach from two independent angles before recommending.

## Core principles

- **Subagents inherit the parent model.** Do NOT pass a `model` to the `Task`
  tool — every subagent must run on the same LLM as the orchestrating agent.
- **Three human checkpoints.** The pipeline STOPS after each stage and waits for
  the user. Never skip a checkpoint or run stages back-to-back without consent.
- **Grounded in real code.** Expert and senior-dev subagents run readonly and
  explore the actual repository so the debate reflects the real codebase, not
  abstractions.
- **Red-team, not rubber-stamp.** "Adversarial" here means devil's-advocate:
  personas actively attack the idea, surface failure modes, then the strongest
  surviving position wins. No premature consensus.
- **The orchestrator pushes back.** Between stages, the main agent injects its
  own challenges and recommendations — it is a participant, not a passive router.
- **Mode-Aware Results Treatment.** Recognize the current Cursor active mode:
  - **Plan Mode:** Do NOT create, propose, or write formal implementation plans or files (such as `.md` docs or architectural specs) during intermediate stages. The plan should ONLY be created and presented after the entire deep deliberation has completed (after Stage 3 is done), ensuring it is fully informed by all red-teaming phases.
  - **Agent Mode:** Do NOT create or edit any codebase files during the deliberation stages. Wait until the entire 3-stage deep deliberation has completed and the user has explicitly approved the final recommendation.
  - **Ask Mode:** Focus purely on deep, conceptual/educational reviews and exploration of existing code. No implementation plans or code changes are proposed.
- **True Independent Sub-agents.** Each expert or senior-developer persona must be run as an independent sub-agent. Launch each persona as a separate `Task` tool call in parallel to ensure their perspectives remain isolated and truly adversarial.
- **File-Grounded Context.** Sub-agents must be given sufficient context to perform real-world analysis. The orchestrator must identify and pass specific relevant file paths, directories, and structural context of the codebase into each sub-agent's prompt, directing them exactly where to look.

## Pipeline overview

```
USER input (problem / feature / issue / decision)
   ↓
[Stage 1] Tree of Thought          (orchestrator)
   🛑 CHECKPOINT 1 — user picks/adjusts a branch
   ↓
[Stage 2] Expert red-team          (5 independent persona subagents, readonly)
   🛑 CHECKPOINT 2 — user reviews findings / steers
   ↓
[Stage 3] Senior-dev red-team      (5 independent persona subagents, readonly)
   🛑 CHECKPOINT 3 — user makes final call
   ↓
FINAL recommendation + ranked alternatives (with Mode-Specific Output)
```

Copy this checklist and track progress out loud:

```
Progress:
- [ ] Stage 1: Tree of Thought → recommend branch
- [ ] CHECKPOINT 1
- [ ] Stage 2: Expert red-team (5 independent personas)
- [ ] CHECKPOINT 2
- [ ] Stage 3: Senior-dev red-team (5 independent personas)
- [ ] CHECKPOINT 3 → final recommendation + mode-specific output
```

---

## Stage 1 — Tree of Thought (orchestrator)

Done by the main agent directly (no subagents).

0. **Ground before branching (ground truth beats intent).** If the problem touches
   existing code, data, or a written plan, do a quick read of the real artifacts
   first — actual schema, the function bodies, what the plan says vs what ships.
   Branches that ignore ground truth waste a checkpoint. If the system being changed
   already exists and the real question is "what is actually here and what should
   change?", stop and run the `dissect` skill instead of generating branches.
1. **Restate the problem** in one or two sentences. Surface assumptions and any
   ambiguity. If the problem is unclear, ask before generating branches.
2. **Generate 3–5 distinct branches** (meaningfully different approaches, not
   variations of one). For each branch capture:
   - One-line summary
   - Key idea / mechanism
   - Pros, cons, main risk
   - Rough effort (S / M / L)
3. **Evaluate & prune.** Score each branch against the criteria that matter for
   this problem (e.g. correctness, effort, risk, maintainability, fit with
   existing code). Prune clearly dominated branches and say why.
4. **Recommend** the strongest branch with a short rationale, plus the runner-up.
5. **Add the orchestrator's own pushback** — at least one challenge to your own
   recommendation.

Present using the Stage 1 template, then STOP.

### 🛑 Checkpoint 1

Ask the user (use the AskQuestion tool when available): which branch to carry
forward, or whether to adjust/merge branches. Do not proceed until they answer.

---

## Stage 2 — Expert red-team (subagents)

Goal: stress-test the **selected branch** from diverse expert angles.

1. **Design 5 personas** tailored to the problem domain. Each persona needs:
   - Name + role (e.g. "Distributed-systems architect")
   - Skillset, years/level of experience, specific domain knowledge
   - The angle/bias they bring (e.g. security hawk, performance, UX, cost, ops)
2. **Launch 5 independent subagents in parallel** — one `Task` call per persona in a single
   message. Use `subagent_type: "explore"` (readonly, repo-aware) so they ground
   their critique in the real codebase. **Do not pass a `model`.**
3. **Identify relevant files.** The orchestrator must list specific files and directories in the workspace relevant to this feature or change and include them in the prompt.
4. Each subagent prompt MUST include: the full problem, the selected branch, the
   persona definition, specific relevant file paths/context, and a demand to **attack first** (failure
   modes, edge cases, hidden costs) then concede what survives.
5. **Orchestrator synthesizes**: cluster the attacks, mark which are fatal vs
   fixable, note disagreements between experts, and add your own pushback.

Use the subagent prompt template below. Present findings via the Stage 2
template, then STOP.

### 🛑 Checkpoint 2

Ask the user whether to proceed to the senior-dev review, revise the branch
based on findings, or loop back to Stage 1. Wait for their answer.

---

## Stage 3 — Senior-dev red-team (subagents)

Goal: a panel of senior engineers debates the **combined Stage 1 + Stage 2
output** and produces the final call.

1. **Design 5 senior-developer personas** (staff/principal level, varied
   specialties — backend, frontend, infra/DevOps, security, product-eng).
2. **Launch 5 independent subagents in parallel** (`subagent_type: "explore"`, readonly, no
   `model`). Feed them: original problem, selected branch, Stage 2 findings, specific relevant file paths, and
   the repo. Task them to red-team the *findings and the plan itself* — including
   whether the experts missed something or over-indexed on a risk.
3. **Orchestrator synthesizes** into a single FINAL recommendation with ranked
   alternatives, explicit risks, and a concrete next step, aligned with the active coding mode.

Present via the Final template, then STOP.

### 🛑 Checkpoint 3

Present the final recommendation and ranked alternatives. Ask the user how they
want to proceed. Do not start implementing unless they ask.

---

## Subagent prompt template

Use this for every persona in Stage 2 and Stage 3. Fill the brackets.

```
You are [persona name], a [role] with [experience]. Your expertise: [skillset /
domain knowledge]. You bring a [angle/bias] perspective.

PROBLEM:
[restated problem]

RELEVANT CODEBASE FILES & ENTRY POINTS:
[list of specific file paths and directories to explore]

APPROACH UNDER REVIEW:
[selected branch — and for Stage 3, also the Stage 2 findings]

YOUR TASK (red-team):
1. Explore the relevant parts of this repository (focusing on the files listed above) to ground your analysis in the
   actual code.
2. ATTACK the approach: failure modes, edge cases, hidden costs, false
   assumptions, maintainability traps, security/perf/ops concerns in your domain.
3. Then concede: what holds up under your attack? What would you change to make
   it survive?
4. Give a verdict: GO / GO-WITH-CHANGES / NO-GO, with one-line justification.

Return: a concise bulleted critique (attacks first, then concessions) and your
verdict. Be specific and cite files/lines where relevant.
```

---

## Output templates

### Stage 1 — Tree of Thought

```markdown
## Problem
[restatement + assumptions]

## Branches
### Branch A — [name]
- Idea: ...
- Pros / Cons / Risk: ...
- Effort: S/M/L
[... B, C, ...]

## Evaluation
[scoring + what was pruned and why]

## Recommendation
Primary: [branch] — [why]
Runner-up: [branch]
Orchestrator pushback: [self-challenge]
```

### Stage 2 — Expert red-team

```markdown
## Expert panel
[5 personas, one line each]

## Findings
- 🔴 Fatal: ...
- 🟡 Fixable: ...
- ⚪ Minor / disagreement: ...

## Expert verdicts
[GO / GO-WITH-CHANGES / NO-GO per persona]

## Orchestrator synthesis
[clustered view + own pushback]
```

### Final recommendation

```markdown
## Recommendation
[the call + why]

## Rationale
[how Stage 1–3 led here]

## Ranked alternatives
1. [alt] — when to prefer it
2. [alt] — when to prefer it

## Risks & mitigations
- [risk] → [mitigation]

## Next step (Mode-Specific Action)
[one concrete action depending on active mode (e.g. draft finalized plan document for Plan Mode, or prepare for implementation for Agent Mode)]
```

---

## Notes

- This pipeline is deliberately heavy (up to 10 subagents + 3 checkpoints). Use
  it for consequential decisions, not quick questions.
- If the problem turns out trivial after Stage 1, say so and offer to stop early
  rather than forcing the full pipeline.
- Keep each subagent prompt self-contained: subagents do not see the user's
  messages or prior stages unless you include that context in the prompt.
- **Companion skill — `dissect`.** Deep-deliberation is generative: it explores a
  solution space and chooses an approach for something not yet built. When the target
  already exists (a shipped service, a written plan, a codebase area) and the goal is
  to interrogate it against ground truth and arrive at the minimal-build change, use
  `dissect`. The two skills share DNA — adversarial red-team subagents, human
  checkpoints, evidence over intent — but point in opposite directions: deliberation
  looks forward (design), dissect looks backward (audit).
```
