# FAL.ai Key Troubleshooting & Known Limitations

## Key Format
- FAL keys look like: `07138a1e-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36-char UUID)
- The key expires or gets rate-limited after heavy usage
- Shell expansion (`FAL_KEY="$FAL_KEY"`) resolves correctly; hardcoded strings often fail with 401

## Endpoint Access
| Endpoint | Status | Notes |
|----------|--------|-------|
| `fal-ai/flux-2/klein/9b` | ✅ Works | Text-to-image, fast, good quality |
| `fal-ai/nano-banana-pro/edit` | ✅ Works (fal-client >= 1.0.0) | Image-to-image. Fixed by upgrading from 0.13.1 |
| `fal-ai/ideogram/v3` | ❌ 401 | Not authorized on current key |
| `fal-ai/ideogram/v4` | ❌ 401 | Not authorized on current key |
| `bytedance/seedream/v5/pro/text-to-image` | ❌ 401 | Different key scope needed |
| `bytedance/seedream/v5/pro/edit` | ❌ 401 | Same scope issue |

## Symptom: Commands fail only in background

If a foreground command works but the same command fails in background, it's an env-var inheritance issue:
- BACKGROUND FAILS: processes spawned via `background=true` lose the parent shell's `$FAL_KEY`
- WORKAROUND: Always run `FAL_KEY="$FAL_KEY" python generate.py ...` in **foreground** with a timeout

## Symptom: CDN upload for image-to-image returns 401/405

If `fal_client.upload_file()` fails with 401 on `rest.fal.ai/storage/auth/token`:
- **Root cause (most likely):** Outdated fal-client library. v0.13.1 sends incorrectly-formatted requests.
- **Fix:** `pip install --upgrade fal-client` (v1.0.0+ fixes this)
- The FAL key itself is fine — it's the client library that can't negotiate the CDN token.

Manual test:
```bash
# Test CDN token endpoint directly
FAL_KEY="$FAL_KEY" curl -s -X POST "https://rest.fal.ai/storage/auth/token" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"storage_type":"fal-cdn-v3"}'
# Expected: {"token": "eyJ...", "base_url": "https://v3b.fal.media", ...}
```

## Symptom: Hardcoded key gives 401 but shell-expanded key works

If `FAL_KEY="07138a1e-..."` returns 401 but `FAL_KEY="$FAL_KEY"` works:
- The env var may have been rotated since you last read it
- The shell variable may contain escape characters or whitespace that hardcoding loses
- **Rule**: Never hardcode the literal key — always use `$FAL_KEY`

## Recovery Steps
1. Verify key exists: `echo "key: ${FAL_KEY:0:10}..."`
2. Test endpoint: `curl -s -w "\n%{http_code}" -H "Authorization: Key $FAL_KEY" https://queue.fal.run/fal-ai/flux-2/klein/9b -d '{"prompt":"test"}'`
3. If 401: the key is expired or out of credits. Get a new one at https://fal.ai
4. Set new key: `export FAL_KEY="new-key"` or add to `~/.bashrc`
