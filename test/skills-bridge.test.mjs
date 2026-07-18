// Verified skills.sh allowlist + target resolution.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENTS } from "../bin/lib/agents.mjs";
import {
  SKILLS_SH_VERIFIED_IDS,
  resolveSkillsShTargets,
  skillsAddCommand,
  smokeSkillsShAgents,
} from "../bin/lib/skills-bridge.mjs";

test("every registry skillsShId is on the verified allowlist", () => {
  const missing = [];
  for (const a of AGENTS) {
    if (!a.skillsShId) continue;
    if (!SKILLS_SH_VERIFIED_IDS.includes(a.skillsShId)) {
      missing.push(`${a.id}→${a.skillsShId}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Add new skills.sh ids to SKILLS_SH_VERIFIED_IDS after live smoke: ${missing.join(", ")}`,
  );
});

test("amazon-q maps to verified kiro-cli", () => {
  const { skillsShIds, skippedUnverified } = resolveSkillsShTargets(["amazon-q"]);
  assert.deepEqual(skillsShIds, ["kiro-cli"]);
  assert.deepEqual(skippedUnverified, []);
});

test("resolveSkillsShTargets skips agents with no skillsShId", () => {
  const { skillsShIds, skippedUnsupported } = resolveSkillsShTargets(["aider", "cursor"]);
  assert.deepEqual(skillsShIds, ["cursor"]);
  assert.ok(skippedUnsupported.includes("aider"));
});

test("skillsAddCommand only emits verified -a ids", () => {
  const cmd = skillsAddCommand(["mental"], ["cursor", "amazon-q", "aider"], "project");
  assert.match(cmd, /-a cursor/);
  assert.match(cmd, /-a kiro-cli/);
  assert.doesNotMatch(cmd, /-a aider/);
  assert.doesNotMatch(cmd, /-a amazon-q/);
});

test(
  "live smoke: verified skills.sh agent ids accepted by npx skills",
  { skip: process.env.BALAKIT_LIVE_SKILLS !== "1" },
  () => {
    const r = smokeSkillsShAgents(SKILLS_SH_VERIFIED_IDS);
    assert.equal(
      r.ok,
      true,
      `skills.sh rejected agent id(s).\nstatus=${r.status}\n${r.stderr}`,
    );
  },
);
