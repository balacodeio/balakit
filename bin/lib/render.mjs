/**
 * Shared rule rendering — used by the consumer installer and repo sync.
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, relative } from "node:path";
import { BEGIN, END, NAME, CMD, REPO } from "./pkg.mjs";

/** Demote every Markdown heading one level so rule bodies nest under an H1. */
export const demote = (md) => md.replace(/^(#{1,5}) /gm, "#$1 ");

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Path relative to cwd when under the project; otherwise absolute. */
export const rel = (f) => {
  const r = relative(process.cwd(), f);
  return !r || r.startsWith("..") ? f : r;
};

/**
 * Render selected rules into a Markdown block for AGENTS.md / CLAUDE.md.
 * Always-on rules are inlined; scoped rules get a conditional index entry
 * (and are installed as Cursor `.mdc` files separately).
 * @param {Array<{name: string, always: boolean, globs: string, body: string, description: string}>} rules
 * @param {{ consumer?: boolean }} [opts] When `consumer` is true, scoped rules
 *   carry an inline scope note (no pointer to repo `rules/*.mdc`).
 */
export function renderRulesBlock(rules, { consumer = true } = {}) {
  const always = rules.filter((r) => r.always);
  const scoped = rules.filter((r) => !r.always);

  const parts = [
    `# Opinionated Rules`,
    "",
    `Installed from \`${REPO}\` via \`npx ${CMD}\`. Re-run \`npx ${CMD} update\` to refresh.`,
    "",
  ];

  for (const r of always) {
    parts.push(`<!-- from rules/${r.name}.mdc -->`, demote(r.body), "");
  }

  if (scoped.length) {
    parts.push("## Conditional rules", "", "Apply these only when working on matching files:", "");
    for (const r of scoped) {
      if (consumer) {
        const globs = r.globs ? ` (globs: \`${r.globs}\`)` : "";
        parts.push(`- **${r.name}**${globs} — ${r.description}`);
        if (r.globs) {
          parts.push("", `> Scope: apply only to files matching \`${r.globs}\`.`, "", demote(r.body), "");
        }
      } else {
        const globs = r.globs ? ` (globs: \`${r.globs}\`)` : "";
        parts.push(`- **${r.name}**${globs} — ${r.description} → see \`rules/${r.name}.mdc\``);
      }
    }
    parts.push("");
  }

  return parts.join("\n").trim();
}

/**
 * Render standing-context files for this repo's own sync (CLAUDE.md / AGENTS.md).
 * Inlines always-on rules; indexes scoped rules as pointers to `rules/*.mdc`.
 * @param {Array} rules Full catalog.
 * @param {string} agentLabel Human label for the generated header.
 */
export function renderRepoStandingDocs(rules, agentLabel) {
  const always = rules.filter((r) => r.always);
  const scoped = rules.filter((r) => !r.always);
  const out = [
    "<!-- GENERATED FILE — do not edit by hand.",
    "     Source of truth: rules/*.mdc · Regenerate: ./sync.sh or sync.ps1 -->",
    "",
    "# Project Rules",
    "",
    `Standing rules for ${agentLabel}, generated from this repository's \`rules/*.mdc\`. ` +
      "Edit the source rules, then run the sync script to regenerate this file.",
    "",
  ];
  for (const r of always) {
    out.push(`<!-- from rules/${r.name}.mdc -->`, demote(r.body), "");
  }
  if (scoped.length) {
    out.push("## Conditional rules", "", "Apply these only when working on matching files:", "");
    for (const r of scoped) {
      const globs = r.globs ? ` (globs: \`${r.globs}\`)` : "";
      out.push(`- **${r.name}**${globs} — ${r.description} → see \`rules/${r.name}.mdc\``);
    }
    out.push("");
  }
  return out.join("\n");
}

/** Insert or replace our managed block in a file, preserving all other content. */
export function mergeManaged(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const block = `${BEGIN}\n${content}\n${END}`;
  let cur = "";
  try {
    cur = readFileSync(file, "utf8");
  } catch {}
  if (cur.includes(BEGIN) && cur.includes(END)) {
    const re = new RegExp(`${esc(BEGIN)}[\\s\\S]*?${esc(END)}`);
    writeFileSync(file, cur.replace(re, block));
  } else {
    writeFileSync(file, (cur.trim() ? cur.replace(/\s*$/, "") + "\n\n" : "") + block + "\n");
  }
}

/**
 * Remove our managed block from a file. Deletes the file if only whitespace remains.
 * @returns {boolean} True if a block was removed (or file deleted).
 */
export function removeManaged(file) {
  if (!existsSync(file)) return false;
  let cur = readFileSync(file, "utf8");
  if (!cur.includes(BEGIN) || !cur.includes(END)) return false;
  const re = new RegExp(`\\n*${esc(BEGIN)}[\\s\\S]*?${esc(END)}\\n*`);
  cur = cur.replace(re, "\n").trim();
  if (!cur) {
    unlinkSync(file);
  } else {
    writeFileSync(file, cur + "\n");
  }
  return true;
}

/** True when a file contains our managed block. */
export function hasManagedBlock(file) {
  if (!existsSync(file)) return false;
  const cur = readFileSync(file, "utf8");
  return cur.includes(BEGIN) && cur.includes(END);
}
