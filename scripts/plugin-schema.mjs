/**
 * Closed-schema checks for Agent Plugins 1.0.0 root `plugin.json`.
 * Matches spec §5 without fetching the schema at load time.
 */
export const AGENT_PLUGIN_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

const ALLOWED_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);

const NAME_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

/**
 * Throw if a root Agent Plugins manifest is not 1.0.0-conformant.
 * @param {object} manifest
 * @param {string} [label]
 */
export function assertAgentManifest(manifest, label = "plugin.json") {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${label}: manifest must be a JSON object`);
  }
  if (manifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    throw new Error(`${label}: $schema must be ${AGENT_PLUGIN_SCHEMA}`);
  }
  if (typeof manifest.name !== "string" || !manifest.name) {
    throw new Error(`${label}: name is required`);
  }
  if (typeof manifest.version !== "string" || !manifest.version) {
    throw new Error(`${label}: version is required`);
  }
  if (
    manifest.name.length > 64 ||
    !NAME_RE.test(manifest.name) ||
    manifest.name.includes("--") ||
    manifest.name.includes("..")
  ) {
    throw new Error(`${label}: invalid plugin name ${manifest.name}`);
  }
  for (const key of Object.keys(manifest)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(`${label}: unknown top-level field "${key}"`);
    }
  }
  if (manifest.author != null) {
    if (typeof manifest.author !== "object" || Array.isArray(manifest.author)) {
      throw new Error(`${label}: author must be an object`);
    }
    for (const k of Object.keys(manifest.author)) {
      if (!["name", "email", "url"].includes(k) || typeof manifest.author[k] !== "string") {
        throw new Error(`${label}: invalid author field "${k}"`);
      }
    }
  }
  if (
    manifest.keywords != null &&
    (!Array.isArray(manifest.keywords) || manifest.keywords.some((k) => typeof k !== "string"))
  ) {
    throw new Error(`${label}: keywords must be an array of strings`);
  }
  if (manifest.extensions != null) {
    if (typeof manifest.extensions !== "object" || Array.isArray(manifest.extensions)) {
      throw new Error(`${label}: extensions must be an object`);
    }
  }
}
