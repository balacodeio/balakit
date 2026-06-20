#!/usr/bin/env pwsh
# Sync the source-of-truth skills/ and rules/ into the locations each agent reads.
#
# Source of truth : skills/  rules/   (develop and iterate here)
#
# Skills mirror to every agent's skills directory (all of them auto-discover
# SKILL.md from these): .cursor/  .claude/  .agents/.
#
# Rules only mirror to .cursor/rules/ (Cursor is the only agent that reads .mdc
# rule files natively). Claude Code, Codex, OpenCode and Copilot get their rules
# from the generated root CLAUDE.md / AGENTS.md instead - see build-agent-rules.mjs.
# No agent reads a .claude/rules/ or .agents/rules/ folder, so those are removed.
#
# Mirrors are fully replaced on every run so deletions propagate (no stale forks).
# Run from anywhere - it locates the repo root.
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\sync.ps1

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$skillMirrors = '.cursor', '.claude', '.agents'

foreach ($d in $skillMirrors) {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$d/skills"
    New-Item -ItemType Directory -Force -Path "$d/skills" | Out-Null
    Copy-Item -Recurse -Force -Path 'skills/*' -Destination "$d/skills/"
    Write-Host "synced skills -> $d/skills"
}

# Cursor is the only native .mdc consumer. Refresh its copy; drop inert mirrors.
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue '.cursor/rules', '.claude/rules', '.agents/rules'
New-Item -ItemType Directory -Force -Path '.cursor/rules' | Out-Null
Copy-Item -Force -Path 'rules/*.mdc' -Destination '.cursor/rules/'
Write-Host "synced rules  -> .cursor/rules (removed inert .claude/rules, .agents/rules)"

# Regenerate the flattened standing-context files (CLAUDE.md / AGENTS.md) from rules/.
if (Get-Command node -ErrorAction SilentlyContinue) {
    node scripts/build-agent-rules.mjs
} else {
    Write-Warning "node not found on PATH - skipped CLAUDE.md / AGENTS.md regeneration."
}

$skillCount = (Get-ChildItem -Path 'skills' -Directory).Count
$ruleCount  = (Get-ChildItem -Path 'rules' -Filter '*.mdc').Count
Write-Host "Done. $skillCount skills -> $($skillMirrors -join ', '); $ruleCount rules -> .cursor + root CLAUDE.md/AGENTS.md."
