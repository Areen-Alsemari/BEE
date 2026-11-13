// Checkpoint 7b deliverable screenshots: every page at 1440x900 and 1920x1080.
// Usage: node e2e/screenshot-copy-pass.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? join(here, "..", "..", "docs", "screenshots", "copy_pass");
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["landing", "/"],
  ["mission_control", "/mission-control"],
  ["bee_mechanism", "/bee-lab"],
  ["ablation", "/ablation"],
  ["results", "/results"],
  ["method", "/protocol"],
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  const page = await browser.newPage({ viewport });
  for (const [name, hash] of PAGES) {
    await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(name === "mission_control" ? 2500 : 1000);
    await page.screenshot({ path: join(OUT, `${viewport.width}x${viewport.height}_${name}.png`), fullPage: true });
    console.log(`saved ${viewport.width}x${viewport.height}_${name}.png`);
  }
  await page.close();
}
await browser.close();
