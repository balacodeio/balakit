# balakit plugins

Domain plugins generated from repository `skills/` and `rules/`.
Each plugin installs separately (Cursor marketplace or Agent Plugins clients).

| Plugin | Format | Rules | Skills |
| --- | --- | --- | --- |
| `balakit-core` | Cursor Plugin | base, testing, comments, changelog | — |
| `balakit-seo` | Cursor Plugin | seo-ai-search | everything-seo, seo-audit |
| `balakit-marketing` | Agent Plugins + Cursor | — | marketing-psychology, startup-marketing-brain |
| `balakit-media` | Agent Plugins + Cursor | — | media-gen |
| `balakit-nlm` | Agent Plugins + Cursor | — | nlm-skill |
| `balakit-engineering` | Agent Plugins + Cursor | — | authoring-skills-and-rules, cloakbrowser-fallback, deep-deliberation, dissect, documentation-writer, release-deploy |

Regenerate: `node scripts/build-plugins.mjs` (also run by `./sync.sh`).

The `balakit` CLI continues to install rules into `AGENTS.md` / `CLAUDE.md` and
skills via skills.sh for multi-agent setups.
