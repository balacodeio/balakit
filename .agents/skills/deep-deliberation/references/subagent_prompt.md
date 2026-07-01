# Subagent prompt template

Used by Stage 2 (expert red-team) and Stage 3 (senior-dev red-team) of
`deep-deliberation`. Fill every bracketed field. Send one filled template per
persona as a separate `Task` call (`subagent_type: "explore"`, no `model`).

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

## Persona design notes

**Stage 2 — Expert red-team:** 5 personas tailored to the problem domain. Each
persona needs:
- Name + role (e.g. "Distributed-systems architect")
- Skillset, years/level of experience, specific domain knowledge
- The angle/bias they bring (e.g. security hawk, performance, UX, cost, ops)

**Stage 3 — Senior-dev red-team:** 5 senior-developer personas (staff/principal
level, varied specialties — backend, frontend, infra/DevOps, security,
product-eng). Task them to red-team the *findings and the plan itself* —
including whether the experts missed something or over-indexed on a risk.
