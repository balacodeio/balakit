---
name: cloakbrowser-fallback
description: Stealth browser fallback that uses CloakBrowser (a real Chromium binary with C++ source-level fingerprint patches) to load sites that block normal automation. Use when the built-in browser tool or the Chrome DevTools MCP fails to reach a page because of bot detection, Cloudflare/Turnstile, reCAPTCHA, a 403/429/"access denied"/"are you human" interstitial, or an empty/blocked response. Also use when the user manually asks for "cloakbrowser", a "stealth browser", or to bypass a block.
version: "1.0.1"
author: "Ali Farahat"
tags: ["cloakbrowser", "stealth-browser", "anti-bot-bypass", "playwright"]
---

# CloakBrowser Fallback

Stealth Chromium for navigating sites that block ordinary automation. Drop-in Playwright API, but the browser is a custom-compiled Chromium binary, so detectors score it as a real human browser.

Already installed on this machine. Both languages share the same stealth binary at `~/.cloakbrowser/`:
- **Python** (global): `pip` package `cloakbrowser`.
- **JS** (self-contained in this skill's `scripts/`): npm `cloakbrowser` + `playwright-core`.

Prefer **Python** by default. Use **JS** when the target codebase/repo is JS/TS or the user asks for it.

## When to reach for this

Use as a **fallback only** — try the built-in browser tool or Chrome DevTools MCP first. Escalate to CloakBrowser when any of these happen:

- The page returns 403 / 429 / "Access Denied" / "Sorry, you have been blocked".
- A Cloudflare / Turnstile / reCAPTCHA / "Verify you are human" wall blocks content.
- The response is empty, truncated, or clearly a bot-detection interstitial.
- The user explicitly asks for the stealth browser / to bypass a block.

## Quick start (one-shot fetch)

Run the helper — it prints final URL, title, and page text, and saves a screenshot.

Python:

```bash
python scripts/cloak_fetch.py "https://protected-site.com"
```

JS (run from this skill's `scripts/` dir so `node_modules` resolves):

```bash
node scripts/cloak_fetch.mjs "https://protected-site.com"
```

Both accept the same flags:
- `--headed` — show the window. Needed for Turnstile **managed** challenges (resolves with a single click).
- `--screenshot path.png` — where to save the screenshot (default: `cloak_shot.png`).
- `--html path.html` — also dump raw HTML.
- `--wait 5000` — extra ms to wait after load for JS challenges to clear.

## Inline usage (when you need custom interaction)

Python (sync API):

```python
from cloakbrowser import launch

browser = launch(headless=True, humanize=True)  # humanize=True → human-like mouse/keyboard
page = browser.new_page()
page.goto("https://protected-site.com", wait_until="domcontentloaded")
page.wait_for_timeout(4000)                       # let JS challenges clear
print(page.title())
page.screenshot(path="cloak_shot.png", full_page=True)
html = page.content()
browser.close()
```

JS (async API):

```javascript
import { launch } from "cloakbrowser";

const browser = await launch({ headless: true, humanize: true });
const page = await browser.newPage();
await page.goto("https://protected-site.com", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
console.log(await page.title());
await page.screenshot({ path: "cloak_shot.png", fullPage: true });
const html = await page.content();
await browser.close();
```

Everything else is standard Playwright (`click`, `fill`, `locator`, etc.) — same API you already know.

## Decision notes

- **Turnstile non-interactive** → works headless, auto-resolves.
- **Turnstile managed** → use `--headed`; it clears with one click after the page settles.
- CloakBrowser does **not** solve image CAPTCHAs and has no built-in proxy rotation. If a site demands an image CAPTCHA, report that to the user rather than looping.
- Don't use this to defeat paywalls/auth or violate a site's terms — it's for reaching content blocked by overzealous bot detection during legitimate work.

## Verifying / maintaining the binary

```bash
python -m cloakbrowser info     # version, path, platform
python -m cloakbrowser install  # download binary if missing (~535 MB, one-time)
python -m cloakbrowser update   # pull a newer stealth Chromium
```

If a run fails with "binary not found", run `python -m cloakbrowser install` first.
