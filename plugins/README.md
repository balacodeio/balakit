# balakit plugins

Domain plugins generated from repository `skills/` and `rules/`.
Each plugin installs separately (Cursor marketplace or Agent Plugins clients).

| Plugin | Format | Rules | Skills |
| --- | --- | --- | --- |
| `balakit-core` | Cursor Plugin | base, testing, comments, changelog | — |
| `balakit-seo` | Cursor Plugin | seo-ai-search | — |
| `balakit-seo-skills` | Agent Plugins + Cursor | — | everything-seo, seo-audit |
| `balakit-marketing` | Agent Plugins + Cursor | — | marketing-psychology, startup-marketing-brain |
| `balakit-media` | Agent Plugins + Cursor | — | media-gen |
| `balakit-nlm` | Agent Plugins + Cursor | — | nlm-skill |
| `balakit-engineering` | Agent Plugins + Cursor | — | authoring-skills-and-rules, cloakbrowser-fallback, deep-deliberation, dissect, documentation-writer, release-deploy |

Regenerate: `node scripts/build-plugins.mjs` (also run by `./sync.sh`).

The `balakit` CLI installs rules into AGENTS.md / CLAUDE.md / `.cursor/rules`
and skills via skills.sh (`--scope project|user`). Plugins are the portable
Agent Plugins 1.0.0 packages (plus Cursor / Codex / Claude marketplace wrappers).
