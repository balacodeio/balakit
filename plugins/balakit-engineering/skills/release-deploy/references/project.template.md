# Project release config template

Copy to `projects/<repo-slug>.md` after the first-time interview. Fill every section. Delete rows that do not apply.

```markdown
# Release config: <owner/repo>

## Channels

| Channel | Branch | Tag pattern | GitHub prerelease? |
|---------|--------|-------------|--------------------|
| production | main | vX.Y.Z | no |
| beta | staging | vX.Y.Z-beta.N | yes |

## Versioning

- Scheme: semver with `v` prefix
- Beta prerelease label: `beta.N` (N starts at 1 per base version)
- Version authority: user states / agent proposes from CHANGELOG (pick one)
- Changelog path: CHANGELOG.md
- Changelog source of truth: section `## [X.Y.Z]` or `## [X.Y.Z-beta.N]`; fall back to `[Unreleased]` only if user is cutting that into this release

## GitHub Actions

- Release workflow path(s):
  - `.github/workflows/<name>.yml`
- Trigger: release published / push tag / other:
- Beta environment name:
- Production environment name:
- Workflow to watch after `gh release create`:
- Notes: (filters, matrix, manual approvals)

## Deploy targets

### Primary stack
- Type: cloudflare-worker | cloudflare-pages | desktop | web-other | mobile | library | other
- Details: (names, URLs, channels — see platform refs)

### Beta
- Deploy destination:
- Public URL / how to verify:
- Extra steps after tag (if any):

### Production
- Deploy destination:
- Public URL / how to verify:
- Extra steps after tag (if any):

## Artifacts

- Attach to GitHub Release: yes/no
- Artifact names / patterns:
- Desktop update channel mapping (if any): beta → …, production → …

## Guardrails

- Clean working tree required: yes
- CI green on commit required: yes/no
- Pause for explicit confirmation before production tag: yes
- Never do: force-push tags, delete release tags, publish prod from staging

## Agent checklist (project-specific)

- [ ] …
```

## Naming

- File: `projects/<owner>-<repo>.md` from `nameWithOwner` with `/` → `-`.
- One file per GitHub repo. Update the file when deploy targets or workflows change; do not re-run the full interview unless the user asks.
