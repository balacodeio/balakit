# Desktop applications

Use when the project ships installers or desktop binaries (Electron, Tauri, Wails, native, etc.).

## Channel mapping (typical)

| Channel | Git branch | Tag | Desktop side |
|---------|------------|-----|--------------|
| beta | `staging` | `vX.Y.Z-beta.N` | Beta/early-access update channel; prerelease GitHub Release; unsigned or differently branded build if configured |
| production | `main` | `vX.Y.Z` | Stable update channel; full signing/notarization; "latest" stable artifacts |

Beta vs production often differs in: update feed URL, app ID/channel flag, signing identity, and whether the GitHub Release is marked prerelease.

## What the agent does

1. Tag/release on the correct branch with notes from `CHANGELOG.md`.
2. Mark betas as GitHub **prerelease** unless project config says otherwise.
3. Watch the release workflow that builds installers (Windows/macOS/Linux as configured).
4. Confirm artifacts appear on the Release (or in the project's artifact store).
5. Only perform store upload / notarization / Sparkle-feed steps if they are documented in project config — otherwise stop at GitHub Release + CI.

## Interview / config fields to capture

- Tooling: Electron / Tauri / other
- Target OS matrix
- Artifact names (e.g. `.msi`, `.exe`, `.dmg`, `.AppImage`)
- Auto-update mechanism (Sparkle, electron-updater, custom) and beta vs stable feed URLs
- Signing / notarization handled in CI? (yes/no; never ask for cert passphrases in chat — use existing secrets)
- Whether beta builds use a different app name, icon, or channel flag
- App Store / Microsoft Store / Play: in scope for this repo or out of band?

## Mobile stores (optional)

If the same repo also ships iOS/Android:

- Record whether a GitHub tag should upload to TestFlight / internal testing vs production store tracks.
- Default: **stop at CI artifacts** unless project config spells out store upload commands and the user explicitly requests that channel.

## Do not

- Ship a production desktop build from a beta tag
- Re-sign or replace assets on an existing production release without explicit request
- Assume store credentials are available to the agent
