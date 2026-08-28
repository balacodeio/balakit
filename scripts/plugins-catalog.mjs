/**
 * Domain plugin catalog for Agent Plugins / Cursor Plugins packaging.
 *
 * Source of truth remains `skills/` and `rules/`. `build-plugins.mjs` materializes
 * each entry under `plugins/<name>/`. Edit this catalog when adding a skill or rule.
 *
 * Format:
 * - `cursor` — ships rules (and optional skills); Cursor Plugin via `.cursor-plugin/plugin.json`
 * - `agent` — skills-only; portable Agent Plugins `plugin.json` plus Cursor marketplace twin
 */

/** @typedef {"cursor" | "agent"} PluginFormat */

/**
 * @typedef {object} PluginDef
 * @property {string} name Plugin id (kebab-case, Agent Plugins name constraints).
 * @property {string} description Short purpose for marketplace / manifests.
 * @property {string[]} keywords Discovery tags.
 * @property {PluginFormat} format Packaging format.
 * @property {string[]} rules Rule basenames (without `.mdc`) copied into `rules/`.
 * @property {string[]} skills Skill directory names copied into `skills/`.
 */

/** @type {PluginDef[]} */
export const PLUGINS = [
  {
    name: "balakit-core",
    description:
      "Standing project rules: meta-principle, testing, comments, changelog, and release version lockstep.",
    keywords: ["rules", "coding-standards", "agents-md", "balakit"],
    format: "cursor",
    rules: ["base", "testing", "comments", "changelog", "release"],
    skills: [],
  },
  {
    name: "balakit-seo",
    description:
      "Scoped seo-ai-search rule for Cursor (globs). Portable SEO skills ship in balakit-seo-skills.",
    keywords: ["seo", "geo", "structured-data", "cursor", "balakit"],
    format: "cursor",
    rules: ["seo-ai-search"],
    skills: [],
  },
  {
    name: "balakit-seo-skills",
    description:
      "SEO and AI-search skills: everything-seo playbook and seo-audit workflow.",
    keywords: ["seo", "geo", "structured-data", "audit", "balakit"],
    format: "agent",
    rules: [],
    skills: ["everything-seo", "seo-audit"],
  },
  {
    name: "balakit-marketing",
    description:
      "Startup marketing and conversion psychology skills for distribution and monetization.",
    keywords: ["marketing", "startup", "psychology", "growth", "balakit"],
    format: "agent",
    rules: [],
    skills: ["marketing-psychology", "startup-marketing-brain"],
  },
  {
    name: "balakit-media",
    description:
      "Fal.ai media generation skill for images, video, upscale, and ad creative workflows.",
    keywords: ["media", "fal-ai", "image-generation", "video", "balakit"],
    format: "agent",
    rules: [],
    skills: ["media-gen"],
  },
  {
    name: "balakit-nlm",
    description:
      "NotebookLM CLI and MCP expert skill for research, notebooks, and content generation.",
    keywords: ["notebooklm", "nlm", "mcp", "research", "balakit"],
    format: "agent",
    rules: [],
    skills: ["nlm-skill"],
  },
  {
    name: "balakit-engineering",
    description:
      "Engineering workflow skills: authoring, deliberation, dissect, docs, release, and stealth browser fallback.",
    keywords: [
      "engineering",
      "dissect",
      "documentation",
      "release",
      "authoring",
      "balakit",
    ],
    format: "agent",
    rules: [],
    skills: [
      "authoring-skills-and-rules",
      "cloakbrowser-fallback",
      "deep-deliberation",
      "dissect",
      "documentation-writer",
      "release-deploy",
    ],
  },
];

/** Marketplace id for the Cursor multi-plugin repo root. */
export const MARKETPLACE_NAME = "balakit";

/** Marketplace owner metadata. */
export const MARKETPLACE_OWNER = {
  name: "Ali Farahat",
  email: "ali@balacode.io",
};
