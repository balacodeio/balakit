# Release config: balacodeio/balakit

## Channels

| Channel | Branch | Tag pattern | GitHub prerelease? |
|---------|--------|-------------|--------------------|
| production | master | vX.Y.Z | no |
| beta | staging | vX.Y.Z-beta.N | yes |

## Versioning

- Scheme: semver with `v` prefix
- Beta prerelease label: `beta.N` (N starts at 1 per base version)
- Version authority: agent proposes from CHANGELOG; user confirms
- Changelog path: CHANGELOG.md
- Changelog source of truth: section `## [vX.Y.Z]` or `## [X.Y.Z]`; fall back to `[Unreleased]` only when cutting that into this release
- Also bump `package.json` `version` to match (no leading `v`)
- **Lockstep:** every `plugins/*/plugin.json`, `.cursor-plugin/` twin, Codex/Claude wrapper, and marketplace `metadata.version` / plugin entry `version` must equal `package.json`. Skill `SKILL.md` frontmatter `version:` stays independent. Never hand-edit generated plugin `version` fields — bump `package.json` only, then `./sync.sh`.

## GitHub Actions

- Release workflow path(s): `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Trigger: push/PR to `master` or `staging` (CI); git tag `v*` (release + npm publish)
- Workflow to watch after pushing a tag: `.github/workflows/release.yml` (creates the GitHub Release and runs `npm publish`). Do **not** also `gh release create` or `npm publish` locally — that duplicates the tag workflow.
- Repo secret required: `NPM_TOKEN` (npm publish). `GITHUB_TOKEN` is provided by Actions.

## Deploy targets

### Primary stack
- Type: library
- Details: npm package `balakit`; GitHub Release notes from CHANGELOG

### Beta
- Deploy destination: GitHub pre-release on `staging` + npm dist-tag `beta`
- Public URL / how to verify: `gh release view <tag>` · `npm view balakit dist-tags`

### Production
- Deploy destination: GitHub Release on `master` + npm `balakit@latest`
- Public URL / how to verify: https://github.com/balacodeio/balakit/releases · https://www.npmjs.com/package/balakit

## Artifacts

- Attach to GitHub Release: no (npm is the artifact)
- Artifact names / patterns: n/a

## Guardrails

- Clean working tree required: yes
- CI green on commit required: yes (`npm test` + `node scripts/check-lockstep.mjs --rebuild --git`)
- Pause for explicit confirmation before production tag: yes (unless user already ordered a production release)
- Never do: force-push tags, delete release tags, publish prod from staging, hand-edit plugin versions, `gh release create` locally when the tag workflow will also create it

## Agent checklist (project-specific)

- [ ] `npm test` green
- [ ] CI green on the release branch (`master` or `staging`)
- [ ] CHANGELOG section matches tag (`## [vX.Y.Z]`)
- [ ] `package.json` version matches tag (sans `v`)
- [ ] `./sync.sh` so plugin / marketplace versions lockstep with the tag
- [ ] `node scripts/check-lockstep.mjs --rebuild --git` clean
- [ ] Push the annotated tag only (`git tag vX.Y.Z` then `git push origin vX.Y.Z`); Actions creates the GitHub Release and publishes npm
