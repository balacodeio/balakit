#!/usr/bin/env bash
# Sync the source-of-truth skills/ and rules/ into the locations each agent reads.
#
# Source of truth : skills/  rules/   (develop and iterate here)
#
# Skills mirror to every agent's skills directory (all of them auto-discover
# SKILL.md from these): .cursor/  .claude/  .agents/.
#
# Rules only mirror to .cursor/rules/ (Cursor is the only agent that reads .mdc
# rule files natively). Claude Code, Codex, OpenCode and Copilot get their rules
# from the generated root CLAUDE.md / AGENTS.md instead — see build-agent-rules.mjs.
# No agent reads a .claude/rules/ or .agents/rules/ folder, so those are removed.
#
# Mirrors are fully replaced on every run so deletions propagate (no stale forks).
# Run from anywhere - it locates the repo root.
#
# Usage:  ./sync.sh     (chmod +x sync.sh once)

set -euo pipefail
cd "$(dirname "$0")"

skill_mirrors=(.cursor .claude .agents)

for d in "${skill_mirrors[@]}"; do
  rm -rf "$d/skills"
  mkdir -p "$d/skills"
  cp -r skills/* "$d/skills/"
  echo "synced skills -> $d/skills"
done

# Cursor is the only native .mdc consumer. Refresh its copy; drop inert mirrors.
rm -rf .cursor/rules .claude/rules .agents/rules
mkdir -p .cursor/rules
cp rules/*.mdc .cursor/rules/
echo "synced rules  -> .cursor/rules (removed inert .claude/rules, .agents/rules)"

# Regenerate the flattened standing-context files (CLAUDE.md / AGENTS.md) from rules/.
if command -v node >/dev/null 2>&1; then
  node scripts/build-agent-rules.mjs
else
  echo "WARN: node not found on PATH - skipped CLAUDE.md / AGENTS.md regeneration." >&2
fi

skills_n=$(find skills -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
rules_n=$(find rules -maxdepth 1 -name '*.mdc' | wc -l | tr -d ' ')
echo "Done. $skills_n skills -> ${skill_mirrors[*]}; $rules_n rules -> .cursor + root CLAUDE.md/AGENTS.md."
