// Tests for the .mental/ global git-excludes guarantee (data-leak guard).
//
// Each test runs git in a sandbox: GIT_CONFIG_GLOBAL points at a throwaway
// config and GIT_CONFIG_NOSYSTEM=1 disables system config, so the real machine
// config is never read or written. `home` is injected into the functions, and
// XDG_CONFIG_HOME is cleared so the XDG default resolves under the temp home.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  ensureMentalExcluded,
  checkMentalExcluded,
  defaultExcludesFile,
} from "../bin/cli.mjs";

let home;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "balakit-mental-"));
  process.env.GIT_CONFIG_GLOBAL = join(home, ".gitconfig");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
  delete process.env.XDG_CONFIG_HOME;
});

const getExcludesConfig = () =>
  spawnSync("git", ["config", "--global", "--get", "core.excludesfile"], { encoding: "utf8" })
    .stdout.trim();

test("unset core.excludesfile → wires XDG default and adds .mental/", () => {
  assert.equal(getExcludesConfig(), "", "precondition: config is unset");

  const r = ensureMentalExcluded({ home });

  assert.equal(r.ok, true);
  assert.equal(r.created, true);
  assert.equal(r.appended, true);
  assert.equal(r.file, defaultExcludesFile(home));
  assert.notEqual(getExcludesConfig(), "", "core.excludesfile is now set");
  assert.match(readFileSync(r.file, "utf8"), /^\.mental\/$/m);
});

test("idempotent: a second run changes nothing", () => {
  const first = ensureMentalExcluded({ home });
  const before = readFileSync(first.file, "utf8");

  const second = ensureMentalExcluded({ home });

  assert.equal(second.appended, false, "does not append again");
  assert.equal(readFileSync(second.file, "utf8"), before, "file byte-identical");
  const occurrences = before.split(/\r?\n/).filter((l) => l.trim() === ".mental/").length;
  assert.equal(occurrences, 1, "exactly one .mental/ line");
});

test("existing core.excludesfile is respected, never overwritten", () => {
  const custom = join(home, "my-existing-ignore");
  writeFileSync(custom, "node_modules/\n*.log\n");
  spawnSync("git", ["config", "--global", "core.excludesfile", custom.split("\\").join("/")], {
    encoding: "utf8",
  });

  const r = ensureMentalExcluded({ home });

  const norm = (p) => p.split("\\").join("/");
  assert.equal(r.created, false, "did not re-wire the config");
  assert.equal(norm(r.file), norm(custom), "used the user's existing file");
  assert.equal(existsSync(defaultExcludesFile(home)), false, "did not touch the XDG default");
  const content = readFileSync(custom, "utf8");
  assert.match(content, /node_modules\//, "kept the user's existing lines");
  assert.match(content, /^\.mental\/$/m, "appended .mental/");
});

test("appends to an existing file that lacks a trailing newline", () => {
  const custom = join(home, "no-newline-ignore");
  writeFileSync(custom, "dist/"); // no trailing \n
  spawnSync("git", ["config", "--global", "core.excludesfile", custom.split("\\").join("/")], {
    encoding: "utf8",
  });

  ensureMentalExcluded({ home });

  const lines = readFileSync(custom, "utf8").split(/\r?\n/);
  assert.ok(lines.includes("dist/"), "original line intact on its own line");
  assert.ok(lines.includes(".mental/"), ".mental/ on its own line");
});

test("checkMentalExcluded reports ok after ensure", () => {
  ensureMentalExcluded({ home });
  const c = checkMentalExcluded({ home });
  assert.equal(c.hasLine, true);
  assert.equal(c.configured, true);
});

test("checkMentalExcluded reports missing when nothing is set up", () => {
  const c = checkMentalExcluded({ home });
  assert.equal(c.hasLine, false);
});
