/**
 * Catalog of packaged rules and skills.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { RULES_DIR, SKILLS_DIR, RULE_BUNDLED_SKILLS } from "./pkg.mjs";

/**
 * Parse one .mdc rule into frontmatter fields, raw text, and body.
 * @param {string} file Absolute path to a `.mdc` file.
 */
export function parseRule(file) {
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  const fm = m ? m[1] : "";
  const body = (m ? m[2] : raw).trim();
  const field = (k) =>
    (fm.match(new RegExp(`^${k}:\\s*(.+)$`, "m")) || [, ""])[1].trim();
  return {
    name: basename(file, ".mdc"),
    raw,
    always: /^alwaysApply:\s*true\s*$/m.test(fm),
    globs: field("globs"),
    description: field("description"),
    body,
  };
}

/**
 * Extract a skill's description, handling YAML block scalars (`>-` etc.).
 * @param {string} skillMd Full SKILL.md contents.
 */
export function skillDescription(skillMd) {
  const m = skillMd.match(/^description:\s*(.*)$/m);
  let description = m ? m[1].trim() : "";
  if (/^[>|][-+]?$/.test(description)) {
    const collected = [];
    for (const line of skillMd.slice(m.index + m[0].length).split(/\r?\n/).slice(1)) {
      if (/^\s+\S/.test(line)) collected.push(line.trim());
      else if (line.trim() === "") continue;
      else break;
    }
    description = collected.join(" ");
  } else {
    description = description.replace(/^["']|["']$/g, "");
  }
  return description;
}

/** All packaged rules, global first then alphabetical. */
export function loadRules() {
  return readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".mdc"))
    .map((f) => parseRule(join(RULES_DIR, f)))
    .sort((a, b) =>
      a.name === "global" ? -1 : b.name === "global" ? 1 : a.name.localeCompare(b.name),
    );
}

/** All packaged skills with descriptions. */
export function loadSkills() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
    .map((d) => {
      let description = "";
      try {
        description = skillDescription(
          readFileSync(join(SKILLS_DIR, d.name, "SKILL.md"), "utf8"),
        );
      } catch {}
      return { name: d.name, description };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Expand rule names to the skills they bundle. */
export function bundledSkillsFor(ruleNames) {
  return [...new Set(ruleNames.flatMap((r) => RULE_BUNDLED_SKILLS[r] ?? []))];
}

/** Truncate a string for display. */
export const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
