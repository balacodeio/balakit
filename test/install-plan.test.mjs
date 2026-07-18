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
  applyDataPolicy,
  checkDataPolicy,
  BEGIN,
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
  recordInstall("project", { rules: ["global", "testing"] }, { cwd });

  const plan = buildInstallPlan({
    ruleNames: ["seo-ai-search"],
    skillNames: [],
    allRules: [sampleAlways, sampleTesting, sampleScoped],
    agents: ["cursor"],
    reconcile: true,
    cwd,
    home,
  });

  assert.ok(plan.team.some((r) => r.name === "global"));
  assert.ok(plan.team.some((r) => r.name === "testing"));
  assert.ok(plan.team.some((r) => r.name === "seo-ai-search"));

  installTeamRules(plan.team, { cwd });
  const body = readFileSync(join(cwd, "AGENTS.md"), "utf8");
  assert.match(body, /Do the right thing/);
  assert.match(body, /Write real tests/);
  assert.match(body, /Ship meta tags/);
});

test("migrateManifest v1 mental → user + global-exclude", () => {
  const m = migrateManifest({
    rules: ["mental"],
    skills: ["mental"],
    updatedAt: "2026-01-01",
    version: "1.9.1",
  });
  assert.equal(m.schema, MANIFEST_SCHEMA);
  assert.equal(m.mentalTooling, "user");
  assert.equal(m.mentalDataPolicy, "global-exclude");
});

test("parseArgv rejects --personal on add", () => {
  assert.throws(() => parseArgv(["add", "global", "--personal"]), /only apply/);
});

test("parseArgv accepts mental policy on init", () => {
  const a = parseArgv([
    "init",
    "--personal",
    "--mental-tooling",
    "project",
    "--mental-data",
    "clone-exclude",
    "-y",
  ]);
  assert.equal(a.command, "init");
  assert.equal(a.mentalTooling, "project");
  assert.equal(a.mentalDataPolicy, "clone-exclude");
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

test("partitionRules puts mental in team when tooling is project", () => {
  const mental = { name: "mental", always: true };
  const { personal, team } = partitionRules([sampleAlways, mental], {
    mentalTooling: "project",
  });
  assert.equal(personal.length, 0);
  assert.ok(team.some((r) => r.name === "mental"));
});

test("applyDataPolicy clone-exclude writes .git/info/exclude", () => {
  const r = applyDataPolicy("clone-exclude", { cwd, home });
  assert.equal(r.ok, true);
  assert.ok(existsSync(r.file));
  assert.match(readFileSync(r.file, "utf8"), /^\.mental\/$/m);
  const check = checkDataPolicy("clone-exclude", { cwd, home });
  assert.equal(check.ok, true);
});

test("applyDataPolicy repo-gitignore appends .gitignore", () => {
  writeFileSync(join(cwd, ".gitignore"), "node_modules/\n");
  const r = applyDataPolicy("repo-gitignore", { cwd, home });
  assert.equal(r.ok, true);
  const gi = readFileSync(join(cwd, ".gitignore"), "utf8");
  assert.match(gi, /node_modules/);
  assert.match(gi, /^\.mental\/$/m);
});

test("safe remove refuses wipe when manifest empty but block live", async () => {
  installTeamRules([sampleAlways], { cwd });
  assert.ok(hasManagedBlock(join(cwd, "AGENTS.md")));
  // No manifest written
  const { cmdRemove } = await import("../bin/commands/remove.mjs");
  const code = await cmdRemove({ names: ["global"], yes: true, dryRun: false });
  assert.equal(code, 1);
  assert.ok(hasManagedBlock(join(cwd, "AGENTS.md")), "block preserved");
  assert.ok(readFileSync(join(cwd, "AGENTS.md"), "utf8").includes(BEGIN));
});

test("manifest records mental policy fields", () => {
  recordInstall(
    "global",
    {
      rules: ["mental"],
      skills: ["mental"],
      mentalTooling: "user",
      mentalDataPolicy: "clone-exclude",
      agents: ["cursor"],
      surfaces: ["~/.claude/CLAUDE.md"],
    },
    { cwd, home },
  );
  const m = readManifest(join(home, ".balakit", "installed.json"));
  assert.equal(m.schema, MANIFEST_SCHEMA);
  assert.equal(m.mentalTooling, "user");
  assert.equal(m.mentalDataPolicy, "clone-exclude");
  assert.deepEqual(m.agents, ["cursor"]);
});

test("loadRules still includes packaged catalog", () => {
  const rules = loadRules();
  assert.ok(rules.some((r) => r.name === "mental"));
  assert.ok(projectManifestPath(cwd).includes(".balakit"));
});
