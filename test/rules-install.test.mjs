// Tests for AGENTS.md-first rule install / remove and skills command builder.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installTeamRules,
  installPersonalRules,
  removeTeamRules,
  removePersonalRules,
  partitionRules,
} from "../bin/lib/rules-install.mjs";
import { mergeManaged, removeManaged, hasManagedBlock, renderRulesBlock } from "../bin/lib/render.mjs";
import { skillsAddCommand, skillsRemoveCommand } from "../bin/lib/skills-bridge.mjs";
import { BEGIN, END, PERSONAL_RULES } from "../bin/lib/pkg.mjs";
import { loadRules } from "../bin/lib/catalog.mjs";
import {
  recordInstall,
  readManifest,
  projectManifestPath,
  recordRemove,
} from "../bin/lib/manifest.mjs";

let cwd;
let home;
let prevCwd;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "balakit-rules-"));
  home = mkdtempSync(join(tmpdir(), "balakit-home-"));
  prevCwd = process.cwd();
  process.chdir(cwd);
});

afterEach(() => {
  process.chdir(prevCwd);
  rmSync(cwd, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

const sampleAlways = {
  name: "global",
  always: true,
  globs: "",
  description: "meta",
  body: "# Global\n\nDo the right thing.",
  raw: "---\nalwaysApply: true\n---\n# Global\n\nDo the right thing.\n",
};

const sampleScoped = {
  name: "seo-ai-search",
  always: false,
  globs: "**/*.{astro,ts}",
  description: "SEO",
  body: "# SEO\n\nShip meta tags.",
  raw: "---\nglobs: \"**/*.{astro,ts}\"\nalwaysApply: false\n---\n# SEO\n\nShip meta tags.\n",
};

const sampleMental = {
  name: "mental",
  always: true,
  globs: "",
  description: "second brain",
  body: "# Mental\n\nUse the mental skill.",
  raw: "---\nalwaysApply: true\n---\n# Mental\n\nUse the mental skill.\n",
};

test("partitionRules splits personal from team", () => {
  const { personal, team } = partitionRules([sampleAlways, sampleMental, sampleScoped]);
  assert.deepEqual(
    personal.map((r) => r.name),
    ["mental"],
  );
  assert.deepEqual(
    team.map((r) => r.name),
    ["global", "seo-ai-search"],
  );
  assert.ok(PERSONAL_RULES.includes("mental"));
});

test("installTeamRules writes AGENTS.md + CLAUDE.md managed blocks", () => {
  const { written } = installTeamRules([sampleAlways], { cwd });
  assert.ok(written.some((w) => w.includes("AGENTS.md") || w === "AGENTS.md"));
  assert.ok(hasManagedBlock(join(cwd, "AGENTS.md")));
  assert.ok(hasManagedBlock(join(cwd, "CLAUDE.md")));
  const body = readFileSync(join(cwd, "AGENTS.md"), "utf8");
  assert.match(body, /Do the right thing/);
  assert.ok(body.includes(BEGIN));
  assert.ok(body.includes(END));
});

test("installTeamRules writes scoped rules to .cursor/rules/*.mdc", () => {
  installTeamRules([sampleAlways, sampleScoped], { cwd });
  const mdc = join(cwd, ".cursor", "rules", "seo-ai-search.mdc");
  assert.ok(existsSync(mdc));
  assert.match(readFileSync(mdc, "utf8"), /Ship meta tags/);
});

test("mergeManaged is idempotent and preserves surrounding content", () => {
  const file = join(cwd, "AGENTS.md");
  writeFileSync(file, "# Mine\n\nKeep me.\n");
  mergeManaged(file, "first");
  mergeManaged(file, "second");
  const cur = readFileSync(file, "utf8");
  assert.match(cur, /Keep me/);
  assert.match(cur, /second/);
  assert.doesNotMatch(cur, /first/);
  const begins = cur.split(BEGIN).length - 1;
  assert.equal(begins, 1);
});

test("removeManaged strips block; delete file when empty", () => {
  const file = join(cwd, "AGENTS.md");
  mergeManaged(file, "only balakit");
  assert.equal(removeManaged(file), true);
  assert.equal(existsSync(file), false);
});

test("removeTeamRules rewrites remaining rules", () => {
  installTeamRules([sampleAlways, sampleScoped], { cwd });
  removeTeamRules([sampleScoped], [sampleAlways], { cwd });
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "seo-ai-search.mdc")), false);
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Do the right thing/);
  assert.doesNotMatch(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Ship meta tags/);
});

test("installPersonalRules writes user-level targets", () => {
  const { written } = installPersonalRules([sampleMental], { home });
  assert.ok(written.some((w) => w.includes(".claude")));
  assert.ok(existsSync(join(home, ".cursor", "rules", "mental.mdc")));
  assert.ok(hasManagedBlock(join(home, ".claude", "CLAUDE.md")));
  assert.ok(hasManagedBlock(join(home, ".codex", "AGENTS.md")));
});

test("removePersonalRules clears global mental files", () => {
  installPersonalRules([sampleMental], { home });
  removePersonalRules([sampleMental], [], { home });
  assert.equal(existsSync(join(home, ".cursor", "rules", "mental.mdc")), false);
  assert.equal(hasManagedBlock(join(home, ".claude", "CLAUDE.md")), false);
});

test("skillsAddCommand includes -g for global and skill flags", () => {
  const cmd = skillsAddCommand(["mental", "dissect"], ["cursor", "claude-code"], "global");
  assert.match(cmd, /npx -y skills add/);
  assert.match(cmd, /-s mental/);
  assert.match(cmd, /-s dissect/);
  assert.match(cmd, /-a cursor/);
  assert.match(cmd, /-a claude-code/);
  assert.match(cmd, /-g/);
  assert.match(cmd, /-y/);
});

test("skillsRemoveCommand builds remove invocation", () => {
  const cmd = skillsRemoveCommand(["mental"], "global");
  assert.match(cmd, /skills remove/);
  assert.match(cmd, /mental/);
  assert.match(cmd, /-g/);
});

test("manifest recordInstall / recordRemove round-trip", () => {
  recordInstall("project", { rules: ["global"], skills: ["dissect"] }, { cwd });
  const m = readManifest(projectManifestPath(cwd));
  assert.deepEqual(m.rules, ["global"]);
  assert.deepEqual(m.skills, ["dissect"]);
  recordRemove("project", { rules: ["global"] }, { cwd });
  const m2 = readManifest(projectManifestPath(cwd));
  assert.deepEqual(m2.rules, []);
  assert.deepEqual(m2.skills, ["dissect"]);
});

test("renderRulesBlock includes always-on body", () => {
  const md = renderRulesBlock([sampleAlways], { consumer: true });
  assert.match(md, /Do the right thing/);
  assert.match(md, /Opinionated Rules/);
});

test("loadRules finds packaged rules including mental", () => {
  const rules = loadRules();
  assert.ok(rules.some((r) => r.name === "global"));
  assert.ok(rules.some((r) => r.name === "mental"));
});
