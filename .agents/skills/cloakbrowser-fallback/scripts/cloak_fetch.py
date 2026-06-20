#!/usr/bin/env python3
"""One-shot stealth fetch via CloakBrowser.

Loads a URL with a stealth Chromium binary that defeats most bot detection,
then prints the final URL, page title, and visible text, and saves a
screenshot. Intended as a fallback when ordinary automation is blocked.
"""
import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch a URL with CloakBrowser stealth Chromium.")
    parser.add_argument("url", help="URL to load")
    parser.add_argument("--headed", action="store_true", help="Show the window (needed for managed Turnstile)")
    parser.add_argument("--screenshot", default="cloak_shot.png", help="Screenshot output path")
    parser.add_argument("--html", help="Optional path to dump raw HTML")
    parser.add_argument("--wait", type=int, default=4000, help="Extra ms to wait after load for JS challenges")
    parser.add_argument("--max-text", type=int, default=8000, help="Max characters of page text to print")
    args = parser.parse_args()

    try:
        from cloakbrowser import launch
    except ImportError:
        print("cloakbrowser not installed. Run: pip install --user cloakbrowser", file=sys.stderr)
        return 2

    browser = launch(headless=not args.headed, humanize=True)
    try:
        page = browser.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        if args.wait:
            page.wait_for_timeout(args.wait)

        print(f"FINAL_URL: {page.url}")
        print(f"TITLE: {page.title()}")

        page.screenshot(path=args.screenshot, full_page=True)
        print(f"SCREENSHOT: {args.screenshot}")

        if args.html:
            with open(args.html, "w", encoding="utf-8") as fh:
                fh.write(page.content())
            print(f"HTML: {args.html}")

        text = page.inner_text("body")
        print("--- PAGE TEXT ---")
        print(text[: args.max_text])
    finally:
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
