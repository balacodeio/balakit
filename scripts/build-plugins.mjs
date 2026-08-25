#!/usr/bin/env node
/**
 * Materialize domain plugins under `plugins/` from `skills/` and `rules/`.
 *
 * Also writes `.cursor-plugin/marketplace.json` for Cursor multi-plugin repos.
 * Invoked by sync.sh / sync.ps1 — edit the catalog and sources, not the output.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  PLUGINS,
  MARKETPLACE_NAME,
  MARKETPLACE_OWNER,
} from "./plugins-catalog.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PLUGINS_DIR = join(ROOT, "plugins");
const RULES_DIR = join(ROOT, "rules");
const SKILLS_DIR = join(ROOT, "skills");
const MARKETPLACE_DIR = join(ROOT, ".cursor-plugin");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const VERSION = pkg.version;
const HOMEPAGE = pkg.homepage ?? "https://github.com/balacodeio/balakit#readme";
const REPOSITORY =
  (pkg.repository?.url ?? "")
    .replace(/^git\+/, "")
    .replace(/\.git$/, "") || "https://github.com/balacodeio/balakit";
const LICENSE = pkg.license ?? "MIT";

const AUTHOR = {
  name: MARKETPLACE_OWNER.name,
  email: MARKETPLACE_OWNER.email,
  url: "https://balacode.io",
};

/**
 * Validate the catalog against on-disk skills and rules.
 * @throws {Error} when a referenced path is missing or coverage is incomplete.
 */
export function validateCatalog() {
  const ruleFiles = new Set(
    readdirSync(RULES_DIR)
      .filter((f) => f.endsWith(".mdc"))
      .map((f) => f.replace(/\.mdc$/, "")),
  );
  const skillDirs = new Set(
    readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
      .map((d) => d.name),
  );

  const seenRules = new Set();
  const seenSkills = new Set();
  const names = new Set();

  for (const plugin of PLUGINS) {
    if (names.has(plugin.name)) {
      throw new Error(`Duplicate plugin name: ${plugin.name}`);
    }
    names.add(plugin.name);

    if (
      !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(plugin.name) ||
      plugin.name.includes("--") ||
      plugin.name.includes("..")
    ) {
      throw new Error(`Invalid plugin name: ${plugin.name}`);
    }
    if (plugin.name.length < 1 || plugin.name.length > 64) {
      throw new Error(`Plugin name length out of range: ${plugin.name}`);
    }

    if (plugin.format === "cursor" && plugin.rules.length === 0) {
      throw new Error(`${plugin.name}: cursor format requires at least one rule`);
    }
    if (plugin.format === "agent" && plugin.rules.length > 0) {
      throw new Error(`${plugin.name}: agent format cannot include rules`);
    }
    if (plugin.rules.length === 0 && plugin.skills.length === 0) {
      throw new Error(`${plugin.name}: empty plugin`);
    }

    for (const rule of plugin.rules) {
      if (!ruleFiles.has(rule)) throw new Error(`${plugin.name}: missing rule ${rule}.mdc`);
      if (seenRules.has(rule)) throw new Error(`Rule ${rule} assigned to multiple plugins`);
      seenRules.add(rule);
    }
    for (const skill of plugin.skills) {
      if (!skillDirs.has(skill)) throw new Error(`${plugin.name}: missing skill ${skill}`);
      if (seenSkills.has(skill)) throw new Error(`Skill ${skill} assigned to multiple plugins`);
      seenSkills.add(skill);
    }
  }

  const orphanRules = [...ruleFiles].filter((r) => !seenRules.has(r));
  const orphanSkills = [...skillDirs].filter((s) => !seenSkills.has(s));
  if (orphanRules.length) {
    throw new Error(`Rules not assigned to any plugin: ${orphanRules.join(", ")}`);
  }
  if (orphanSkills.length) {
    throw new Error(`Skills not assigned to any plugin: ${orphanSkills.join(", ")}`);
  }
}

/**
 * Shared manifest metadata fields.
 * @param {import("./plugins-catalog.mjs").PluginDef} plugin
 */
function baseMeta(plugin) {
  return {
    name: plugin.name,
    version: VERSION,
    description: plugin.description,
    author: AUTHOR,
    homepage: HOMEPAGE,
    repository: REPOSITORY,
    license: LICENSE,
    keywords: plugin.keywords,
  };
}

/**
 * Write Agent Plugins root manifest (skills-only plugins).
 * @param {string} pluginRoot
 * @param {import("./plugins-catalog.mjs").PluginDef} plugin
 */
