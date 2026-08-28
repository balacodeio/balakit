#!/usr/bin/env node
/**
 * Fail if plugin / marketplace versions drift from package.json.
 * Optionally rebuild plugins and fail if git is dirty afterward.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { buildPlugins } from "./build-plugins.mjs";
import { PLUGINS } from "./plugins-catalog.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

/**
 * Collect every generated plugin/marketplace version string.
 * @param {string} root
 * @returns {{ path: string, version: string }[]}
 */
export function collectPluginVersions(root = ROOT) {
  const found = [];
  const push = (rel, version) => {
    if (typeof version === "string") found.push({ path: rel, version });
  };

  const cursorMarket = join(root, ".cursor-plugin", "marketplace.json");
  if (existsSync(cursorMarket)) {
    const m = readJson(cursorMarket);
    push(".cursor-plugin/marketplace.json#metadata", m.metadata?.version);
    for (const p of m.plugins ?? []) {
      push(`.cursor-plugin/marketplace.json#${p.name}`, p.version);
    }
  }

  for (const extra of [
    ".claude-plugin/marketplace.json",
    ".agents/plugins/marketplace.json",
  ]) {
    const file = join(root, extra);
    if (!existsSync(file)) continue;
    const m = readJson(file);
    push(`${extra}#metadata`, m.metadata?.version);
    for (const p of m.plugins ?? []) {
      push(`${extra}#${p.name}`, p.version);
    }
  }

  const pluginsDir = join(root, "plugins");
  if (existsSync(pluginsDir)) {
    for (const name of readdirSync(pluginsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)) {
      const candidates = [
        "plugin.json",
        ".cursor-plugin/plugin.json",
        ".codex-plugin/plugin.json",
        ".claude-plugin/plugin.json",
      ];
      for (const rel of candidates) {
        const file = join(pluginsDir, name, rel);
        if (!existsSync(file)) continue;
        push(`plugins/${name}/${rel}`, readJson(file).version);
      }
    }
  }

  return found;
}

/**
 * @returns {{ ok: boolean, expected: string, mismatches: { path: string, version: string }[] }}
 */
export function checkLockstep(root = ROOT) {
  const expected = readJson(join(root, "package.json")).version;
  const found = collectPluginVersions(root);
  const mismatches = found.filter((f) => f.version !== expected);
  return { ok: mismatches.length === 0 && found.length > 0, expected, found, mismatches };
}

function gitDirty(root) {
  const r = spawnSync("git", ["status", "--porcelain", "--", "plugins", ".cursor-plugin", ".claude-plugin", ".agents/plugins"], {
    cwd: root,
    encoding: "utf8",
  });
  return (r.stdout || "").trim();
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const rebuild = process.argv.includes("--rebuild");
  const git = process.argv.includes("--git");
  if (rebuild) buildPlugins();
  const result = checkLockstep(ROOT);
  if (!result.found.length) {
    console.error("No plugin versions found. Run node scripts/build-plugins.mjs first.");
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`Lockstep failed: expected ${result.expected}`);
    for (const m of result.mismatches) {
      console.error(`  ${m.path} = ${m.version}`);
    }
    process.exit(1);
  }
  if (git) {
    const dirty = gitDirty(ROOT);
    if (dirty) {
      console.error("Generated plugin files drifted from git after rebuild:\n" + dirty);
      process.exit(1);
    }
  }
  console.log(`Lockstep OK: ${result.found.length} manifests at ${result.expected} (catalog ${PLUGINS.length} plugins).`);
}
