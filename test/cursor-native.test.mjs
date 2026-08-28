// Cursor skill links and user-local plugin copies.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  lstatSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  linkCursorProjectSkills,
  unlinkCursorProjectSkills,
  copyCursorLocalPlugins,
  listCursorLocalPlugins,
} from "../bin/lib/cursor-native.mjs";

let cwd;
let home;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "balakit-cursor-"));
  home = mkdtempSync(join(tmpdir(), "balakit-cursor-home-"));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

test("linkCursorProjectSkills symlinks .cursor/skills to .agents/skills", () => {
  const skillDir = join(cwd, ".agents", "skills", "dissect");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), "# dissect\n");
  const { written } = linkCursorProjectSkills(["dissect"], { cwd });
  const link = join(cwd, ".cursor", "skills", "dissect");
  assert.ok(written.some((w) => w.includes("dissect")));
  assert.ok(existsSync(link));
  assert.equal(lstatSync(link).isSymbolicLink() || existsSync(join(link, "SKILL.md")), true);
  const removed = unlinkCursorProjectSkills(["dissect"], { cwd });
  assert.ok(removed.length);
  assert.equal(existsSync(link), false);
});

test("linkCursorProjectSkills skips missing skill trees", () => {
  const { notes } = linkCursorProjectSkills(["nope"], { cwd });
  assert.ok(notes.some((n) => /not present/.test(n)));
  assert.equal(existsSync(join(cwd, ".cursor", "skills", "nope")), false);
});

test("copyCursorLocalPlugins copies plugin trees into a fake home", () => {
  const srcRoot = join(cwd, "plugins");
  mkdirSync(join(srcRoot, "balakit-demo", "skills"), { recursive: true });
  writeFileSync(join(srcRoot, "balakit-demo", "plugin.json"), "{}\n");
  const { written } = copyCursorLocalPlugins({ home, srcRoot });
  assert.ok(written.length);
  const names = listCursorLocalPlugins(home);
  assert.deepEqual(names, ["balakit-demo"]);
  assert.ok(existsSync(join(home, ".cursor", "plugins", "local", "balakit-demo", "plugin.json")));
});
