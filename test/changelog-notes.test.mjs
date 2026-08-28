// Changelog section extractor used by the tag-triggered release workflow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("changelog-notes extracts the matching version section", () => {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", "changelog-notes.mjs"), "v1.13.0"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /dissect/);
  assert.doesNotMatch(r.stdout, /## \[v1\.13\.0\]/);
});

test("changelog-notes fails for a missing version", () => {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", "changelog-notes.mjs"), "v0.0.0-missing"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  assert.notEqual(r.status, 0);
});
