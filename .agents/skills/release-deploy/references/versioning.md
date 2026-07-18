# Versioning & changelog

## Tag shapes

| Channel | Branch | Tag | Example |
|---------|--------|-----|---------|
| production | `main` | `vMAJOR.MINOR.PATCH` | `v1.4.0` |
| beta | `staging` | `vMAJOR.MINOR.PATCH-beta.N` | `v1.4.0-beta.2` |

Rules:

- Always include the leading `v`.
- **Production** tags never include a prerelease suffix.
- **Beta** tags always include `-beta.N` where `N` is a positive integer.
- A beta **may** bump MAJOR/MINOR/PATCH (new base version) **or** only bump `N` on the same base.
  - First beta of a new minor: `v1.5.0-beta.1`
  - Next beta, same base: `v1.5.0-beta.2`
  - Shipping that base to production later: `v1.5.0` (from `main`)

## Choosing the next version

1. List recent tags: `gh release list --limit 20` and/or `git tag -l 'v*' --sort=-v:refname`.
2. Ask the user (or propose from changelog intent):
   - Channel: beta vs production
   - Bump type: major / minor / patch / beta-number-only
3. Propose the exact next tag string; wait for confirmation before creating it.

### Defaults when user says only "ship a beta"

- If latest tag is `v1.4.0-beta.3` → propose `v1.4.0-beta.4` (same base).
- If latest tag is `v1.4.0` (production) and changelog Unreleased suggests a minor → propose `v1.5.0-beta.1` (confirm with user).
- Never jump to production without an explicit production/live/stable request.

### Defaults when user says only "ship production" / "release to prod"

- Base version should match the beta line they are promoting when applicable (`v1.5.0-beta.N` → `v1.5.0`).
- If no matching beta exists, propose next semver from changelog + last production tag; confirm.

## CHANGELOG.md (required source for notes)

- The project **maintains** `CHANGELOG.md` (or path from project config). The agent does **not** invent release notes.
- Prefer [Keep a Changelog](https://keepachangelog.com/) style headings.

### Extracting notes for a release

1. Prefer a heading that matches the version being cut, e.g. `## [1.4.0]` or `## [1.4.0-beta.1]` (with or without `v`, with or without brackets).
2. If cutting a new version from Unreleased: use the `[Unreleased]` body as notes, then **ask** whether to rewrite Unreleased into the new version section in the same change set (only if user wants that edit).
3. If no usable section exists → stop. Ask the user to update `CHANGELOG.md` before tagging.

### What goes into `gh release create`

- Title: `vX.Y.Z` or `vX.Y.Z-beta.N` (same as tag), unless project config says otherwise.
- Notes: the extracted changelog section body (features/fixes/changes), not the whole file.
- Betas: `--prerelease` unless project config overrides.
