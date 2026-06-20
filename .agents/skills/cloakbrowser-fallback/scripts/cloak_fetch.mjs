#!/usr/bin/env node
/**
 * One-shot stealth fetch via CloakBrowser (JS / Playwright API).
 *
 * Loads a URL with a stealth Chromium binary that defeats most bot detection,
 * then prints the final URL, page title, and visible text, and saves a
 * screenshot. Intended as a fallback when ordinary automation is blocked.
 *
 * Usage: node cloak_fetch.mjs <url> [--headed] [--screenshot path]
 *        [--html path] [--wait ms] [--max-text n]
 */
import { writeFile } from "node:fs/promises";

function parseArgs(argv) {
  const args = { headed: false, screenshot: "cloak_shot.png", html: null, wait: 4000, maxText: 8000, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--headed") args.headed = true;
    else if (a === "--screenshot") args.screenshot = argv[++i];
    else if (a === "--html") args.html = argv[++i];
    else if (a === "--wait") args.wait = Number(argv[++i]);
    else if (a === "--max-text") args.maxText = Number(argv[++i]);
    else if (!a.startsWith("--")) args.url = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error("Usage: node cloak_fetch.mjs <url> [--headed] [--screenshot path] [--html path] [--wait ms]");
    return 2;
  }

  let launch;
  try {
    ({ launch } = await import("cloakbrowser"));
  } catch {
    console.error("cloakbrowser not installed. Run: npm install cloakbrowser");
    return 2;
  }

  const browser = await launch({ headless: !args.headed, humanize: true });
  try {
    const page = await browser.newPage();
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (args.wait) await page.waitForTimeout(args.wait);

    console.log(`FINAL_URL: ${page.url()}`);
    console.log(`TITLE: ${await page.title()}`);

    await page.screenshot({ path: args.screenshot, fullPage: true });
    console.log(`SCREENSHOT: ${args.screenshot}`);

    if (args.html) {
      await writeFile(args.html, await page.content(), "utf-8");
      console.log(`HTML: ${args.html}`);
    }

    const text = await page.innerText("body");
    console.log("--- PAGE TEXT ---");
    console.log(text.slice(0, args.maxText));
  } finally {
    await browser.close();
  }
  return 0;
}

main().then((code) => process.exit(code ?? 0));
