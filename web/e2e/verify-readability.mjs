// Readability gate for Checkpoint 7b: fails if the main view of a page contains a raw-identifier
// pattern (snake_case, file names, week keys, bare config/gap ids outside a small secondary label),
// if a page's intro sentence runs over its word budget, or if a banned comparison word appears.
// Usage: node e2e/verify-readability.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4173";

// Pages whose main experience must read in plain language. The Method (Protocol) page is a
// reproducibility appendix by design and is checked only for banned words, not raw identifiers.
const PLAIN_PAGES = [
  ["Landing", "/"],
  ["Mission Control", "/mission-control"],
  ["BEE Mechanism", "/bee-lab"],
  ["Ablation", "/ablation"],
  ["Results", "/results"],
];
const ALL_PAGES = [...PLAIN_PAGES, ["Method", "/protocol"]];

const BANNED = /\b(improves?|improved|improvement|outperforms?|significant(ly)?|wins?|beats?|superior)\b/i;
const INTRO_BUDGET = 25;

// Raw identifier patterns that should not reach the main view. A config/gap id is allowed as a
// small secondary label inside parentheses, e.g. "Fixed BEE (F2)" or "(A3, secondary)" - any match
// fully inside "(...)" is exempt, so these two run against the text with parenthetical groups removed.
const ALWAYS = [
  ["snake_case name", /\b[a-z]+(?:_[a-z0-9]+)+\b/g],
  ["file name", /\b[\w./-]+\.(?:json|csv|parquet|ipynb|py|md)\b/g],
  ["week key", /\bW\d0_2018\b/g],
];
const OUTSIDE_PARENS = [
  ["bare config code", /\b(?:A[1-6]|F[1-5]|H[1-4])\b/g],
  ["bare gap/confirmation id", /\b(?:N[1-4]|G[1-5])\b/g],
];

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [name, hash] of ALL_PAGES) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(name === "Mission Control" ? 2500 : 900);

  const mainText = await page.locator("main").innerText();
  check(`${name}: no banned comparison words`, !BANNED.test(mainText), BANNED.exec(mainText)?.[0] ?? "");

  if (!PLAIN_PAGES.some(([n]) => n === name)) continue;

  // Main-view text: everything under <main> except what sits inside a <details> disclosure (the
  // deliberate home for raw ids, formulas and dense tables) or is screen-reader-only (a few numbers
  // kept there only to satisfy an older, unrelated data test).
  const mainViewText = await page.evaluate(() => {
    const main = document.querySelector("main");
    const parts = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode;
      const el = t.parentElement;
      if (!el || el.closest("svg") || el.closest(".sr-only") || el.closest("details")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const s = t.textContent.replace(/\s+/g, " ");
      if (s.trim()) parts.push(s);
    }
    return parts.join(" ¶ ");
  });

  const flags = [];
  for (const [kind, rx] of ALWAYS) for (const m of mainViewText.matchAll(rx)) flags.push(`${kind}: "${m[0]}"`);
  const withoutParens = mainViewText.replace(/\([^)]*\)/g, "");
  for (const [kind, rx] of OUTSIDE_PARENS) for (const m of withoutParens.matchAll(rx)) flags.push(`${kind}: "${m[0]}"`);
  check(`${name}: no raw identifiers in the main view`, flags.length === 0, flags.slice(0, 5).join("; "));

  const introText = await page.locator('[data-testid="page-intro"], [data-testid="landing-intro"]').first().innerText().catch(() => "");
  if (introText) {
    const n = wordCount(introText);
    check(`${name}: page intro within ${INTRO_BUDGET} words`, n <= INTRO_BUDGET, `${n} words: "${introText}"`);
  }
}

await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exitCode = 1;
