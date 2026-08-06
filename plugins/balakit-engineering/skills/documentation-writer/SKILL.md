---
name: documentation-writer
description: >-
  Write clear, scannable documentation using a research-first, phase-separated
  workflow. Covers READMEs, doc sites, API references, migration guides, and
  technical markdown. Uses web search for up-to-date facts and delegates broad
  repo reads to an explore subagent before drafting.
  Use when the user asks for documentation, technical writing, READMEs, doc
  websites, API docs, or readable markdown — or when accuracy, versions, or
  external APIs matter.
user-invocable: false
disable-model-invocation: false
version: "1.1.0"
author: "Ali Farahat"
tags: ["documentation", "technical-writing", "markdown", "research-first"]
when_to_use: |
  USE WHEN:
  - User asks for documentation, README, doc site, or technical writing.
  - User needs API reference, migration guide, or setup instructions.
  - Accuracy on versions, install commands, or external APIs matters.
  - User needs markdown formatting or doc site structure advice.

  DO NOT USE WHEN:
  - User needs a code review or code change (separate skill).
  - User needs marketing copy (use marketing-psychology).
  - User needs architecture diagrams or visual documentation.
---

# Documentation Writer

> **Leading words:** research-first, evidence-aware, phase separation,
> scannability, BLUF (Bottom Line Up Front), progressive disclosure.

Research-first technical documentation workflow. Each phase ends with a
checkpoint the agent must complete before proceeding — phase separation
prevents the agent from drafting prose before the truth is gathered.

## How this relates to subagents

Cursor does not expose user-defined nested sub-sub-agents in skill files. What
you can do in practice:

- **Phased work:** Treat each phase below as a distinct pass. That mimics
  routing without a separate UI.
- **Built-in delegation:** If the host agent can launch a `Task` / `explore`
  subagent, use a read-only explore pass for large or unfamiliar codebases
  *before* drafting. Do not assume that tool exists; use it only when present.
- **Online research:** Use web search (and official docs links from results)
  for anything version-sensitive or external.

## Phase 1 — Discover (know what exists in-repo)

Read relevant files. For unfamiliar or large codebases, delegate broad mapping
to an explore subagent when available.

*Exit criteria:* You can list every file/API/feature the docs must cover.
🛑 **Checkpoint:** Do not proceed to Research until the user confirms the scope
(or you are explicitly operating solo and the scope is unambiguous).

## Phase 2 — Research (external truth)

Run web research **before** asserting facts about:

- Library/framework APIs, CLI flags, config keys, breaking changes, deprecations
- Install commands, system requirements, LTS/support timelines
- Security or compliance claims (cite sources; avoid unsourced absolutes)

**Process:** Form 2-4 precise search queries (product + version + topic).
Prefer **primary sources** (official docs, repo README, standards bodies) over
random blogs. Capture citations (link + short note of what it supports). If
sources conflict, say what is uncertain and what to verify locally.

*Exit criteria:* Every claim you will make has a source link.
🛑 **Checkpoint:** Do not proceed to Outline until Research is complete.

## Phase 3 — Outline (structure before prose)

Headings, audience, prerequisites, nav/sidebar plan for sites. Apply BLUF:
lead each section with the direct answer in 40-60 words, then expand. Use
progressive disclosure — summary first, depth below.

*Exit criteria:* The document skeleton is approved.
🛑 **Checkpoint:** Present the outline. Do not draft until confirmed.

## Phase 4 — Draft (write)

Apply the style rules below. Start each section with the BLUF answer in the
first 40-60 words. Use HTML tables for comparisons, definition lists for specs.
Lead with concrete examples.

*Exit criteria:* Every section from the outline has content.

## Phase 5 — Verify (correctness)

Re-read against the repo. Re-check any critical external claims. Run the code
examples if possible.

*Exit criteria:* Every code example runs as documented; every external claim
still matches the cited source.

## Core principles

1. **BLUF** — Bottom Line Up Front. Lead each section with the direct answer.
2. **Progressive disclosure** — summary first, depth below. Readers (and LLMs)
   extract the gist immediately.
3. **Scannability** — headings, bullets, tables. Every paragraph earns its place.
4. **Evidence-aware** — cite sources for versions, APIs, install commands.
5. **Concrete over abstract** — examples before explanations.

## Standard documentation structure

When creating a new file or README:

1. **Title + 1-2 sentence summary** — what it does and why it exists (BLUF).
2. **Quick Start / Installation** — minimum steps to get running, exact commands.
3. **Usage / Examples** — show, don't tell. Most common use case first.
4. **API / Reference** (if applicable) — parameters, options, returns. Tables
   for structured data.

## Formatting guidelines

- Sentence case headings. Do not skip levels (H1 > H2 > H3).
- Language-tagged code blocks (```typescript).
- BLOCKQUOTE for callouts (> Note, > Warning).
- HTML tables for comparisons, `<dl>` for specifications.
- Descriptive link text ("Read the setup guide"), not "Click here".

## Style rules

- Active voice ("The script generates a file").
- Direct address / imperative for instructions ("Run this command").
- Consistent terminology throughout the document.
- One core idea per paragraph. LLMs extract passages, not pages.

## Workflows

### Creating a documentation website

1. Recommend a framework if not specified (VitePress, Nextra, Docusaurus,
   MkDocs).
2. Establish a clear sidebar/navigation structure: Introduction/Getting Started
   → Core Concepts → Guides/Tutorials → API Reference.
3. Write content with each page focused on a single topic.

### Reviewing existing documentation

1. Check for outdated information; web-search claims that depend on versions,
   APIs, or third-party behavior.
2. Improve formatting for scannability.
3. Simplify complex sentences.
4. Ensure code examples are correct and well-formatted (match the repo or
   cited docs).
