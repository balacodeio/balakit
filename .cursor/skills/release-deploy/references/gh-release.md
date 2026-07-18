# GitHub CLI release workflow

Use `gh` for releases. Run git/`gh` commands as separate PowerShell statements (no `&&` chaining).

## Preconditions

From project config + user confirmation:

- Channel and branch match (`main` / `staging` or configured map)
- Intended commit is HEAD (or known SHA)
- Next tag string confirmed
- Changelog notes extracted
- Guardrails satisfied (clean tree, CI, etc.)

Useful checks:

```powershell
git status
git branch --show-current
git log -1 --oneline
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef
```

List recent releases/tags:

```powershell
gh release list --limit 20
git tag -l "v*" --sort=-v:refname | Select-Object -First 20
```

## Create the release

Prefer letting `gh` create the tag from a branch or SHA:

### Beta (staging)

```powershell
gh release create "v1.4.0-beta.1" --target staging --title "v1.4.0-beta.1" --notes-file notes.md --prerelease
```

### Production (main)

```powershell
gh release create "v1.4.0" --target main --title "v1.4.0" --notes-file notes.md
```

Notes:

- Write extracted changelog body to a temp `notes.md` (or pass `--notes "..."` for short notes).
- `--target` must be the **branch name** or **commit SHA** for that channel — not the other branch.
- Add `--latest` only for production when this should be the GitHub "latest" release (default behavior is usually fine; follow project config).
- To attach local files: pass asset paths as trailing arguments. Prefer CI-uploaded assets when the workflow already does that.

### Annotated tag first (optional)

Only if the project requires a local annotated tag before `gh`:

```powershell
git tag -a "v1.4.0" -m "v1.4.0"
git push origin "v1.4.0"
gh release create "v1.4.0" --notes-file notes.md
```

Do not push tags until the user confirmed the version.

## Watch deployment

1. Open or watch the workflow named in project config:

```powershell
gh run list --limit 5
gh run watch
```

2. Or link the release:

```powershell
gh release view "v1.4.0" --web
```

3. Verify using the beta/production URL or artifact checks from project config.

## Failure handling

- If the release was created but the workflow failed: report the run URL; do **not** delete the tag unless the user asks.
- If tagging the wrong branch was requested: refuse and explain channel rules.
- If `gh` auth fails: stop and ask the user to authenticate (`gh auth login`).

## Safety

- No `git push --force` on tags
- No rewriting published release notes unless the user asks
- No production tag from `staging` (or beta tag from `main`) unless project config + user explicitly override