function writeAgentManifest(pluginRoot, plugin) {
  const manifest = {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    ...baseMeta(plugin),
  };
  writeFileSync(join(pluginRoot, "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Write Cursor Plugin manifest under `.cursor-plugin/plugin.json`.
 * @param {string} pluginRoot
 * @param {import("./plugins-catalog.mjs").PluginDef} plugin
 */
function writeCursorManifest(pluginRoot, plugin) {
  const dir = join(pluginRoot, ".cursor-plugin");
  mkdirSync(dir, { recursive: true });
  const manifest = { ...baseMeta(plugin) };
  writeFileSync(join(dir, "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Copy one skill tree into a plugin.
 * @param {string} pluginRoot
 * @param {string} skillName
 */
function copySkill(pluginRoot, skillName) {
  const destDir = join(pluginRoot, "skills");
  mkdirSync(destDir, { recursive: true });
  cpSync(join(SKILLS_DIR, skillName), join(destDir, skillName), { recursive: true });
}

/**
 * Copy one rule file into a plugin.
 * @param {string} pluginRoot
 * @param {string} ruleName
 */
function copyRule(pluginRoot, ruleName) {
  const destDir = join(pluginRoot, "rules");
  mkdirSync(destDir, { recursive: true });
  cpSync(join(RULES_DIR, `${ruleName}.mdc`), join(destDir, `${ruleName}.mdc`));
}

/**
 * Build a single plugin directory.
 * @param {import("./plugins-catalog.mjs").PluginDef} plugin
 */
function buildPlugin(plugin) {
  const pluginRoot = join(PLUGINS_DIR, plugin.name);
  mkdirSync(pluginRoot, { recursive: true });

  for (const rule of plugin.rules) copyRule(pluginRoot, rule);
  for (const skill of plugin.skills) copySkill(pluginRoot, skill);

  // Cursor marketplace multi-plugin resolution looks for `.cursor-plugin/plugin.json`.
  writeCursorManifest(pluginRoot, plugin);

  // Skills-only plugins also ship a portable Agent Plugins root manifest.
  if (plugin.format === "agent") {
    writeAgentManifest(pluginRoot, plugin);
  }

  const readmeLines = [
    `# ${plugin.name}`,
    "",
    plugin.description,
    "",
    "Generated from balakit `skills/` and `rules/` — do not edit by hand.",
    "Regenerate with `./sync.sh` or `node scripts/build-plugins.mjs`.",
    "",
    plugin.rules.length ? `**Rules:** ${plugin.rules.join(", ")}` : null,
    plugin.skills.length ? `**Skills:** ${plugin.skills.join(", ")}` : null,
    "",
  ];
  writeFileSync(join(pluginRoot, "README.md"), readmeLines.filter((line) => line !== null).join("\n"));
}

/**
 * Write the Cursor multi-plugin marketplace manifest at repo root.
 */
function writeMarketplace() {
  mkdirSync(MARKETPLACE_DIR, { recursive: true });
  const marketplace = {
    name: MARKETPLACE_NAME,
    owner: MARKETPLACE_OWNER,
    metadata: {
      description:
        "Opinionated rules and skills for AI coding agents, packaged as installable domain plugins.",
      version: VERSION,
      pluginRoot: "plugins",
    },
    plugins: PLUGINS.map((plugin) => ({
      name: plugin.name,
      source: plugin.name,
      description: plugin.description,
      version: VERSION,
      keywords: plugin.keywords,
    })),
  };
  writeFileSync(
    join(MARKETPLACE_DIR, "marketplace.json"),
    `${JSON.stringify(marketplace, null, 2)}\n`,
  );
}

/**
 * Build all plugins and the marketplace manifest.
 * @returns {{ pluginCount: number, skillCount: number, ruleCount: number }}
 */
export function buildPlugins() {
  validateCatalog();
  rmSync(PLUGINS_DIR, { recursive: true, force: true });
  mkdirSync(PLUGINS_DIR, { recursive: true });

  let skillCount = 0;
  let ruleCount = 0;
  for (const plugin of PLUGINS) {
    buildPlugin(plugin);
    skillCount += plugin.skills.length;
    ruleCount += plugin.rules.length;
  }
  writeMarketplace();

  writeFileSync(
    join(PLUGINS_DIR, "README.md"),
    [
      "# balakit plugins",
      "",
      "Domain plugins generated from repository `skills/` and `rules/`.",
      "Each plugin installs separately (Cursor marketplace or Agent Plugins clients).",
      "",
      "| Plugin | Format | Rules | Skills |",
      "| --- | --- | --- | --- |",
      ...PLUGINS.map(
        (p) =>
          `| \`${p.name}\` | ${p.format === "agent" ? "Agent Plugins + Cursor" : "Cursor Plugin"} | ${
            p.rules.join(", ") || "—"
          } | ${p.skills.join(", ") || "—"} |`,
      ),
      "",
      "Regenerate: `node scripts/build-plugins.mjs` (also run by `./sync.sh`).",
      "",
      "The `balakit` CLI continues to install rules into `AGENTS.md` / `CLAUDE.md` and",
      "skills via skills.sh for multi-agent setups.",
      "",
    ].join("\n"),
  );

  return { pluginCount: PLUGINS.length, skillCount, ruleCount };
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const { pluginCount, skillCount, ruleCount } = buildPlugins();
  console.log(
    `Built ${pluginCount} plugins (${skillCount} skills, ${ruleCount} rules) -> plugins/ + .cursor-plugin/marketplace.json`,
  );
}
