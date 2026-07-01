# Output templates

The three required output templates for `deep-deliberation`. Stage 1 is filled
inline by the orchestrator; Stage 2 and Final templates are filled after the
subagent panel returns findings. Each template's headers are non-negotiable —
see the *NON-NEGOTIABLE* section of the skill.

## Stage 1 — Tree of Thought

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

## Stage 2 — Expert red-team

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

## Final recommendation

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
