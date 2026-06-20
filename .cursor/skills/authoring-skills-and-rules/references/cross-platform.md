# Write once, run everywhere — the cross-platform strategy

The two open standards converging across agents are **`SKILL.md`** (procedural
capabilities) and **`AGENTS.md`** (standing instructions). Lean on both and you
maintain one source of truth instead of five.

## What each platform reads

### Skills (`SKILL.md`)
| Platform | Reads a Skill from |
|---|---|
| Claude Code | `.claude/skills/`, `~/.claude/skills/` |
| Cursor | `.cursor/skills/` (install via `npx skills`) |
| OpenCode | `.opencode/skills/`, **and** `~/.claude/skills`, `~/.agents/skills` (+ project `.claude/`, `.agents/`) |
| Codex | `.agents/skills/` (cwd, parent, repo root, `~/.agents/skills`, `/etc/codex/skills`) |
| Copilot | `.github/skills/`, **and** `.claude/skills`, `.agents/skills` (since Dec 2025) |

**Leverage:** `.agents/skills/` and `.claude/skills/` are read by several agents
at once (Codex, OpenCode, Copilot; plus Claude Code for `.claude/skills/`).
Author the Skill once, then mirror it into the directories each agent scans —
one folder covers all five.

### Rules / instructions
| Standing-context mechanism | Read by |
|---|---|
| `AGENTS.md` | OpenCode, Codex, Cursor, Copilot |
| `CLAUDE.md` | Claude Code; OpenCode (fallback) |
| `.cursor/rules/*.mdc` | Cursor only |
| `.github/copilot-instructions.md`, `*.instructions.md` | Copilot only |

**Leverage:** a single root **`AGENTS.md`** covers OpenCode, Codex, Cursor, and
Copilot for standing rules. Claude Code reads `CLAUDE.md` (and OpenCode falls
back to it) — keep the two in sync or have one reference the other's content.

## This repo's mirror model

This repository keeps a **source of truth** and copies (mirrors) it into
per-agent directories:

```
skills/<name>/SKILL.md      ← source of truth (also feeds skills.sh)
rules/<name>.mdc            ← source of truth for Cursor rules
   ↓ mirrored into
.cursor/skills/<name>/       .cursor/rules/<name>.mdc
.agents/skills/<name>/       (cross-agent: OpenCode + Codex)
.claude/skills/<name>/       (Claude Code)
```

Skills install into a consumer's project via [skills.sh](https://skills.sh)
(`npx skills add <repo>`); rules are copied manually into `.cursor/rules/`. The
`.cursor/`, `.agents/`, and `.claude/` copies inside *this* repo are committed
mirrors of the `skills/` source of truth.

### Keeping mirrors in sync
1. **Edit the source** in `skills/<name>/` (or `rules/<name>.mdc`) only.
2. **Re-copy** the whole folder to each mirror — never hand-edit a mirror.
3. On Unix you may **symlink** mirrors to the source instead of copying, so they
   never drift (Windows: use `mklink /D` or copy in a script).
4. After any edit, `grep` the Skill's `name:` slug across the repo to confirm
   every copy was updated and none was missed.

## Decision shortcut

- **Reusable procedure, want it everywhere** → write one `SKILL.md` and mirror
  the folder into `.claude/skills`, `.cursor/skills`, `.agents/skills`
  (Codex + OpenCode + Copilot), `.github/skills` if you want the Copilot-native
  path too, and `.opencode/skills` if used. One source, all five agents — no
  Copilot-specific translation needed since Dec 2025.
- **Standing project rules for everyone** → root `AGENTS.md` (OpenCode, Codex,
  Cursor, Copilot) **+** root `CLAUDE.md` (Claude Code) **+** `.cursor/rules/*.mdc`
  for Cursor's glob-scoped behavior. These three are the only rule artifacts any
  agent actually reads — there is **no `.agents/rules/` or `.claude/rules/*.mdc`
  discovery** (the `.agents/`/`.claude/` folders are skills locations).
