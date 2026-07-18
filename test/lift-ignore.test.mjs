// Explicit lift of .mental/ ignore lines (tracked mode) — never silent.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  ensureMentalExcluded,
  removeMentalIgnoreLine,
  locateMentalIgnoreSources,
  liftMentalIgnores,
  applyDataPolicy,
} from "../bin/cli.mjs";
import { MENTAL_IGNORE_COMMENT, MENTAL_IGNORE_LINE } from "../bin/lib/mental-exclude.mjs";
import { parseArgv } from "../bin/lib/args.mjs";

let home;
let cwd;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "balakit-lift-home-"));
  cwd = mkdtempSync(join(tmpdir(), "balakit-lift-cwd-"));
  process.env.GIT_CONFIG_GLOBAL = join(home, ".gitconfig");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
  delete process.env.XDG_CONFIG_HOME;
  spawnSync("git", ["init"], { cwd, encoding: "utf8" });
});

test("removeMentalIgnoreLine strips line + balakit comment", () => {
  const file = join(home, "excludes");
  writeFileSync(
    file,
    `node_modules/\n${MENTAL_IGNORE_COMMENT}\n${MENTAL_IGNORE_LINE}\n*.log\n`,
  );
  const r = removeMentalIgnoreLine(file);
  assert.equal(r.removed, true);
  const body = readFileSync(file, "utf8");
  assert.ok(!body.split(/\r?\n/).some((l) => l.trim() === MENTAL_IGNORE_LINE));
  assert.ok(!body.includes(MENTAL_IGNORE_COMMENT));
  assert.match(body, /node_modules\//);
  assert.match(body, /\*\.log/);
});

test("locateMentalIgnoreSources finds global exclude after ensure", () => {
  ensureMentalExcluded({ home });
  const { liveIgnored, sources } = locateMentalIgnoreSources({ cwd, home });
  assert.equal(liveIgnored, true);
  assert.ok(sources.some((s) => s.kind === "global-exclude"));
});

test("tracked applyDataPolicy reports sources and never strips them", () => {
  ensureMentalExcluded({ home });
  const before = readFileSync(
    locateMentalIgnoreSources({ cwd, home }).sources.find((s) => s.kind === "global-exclude")
      .file,
    "utf8",
  );
  const r = applyDataPolicy("tracked", { cwd, home });
  assert.equal(r.ok, true);
  assert.equal(r.ignored, true);
  assert.match(r.note, /doctor --lift-ignore/);
  const after = readFileSync(
    locateMentalIgnoreSources({ cwd, home }).sources.find((s) => s.kind === "global-exclude")
      .file,
    "utf8",
  );
  assert.equal(after, before, "tracked apply must not mutate excludes");
});

test("liftMentalIgnores removes discovered lines", () => {
  ensureMentalExcluded({ home });
  const gi = join(cwd, ".gitignore");
  writeFileSync(gi, `${MENTAL_IGNORE_COMMENT}\n${MENTAL_IGNORE_LINE}\n`);
  const r = liftMentalIgnores({ cwd, home });
  assert.ok(r.lifted.length >= 1);
  const located = locateMentalIgnoreSources({ cwd, home });
  assert.equal(located.sources.length, 0);
  assert.equal(located.liveIgnored, false);
  if (existsSync(gi)) {
    assert.doesNotMatch(readFileSync(gi, "utf8"), /^\.mental\/$/m);
  }
});

test("parseArgv rejects --lift-ignore with -y", () => {
  assert.throws(
    () => parseArgv(["doctor", "--lift-ignore", "-y"]),
    /cannot be combined with -y/,
  );
});

test("parseArgv accepts doctor --lift-ignore", () => {
  const args = parseArgv(["doctor", "--lift-ignore"]);
  assert.equal(args.command, "doctor");
  assert.equal(args.liftIgnore, true);
});
