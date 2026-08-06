# Cloudflare (Workers / Pages)

Use when project config `Primary stack` is `cloudflare-worker` or `cloudflare-pages`.

## Channel mapping (typical)

| Channel | Git branch | Tag | Cloudflare side |
|---------|------------|-----|------------------|
| beta | `staging` | `vX.Y.Z-beta.N` | Staging Worker name, Pages preview/staging project, or staging route/URL |
| production | `main` | `vX.Y.Z` | Production Worker/Pages project and production route/URL |

Exact names and URLs live in `projects/<slug>.md` — do not invent account IDs or Worker names.

## What the agent does

1. Tag/release via [../gh-release.md](../gh-release.md) on the correct branch.
2. Let GitHub Actions (or the project's documented pipeline) deploy with the right Cloudflare environment/secrets.
3. Verify with the staging or production URL from project config (HTTP check or user confirmation).

## Interview / config fields to capture

- Worker name(s) or Pages project name(s) for beta vs production
- Custom domains or `*.workers.dev` URLs for each channel
- Whether one Worker with env-specific vars, or two Workers
- Wrangler config path (`wrangler.toml` / `wrangler.jsonc`) if relevant
- Workflow that calls `wrangler deploy` (or Pages deploy) on tag/release

## Do not

- Run production `wrangler deploy` from a beta tag (or vice versa) unless config says one command selects env by tag
- Print secret values from Actions or `.env`
- Create Cloudflare resources unless the user explicitly asks during setup
