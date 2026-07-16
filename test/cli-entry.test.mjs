import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isCliEntry } from "../bin/lib/entry.mjs";

const CLI_PATH = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

test("isCliEntry matches a direct cli.mjs invoke path", () => {
  assert.equal(isCliEntry(`file://${CLI_PATH}`, CLI_PATH), true);
});

test("isCliEntry matches an npm-style .bin symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "balakit-bin-"));
  const binDir = join(root, "node_modules", ".bin");
  mkdirSync(binDir, { recursive: true });
  const shim = join(binDir, "balakit");
  symlinkSync(CLI_PATH, shim);

  assert.equal(isCliEntry(`file://${CLI_PATH}`, shim), true);
});

test("isCliEntry rejects unrelated entry paths", () => {
  assert.equal(isCliEntry(`file://${CLI_PATH}`, fileURLToPath(import.meta.url)), false);
});

test("npm-style bin symlink runs list output", () => {
  const root = mkdtempSync(join(tmpdir(), "balakit-run-"));
  const binDir = join(root, "node_modules", ".bin");
  mkdirSync(binDir, { recursive: true });
  const shim = join(binDir, "balakit");
  symlinkSync(CLI_PATH, shim);

  const result = spawnSync(process.execPath, [shim, "list"], {
    encoding: "utf8",
    cwd: root,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^Rules:/m);
});
