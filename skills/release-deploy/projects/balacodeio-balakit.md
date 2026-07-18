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

## GitHub Actions

- Release workflow path(s): none in-repo today (library publishes via GitHub Release + npm)
- Trigger: git tag / GitHub Release published
- Workflow to watch after `gh release create`: none required for kit contents; npm publish is separate when credentials available

## Deploy targets

### Primary stack
- Type: library
- Details: npm package `balakit`; GitHub Release notes from CHANGELOG

### Beta
- Deploy destination: GitHub pre-release on `staging`
- Public URL / how to verify: `gh release view <tag>`

### Production
- Deploy destination: GitHub Release on `master` + npm `balakit@latest` when publishing
- Public URL / how to verify: https://github.com/balacodeio/balakit/releases · https://www.npmjs.com/package/balakit

## Artifacts

- Attach to GitHub Release: no (npm is the artifact)
- Artifact names / patterns: n/a

## Guardrails

- Clean working tree required: yes
- CI green on commit required: no (no in-repo Actions yet)
- Pause for explicit confirmation before production tag: yes (unless user already ordered a production release)
- Never do: force-push tags, delete release tags, publish prod from staging

## Agent checklist (project-specific)

- [ ] `npm test` green
- [ ] CHANGELOG section matches tag
- [ ] `package.json` version matches tag (sans `v`)
- [ ] Push `master` then `gh release create`
- [ ] `npm publish` when npm credentials available
