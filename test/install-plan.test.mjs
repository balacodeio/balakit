// Integration tests for InstallPlan reconcile, safe remove, argv, capability matrix.

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
import { spawnSync } from "node:child_process";
import {
  buildInstallPlan,
  parseArgv,
  installTeamRules,
  partitionRules,
  recordInstall,
  readManifest,
  projectManifestPath,
  migrateManifest,
  MANIFEST_SCHEMA,
  detectAgents,
  DEFAULT_AGENT_IDS,
  getCapability,
  BEGIN,
  MENTAL_MOVED,
} from "../bin/cli.mjs";
import { loadRules } from "../bin/lib/catalog.mjs";
import { hasManagedBlock } from "../bin/lib/render.mjs";

let cwd;
let home;
let prevCwd;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "balakit-plan-"));
  home = mkdtempSync(join(tmpdir(), "balakit-plan-home-"));
  prevCwd = process.cwd();
  process.chdir(cwd);
  process.env.GIT_CONFIG_GLOBAL = join(home, ".gitconfig");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
  delete process.env.XDG_CONFIG_HOME;
  spawnSync("git", ["init"], { cwd, encoding: "utf8" });
});

afterEach(() => {
  process.chdir(prevCwd);
  rmSync(cwd, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

const sampleAlways = {
  name: "base",
  always: true,
  globs: "",
  description: "meta",
  body: "# Base\n\nDo the right thing.",
  raw: "---\nalwaysApply: true\n---\n# Base\n\nDo the right thing.\n",
};

const sampleScoped = {
  name: "seo-ai-search",
  always: false,
  globs: "**/*.{astro,ts}",
  description: "SEO",
  body: "# SEO\n\nShip meta tags.",
  raw: "---\nglobs: \"**/*.{astro,ts}\"\nalwaysApply: false\n---\n# SEO\n\nShip meta tags.\n",
};

const sampleTesting = {
  name: "testing",
  always: true,
  globs: "",
  description: "tests",
  body: "# Testing\n\nWrite real tests.",
  raw: "---\nalwaysApply: true\n---\n# Testing\n\nWrite real tests.\n",
};

test("buildInstallPlan reconciles add with existing manifest (no AGENTS shrink)", () => {
  installTeamRules([sampleAlways, sampleTesting], { cwd });
  recordInstall("project", { rules: ["base", "testing"] }, { cwd });

  const plan = buildInstallPlan({
    ruleNames: ["seo-ai-search"],
    skillNames: [],
    allRules: [sampleAlways, sampleTesting, sampleScoped],
    agents: ["cursor"],
    reconcile: true,
    cwd,
  });

  assert.ok(plan.team.some((r) => r.name === "base"));
  assert.ok(plan.team.some((r) => r.name === "testing"));
  assert.ok(plan.team.some((r) => r.name === "seo-ai-search"));

  installTeamRules(plan.team, { cwd });
  const body = readFileSync(join(cwd, "AGENTS.md"), "utf8");
  assert.match(body, /Do the right thing/);
  assert.match(body, /Write real tests/);
  assert.match(body, /Ship meta tags/);
});

test("migrateManifest renames legacy global rule to base", () => {
  const m = migrateManifest({
    schema: 2,
    rules: ["global", "testing", "global"],
    skills: [],
  });
  assert.deepEqual(m.rules, ["base", "testing"]);
});

test("parseArgv rejects leftover Mental flags with moved message", () => {
  assert.throws(() => parseArgv(["init", "--personal"]), /Mental has moved/);
  assert.throws(() => parseArgv(["add", "mental"]), /Mental has moved/);
  assert.throws(() => parseArgv(["doctor"]), /Mental has moved/);
  assert.throws(() => parseArgv(["init", "--mental-tooling", "user"]), /Mental has moved/);
});

test("parseArgv still parses add of remaining rules", () => {
  const a = parseArgv(["add", "base", "testing", "-y"]);
  assert.equal(a.command, "add");
  assert.deepEqual(a.names, ["base", "testing"]);
  assert.equal(a.yes, true);
});

test("detectAgents falls back to default trio", () => {
  const empty = mkdtempSync(join(tmpdir(), "balakit-empty-"));
  const emptyHome = mkdtempSync(join(tmpdir(), "balakit-empty-home-"));
  try {
    const found = detectAgents(empty, emptyHome);
    assert.deepEqual(found, DEFAULT_AGENT_IDS);
  } finally {
    rmSync(empty, { recursive: true, force: true });
    rmSync(emptyHome, { recursive: true, force: true });
  }
});

test("capability records separate rules confidence from skillsShId", () => {
  const cursor = getCapability("cursor");
  assert.equal(cursor.rulesConfidence, "verified");
  assert.equal(cursor.skillsShId, "cursor");
  const aider = getCapability("aider");
  assert.equal(aider.skillsShId, null);
  assert.equal(aider.agentSkills, "unsupported");
});

test("partitionRules treats every current rule as team (no personal kit)", () => {
  const { personal, team } = partitionRules([sampleAlways, sampleScoped]);
  assert.equal(personal.length, 0);
  assert.equal(team.length, 2);
});

test("safe remove refuses wipe when manifest empty but block live", async () => {
  installTeamRules([sampleAlways], { cwd });
  assert.ok(hasManagedBlock(join(cwd, "AGENTS.md")));
  const { cmdRemove } = await import("../bin/commands/remove.mjs");
  const code = await cmdRemove({ names: ["base"], yes: true, dryRun: false });
  assert.equal(code, 1);
  assert.ok(hasManagedBlock(join(cwd, "AGENTS.md")), "block preserved");
  assert.ok(readFileSync(join(cwd, "AGENTS.md"), "utf8").includes(BEGIN));
});

test("manifest round-trip without Mental policy machinery", () => {
  recordInstall(
    "project",
    {
      rules: ["base"],
      skills: ["dissect"],
      agents: ["cursor"],
      surfaces: ["AGENTS.md"],
    },
    { cwd, home },
  );
  const m = readManifest(projectManifestPath(cwd));
  assert.equal(m.schema, MANIFEST_SCHEMA);
  assert.deepEqual(m.rules, ["base"]);
  assert.deepEqual(m.skills, ["dissect"]);
  assert.equal(m.mentalTooling, null);
  assert.equal(m.mentalDataPolicy, null);
});

test("loadRules no longer includes mental", () => {
  const rules = loadRules();
  assert.ok(rules.some((r) => r.name === "base"));
  assert.ok(!rules.some((r) => r.name === "mental"));
  assert.ok(projectManifestPath(cwd).includes(".balakit"));
});

test("MENTAL_MOVED is exported for leftover CLI surfaces", () => {
  assert.match(MENTAL_MOVED, /github\.com\/.*\/mental/);
});
