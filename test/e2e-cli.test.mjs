// End-to-end: spawn the real CLI against an isolated cwd + HOME.
// Catches the consumer bugs: no always-on .mdc, no user-home writes,
// skills.sh never got -g, plugins never copied to ~/.cursor/plugins/local,
// and .cursor/skills never linked after a project skill install.
//
// Real skills.sh is not invoked. A stub `npx` on PATH pretends it succeeded
// and writes the directories skills.sh would (network-free).

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

const NPX_STUB = `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const skills = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "-s") skills.push(args[++i]);
}
const global = args.includes("-g");
const isSkills = args.includes("skills");
const isAdd = args.includes("add");
const isRemove = args.includes("remove");
const isUpdate = args.includes("update");

if (isSkills && isAdd) {
  const home = process.env.HOME;
  const cwd = process.cwd();
  for (const name of skills) {
    const dest = global
      ? join(home, ".cursor", "skills", name)
      : join(cwd, ".agents", "skills", name);
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "SKILL.md"), "# " + name + "\\n");
  }
  process.exit(0);
}
if (isSkills && (isRemove || isUpdate)) process.exit(0);
process.stderr.write("stub npx: unexpected " + args.join(" ") + "\\n");
process.exit(1);
`;

let cwd;
let home;
let stubDir;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "balakit-e2e-proj-"));
  home = mkdtempSync(join(tmpdir(), "balakit-e2e-home-"));
  stubDir = mkdtempSync(join(tmpdir(), "balakit-e2e-stub-"));
  const npx = join(stubDir, "npx");
  writeFileSync(npx, NPX_STUB);
  chmodSync(npx, 0o755);
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
  rmSync(stubDir, { recursive: true, force: true });
});

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      CI: "1",
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      PATH: `${stubDir}${delimiter}${process.env.PATH}`,
    },
  });
}

function out(r) {
  return `${r.stdout || ""}\n${r.stderr || ""}`;
}

test("e2e: project init writes AGENTS.md, always-on .mdc, and project manifest — not home plugins", () => {
  const r = run(["init", "-y", "--scope", "project", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));

  assert.ok(existsSync(join(cwd, "AGENTS.md")));
  assert.ok(existsSync(join(cwd, "CLAUDE.md")));
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Meta-Principle/);
  for (const name of ["base", "testing", "comments", "changelog", "release"]) {
    assert.ok(existsSync(join(cwd, ".cursor", "rules", `${name}.mdc`)), name);
  }

  const manifest = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.ok(manifest.rules.includes("base"));
  assert.ok(manifest.rules.includes("testing"));

  assert.equal(existsSync(join(home, ".cursor", "plugins", "local")), false);
  assert.equal(existsSync(join(home, ".cursor", "rules", "base.mdc")), false);
  assert.equal(existsSync(join(cwd, ".github", "instructions")), false);
});

test("e2e: user init writes home rules, OpenCode AGENTS.md, and copies plugins/local", () => {
  const r = run(["init", "-y", "--scope", "user", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));

  assert.ok(existsSync(join(home, ".cursor", "rules", "base.mdc")));
  assert.ok(existsSync(join(home, ".claude", "CLAUDE.md")));
  assert.ok(existsSync(join(home, ".codex", "AGENTS.md")));
  assert.ok(existsSync(join(home, ".config", "opencode", "AGENTS.md")));
  assert.ok(existsSync(join(home, ".balakit", "installed.json")));
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-core")));
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-seo-skills")));

  assert.equal(existsSync(join(cwd, "AGENTS.md")), false);
  assert.equal(existsSync(join(cwd, ".balakit", "installed.json")), false);
});

test("e2e: add seo-ai-search writes Claude and Copilot twins without shrinking always-on rules", () => {
  assert.equal(run(["init", "-y", "--scope", "project", "--agents", "cursor"]).status, 0);
  const r = run([
    "add",
    "seo-ai-search",
    "-y",
    "--agents",
    "cursor,claude-code,copilot",
  ]);
  assert.equal(r.status, 0, out(r));

  assert.ok(existsSync(join(cwd, ".cursor", "rules", "base.mdc")));
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "seo-ai-search.mdc")));
  const claude = join(cwd, ".claude", "rules", "seo-ai-search.md");
  const copilot = join(cwd, ".github", "instructions", "seo-ai-search.instructions.md");
  assert.ok(existsSync(claude));
  assert.ok(existsSync(copilot));
  assert.match(readFileSync(claude, "utf8"), /^paths:/m);
  assert.match(readFileSync(copilot, "utf8"), /applyTo:/);
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Universal SEO|AI Search/);
});

test("e2e: project skill add uses stub skills.sh then links .cursor/skills", () => {
  const r = run(["add", "dissect", "-y", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));

  const agentsSkill = join(cwd, ".agents", "skills", "dissect", "SKILL.md");
  const cursorSkill = join(cwd, ".cursor", "skills", "dissect");
  assert.ok(existsSync(agentsSkill), "stub should land in .agents/skills");
  assert.ok(existsSync(join(cursorSkill, "SKILL.md")), "CLI should link or copy .cursor/skills/dissect");
  const manifest = JSON.parse(readFileSync(join(cwd, ".balakit", "installed.json"), "utf8"));
  assert.ok(manifest.skills.includes("dissect"));
  assert.equal(existsSync(join(home, ".cursor", "plugins", "local")), false);
});

test("e2e: user skill add passes -g (dry-run) and copies plugins on apply", () => {
  const preview = run(["add", "dissect", "--dry-run", "--scope", "user", "--agents", "cursor"]);
  assert.equal(preview.status, 0, out(preview));
  assert.match(out(preview), /(^|\s)-g(\s|$)/);
  const projectPreview = run(["add", "dissect", "--dry-run", "--agents", "cursor"]);
  assert.equal(projectPreview.status, 0, out(projectPreview));
  assert.doesNotMatch(out(projectPreview), /(^|\s)-g(\s|$)/);

  const r = run(["add", "dissect", "-y", "--scope", "user", "--agents", "cursor"]);
  assert.equal(r.status, 0, out(r));
  assert.ok(existsSync(join(home, ".cursor", "skills", "dissect", "SKILL.md")));
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-core")));
  const glob = JSON.parse(readFileSync(join(home, ".balakit", "installed.json"), "utf8"));
  assert.ok(glob.skills.includes("dissect"));
});

test("e2e: status shows project and home surfaces; remove one rule keeps the rest", () => {
  assert.equal(run(["init", "-y", "--scope", "project", "--agents", "cursor"]).status, 0);
  const status = run(["status"]);
  assert.equal(status.status, 0, out(status));
  assert.match(out(status), /\.cursor\/rules/);
  assert.match(out(status), /base/);

  const rm = run(["remove", "testing", "-y", "--scope", "project"]);
  assert.equal(rm.status, 0, out(rm));
  assert.equal(existsSync(join(cwd, ".cursor", "rules", "testing.mdc")), false);
  assert.ok(existsSync(join(cwd, ".cursor", "rules", "base.mdc")));
  assert.match(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Meta-Principle/);
  assert.doesNotMatch(readFileSync(join(cwd, "AGENTS.md"), "utf8"), /Every test must earn its place/);
});

test("e2e: --personal still exits as Mental-moved", () => {
  const r = run(["init", "--personal"]);
  assert.notEqual(r.status, 0);
  assert.match(out(r), /Mental has moved/);
});
