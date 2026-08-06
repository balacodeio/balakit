# First-time release interview

Run this **once per repository** the first time the user asks to release (beta or production) and no `projects/<repo-slug>.md` exists.

Goal: capture how *this* project ships so later releases are mechanical. Keep questions short. Skip anything already obvious from the repo (workflows, `wrangler.toml`, Electron/Tauri configs, etc.) — confirm instead of re-asking.

After answers, write `projects/<repo-slug>.md` using [project.template.md](project.template.md). Tell the user the path and that they can edit it anytime.

## Repo slug

```text
gh repo view --json nameWithOwner -q .nameWithOwner
```

Replace `/` with `-` for the filename (e.g. `acme-widgets` → `projects/acme-widgets.md` if under an org path use full `owner-repo`).

## Questions (ask conversationally; batch related ones)

### 1. Channels & branches

1. Confirm production branch is `main` and beta branch is `staging`. If different, record the map.
2. Confirm: tags on production branch = production releases; tags on staging branch = beta releases.

### 2. Versioning

1. Confirm tag shape: production `vX.Y.Z`, beta `vX.Y.Z-beta.N`.
2. When cutting a beta that also bumps the base version (e.g. first beta of `1.5.0`), who decides MAJOR/MINOR/PATCH — agent proposes from changelog, or user always states it?
3. Path to changelog (default `CHANGELOG.md`). Keep a Unreleased section? (recommended)

### 3. GitHub Actions / CI

1. Which workflow file(s) run on release tags? (path under `.github/workflows/`)
2. Do beta and production share one workflow with environment filters, or separate workflows?
3. What event triggers deploy — `release: types: [published]`, `push: tags: ['v*']`, or other?
4. Any required secrets/environments (`staging`, `production`) the agent should know exist but never print?

### 4. Deploy targets (pick all that apply)

Ask which apply, then drill into that platform:

| Target | Follow-up |
|--------|-----------|
| Cloudflare Worker / Pages | Staging vs production Worker/Pages names or URLs; env bindings. See [platforms/cloudflare.md](platforms/cloudflare.md). |
| Other web (Vercel, Fly, k8s, …) | Staging vs production URLs; how tag maps to environment. |
| Desktop app | OS targets, artifact names, signing/notarization, beta vs prod update channel. See [platforms/desktop.md](platforms/desktop.md). |
| Mobile (App Store / Play) | Only if relevant: beta track vs production; whether this skill stops at GitHub Release artifacts. |
| Library / npm / other | Registry + how tags map to publish. |

### 5. Release notes & assets

1. Notes always from `CHANGELOG.md` section matching the version?
2. Attach build artifacts from Actions, or leave release body-only?
3. Mark GitHub Releases as prerelease for betas? (default **yes**)

### 6. Guardrails

1. Require clean working tree? (default **yes**)
2. Require CI green on the commit before tagging? (default **yes** if checks exist)
3. Anyone/approval needed before production tags? (record; agent must pause and confirm)

## After the interview

1. Write `projects/<repo-slug>.md` from the template.
2. Optionally list discovered workflow files the user confirmed.
3. Proceed with the requested release using that config.
4. If the user only wanted setup, stop after writing the file.
