#!/usr/bin/env node
/**
 * Generate root CLAUDE.md and AGENTS.md from the source-of-truth rules/*.mdc.
 *
 * Shares render logic with the consumer installer (`bin/lib/render.mjs`).
 * Invoked by sync.ps1 / sync.sh — edit rules/, not this output.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules } from "../bin/lib/catalog.mjs";
import { renderRepoStandingDocs } from "../bin/lib/render.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const rules = loadRules();
const always = rules.filter((r) => r.always);
const scoped = rules.filter((r) => !r.always);

writeFileSync(join(ROOT, "CLAUDE.md"), renderRepoStandingDocs(rules, "Claude Code"));
writeFileSync(
  join(ROOT, "AGENTS.md"),
  renderRepoStandingDocs(rules, "OpenCode, Codex, Cursor, and GitHub Copilot"),
);

console.log(
  `Generated CLAUDE.md + AGENTS.md from ${rules.length} rules ` +
    `(${always.length} always-on, ${scoped.length} conditional).`,
);
