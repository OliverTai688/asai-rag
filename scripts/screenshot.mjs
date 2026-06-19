#!/usr/bin/env node
/**
 * Screenshot helper so the agent can SEE rendered pages while iterating on UI.
 * Uses playwright-core driving the locally-installed Microsoft Edge (channel
 * "msedge") — no big browser download.
 *
 * Usage:
 *   node scripts/screenshot.mjs <url> <outPath> [width] [height] [dark]
 * Example:
 *   node scripts/screenshot.mjs http://localhost:3100/ /tmp/home.png 1440 900
 *   node scripts/screenshot.mjs http://localhost:3100/ /tmp/home-dark.png 1440 900 dark
 */
import { createRequire } from "module";
const require = createRequire("/Users/pzps0964713/Documents/github/asai-rag/node_modules/playwright-core/");
const { chromium } = require("playwright-core");

const [url, out, w = "1440", h = "900", mode = "light"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/screenshot.mjs <url> <outPath> [w] [h] [light|dark]");
  process.exit(1);
}

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  colorScheme: mode === "dark" ? "dark" : "light",
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600); // let entrance animations settle
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
