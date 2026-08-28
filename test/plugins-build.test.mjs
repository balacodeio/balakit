// Domain plugin catalog coverage + build materialization.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLUGINS } from "../scripts/plugins-catalog.mjs";
import { validateCatalog, buildPlugins } from "../scripts/build-plugins.mjs";
import { AGENT_PLUGIN_SCHEMA, assertAgentManifest } from "../scripts/plugin-schema.mjs";
import { checkLockstep } from "../scripts/check-lockstep.mjs";
import { loadRules, loadSkills } from "../bin/lib/catalog.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("plugin catalog covers every rule and skill exactly once", () => {
  validateCatalog();
  const rules = loadRules().map((r) => r.name).sort();
  const skills = loadSkills().map((s) => s.name).sort();
  const catalogRules = PLUGINS.flatMap((p) => p.rules).sort();
  const catalogSkills = PLUGINS.flatMap((p) => p.skills).sort();
  assert.deepEqual(catalogRules, rules);
  assert.deepEqual(catalogSkills, skills);
});

test("buildPlugins materializes manifests and components", () => {
  const { pluginCount, skillCount, ruleCount } = buildPlugins();
  assert.equal(pluginCount, PLUGINS.length);
  assert.equal(skillCount, loadSkills().length);
  assert.equal(ruleCount, loadRules().length);

  const marketplacePath = join(ROOT, ".cursor-plugin", "marketplace.json");
  assert.ok(existsSync(marketplacePath));
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  assert.equal(marketplace.name, "balakit");
  assert.equal(marketplace.metadata.pluginRoot, "plugins");
  assert.equal(marketplace.plugins.length, PLUGINS.length);

  for (const plugin of PLUGINS) {
    const root = join(ROOT, "plugins", plugin.name);
    assert.ok(existsSync(join(root, ".cursor-plugin", "plugin.json")));
    const cursorManifest = JSON.parse(
      readFileSync(join(root, ".cursor-plugin", "plugin.json"), "utf8"),
    );
    assert.equal(cursorManifest.name, plugin.name);

    if (plugin.format === "agent") {
      const agentPath = join(root, "plugin.json");
      assert.ok(existsSync(agentPath));
      const agentManifest = JSON.parse(readFileSync(agentPath, "utf8"));
      assert.equal(
        agentManifest.$schema,
        "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      );
      assert.equal(agentManifest.name, plugin.name);
      assert.equal(existsSync(join(root, "rules")), false);
      assert.ok(existsSync(join(root, ".codex-plugin", "plugin.json")));
      assert.ok(existsSync(join(root, ".claude-plugin", "plugin.json")));
    } else {
      assert.equal(existsSync(join(root, "plugin.json")), false);
      for (const rule of plugin.rules) {
        assert.ok(existsSync(join(root, "rules", `${rule}.mdc`)));
      }
    }

    for (const skill of plugin.skills) {
      assert.ok(existsSync(join(root, "skills", skill, "SKILL.md")));
    }
  }

  const builtNames = readdirSync(join(ROOT, "plugins"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  assert.deepEqual(
    builtNames,
    PLUGINS.map((p) => p.name).sort(),
  );
});

test("SEO is split into Cursor-rules plugin and AP skills plugin", () => {
  const seo = PLUGINS.find((p) => p.name === "balakit-seo");
  const skills = PLUGINS.find((p) => p.name === "balakit-seo-skills");
  assert.equal(seo.format, "cursor");
  assert.deepEqual(seo.rules, ["seo-ai-search"]);
  assert.deepEqual(seo.skills, []);
  assert.equal(skills.format, "agent");
  assert.deepEqual(skills.skills.sort(), ["everything-seo", "seo-audit"]);
});

test("Codex and Claude marketplace catalogs list agent-format plugins", () => {
  buildPlugins();
  const claude = JSON.parse(
    readFileSync(join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"),
  );
  const codex = JSON.parse(
    readFileSync(join(ROOT, ".agents", "plugins", "marketplace.json"), "utf8"),
  );
  const agentNames = PLUGINS.filter((p) => p.format === "agent").map((p) => p.name).sort();
  assert.deepEqual(claude.plugins.map((p) => p.name).sort(), agentNames);
  assert.deepEqual(codex.plugins.map((p) => p.name).sort(), agentNames);
});

test("assertAgentManifest rejects unknown fields and missing version", () => {
  assert.throws(
    () =>
      assertAgentManifest({
        $schema: AGENT_PLUGIN_SCHEMA,
        name: "demo-plugin",
        version: "1.0.0",
        mcpServers: {},
      }),
    /unknown top-level field/,
  );
  assert.throws(
    () =>
      assertAgentManifest({
        $schema: AGENT_PLUGIN_SCHEMA,
        name: "demo-plugin",
      }),
    /version is required/,
  );
});

test("plugin versions lockstep with package.json after build", () => {
  buildPlugins();
  const result = checkLockstep(ROOT);
  assert.equal(result.ok, true, result.mismatches.map((m) => `${m.path}=${m.version}`).join(", "));
  assert.ok(result.found.length > 0);
});
