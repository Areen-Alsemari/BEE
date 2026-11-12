// Copy audit: capture every visible text block per page and section, count words, and flag raw identifiers.
// Usage: node e2e/audit-copy.mjs [baseUrl] [outJson]
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? "copy_audit.json";

const PAGES = [
  ["Landing", "/"],
  ["Mission Control", "/mission-control"],
  ["BEE Mechanism", "/bee-lab"],
  ["Ablation", "/ablation"],
  ["Results", "/results"],
  ["Protocol", "/protocol"],
];

// Raw identifier patterns that should not reach the main view
const PATTERNS = [
  ["snake_case name", /\b[a-z]+(?:_[a-z0-9]+)+\b/g],
  ["file name", /\b[\w./-]+\.(?:json|csv|parquet|ipynb|py|md)\b/g],
  ["week key", /\bW\d0_2018\b/g],
  ["config code", /\b(?:A[1-6]|F[1-5]|H[1-4])\b/g],
  ["gap or confirmation id", /\b(?:N[1-4]|G[1-5]|C\d{1,2}|R[1-3])\b/g],
  ["stage label", /\b(?:screening|shortlist|confirmation) \((?:1,024 steps|5,120|10,240)\)|full cross-week \(25,088\)/g],
  ["internal label", /recomputed from schedules|supplementary|evidence stage|protocol runs?|recorded trace value|configuration record|what-if θ|heuristic \(no training\)/gi],
  ["code or formula", /\b(?:np\.\w+|clip\(|1e-8|default_rng|_action_mask|θ\^|s\^)\S*/g],
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = [];

async function capture(name, extra = "") {
  const blocks = await page.evaluate(() => {
    const main = document.querySelector("main");
    const heading = (el) => {
      let n = el;
      while (n && n !== main) {
        const sec = n.closest("section, header, aside");
        if (!sec) break;
        const h = sec.querySelector("h1, h2, h3");
        if (h) return h.textContent.trim().slice(0, 80);
        n = sec.parentElement;
      }
      return "(page)";
    };
    const res = [];
    const seen = new Set();
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (["SCRIPT", "STYLE", "svg", "OPTION"].includes(el.tagName) || el.closest("svg")) continue;
      const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(" ").replace(/\s+/g, " ").trim();
      if (!own || own.length < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.closest("details:not([open]) > :not(summary)")) continue;
      const full = el.innerText?.replace(/\s+/g, " ").trim() ?? own;
      const text = ["P", "LI", "TD", "TH", "H1", "H2", "H3", "BUTTON", "LABEL", "SPAN", "DIV", "A", "SUMMARY", "DD", "DT", "CAPTION"].includes(el.tagName) && full.length < 600 ? full : own;
      const key = `${heading(el)}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      res.push({ section: heading(el), tag: el.tagName.toLowerCase(), text });
    }
    // svg text too (chart labels)
    for (const t of main.querySelectorAll("svg text")) {
      const s = t.textContent.trim();
      if (s && !/^[\d.,+−-]+$/.test(s)) res.push({ section: heading(t), tag: "svg-text", text: s });
    }
    return res;
  });
  // drop nested duplicates: keep a block if its text is not fully contained in a shorter-tagged parent already counted
  for (const b of blocks) out.push({ page: name + extra, ...b, words: b.text.split(/\s+/).filter(Boolean).length });
}

for (const [name, hash] of PAGES) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(name === "Mission Control" ? 3000 : 1200);
  if (name === "Mission Control") {
    await page.locator('[data-testid="timeline"] [data-request]').nth(5).click({ force: true });
    await page.waitForTimeout(400);
  }
  if (name === "BEE Mechanism") await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  await capture(name);
  if (name === "Mission Control") {
    await page.check('[data-testid="compare-toggle"]');
    await page.waitForTimeout(2500);
    await capture(name, " (compare mode)");
  }
}
await page.goto(`${BASE}/#/mission-control`, { waitUntil: "networkidle" });
await page.click("text=How to read this");
await page.waitForTimeout(500);
const htr = await page.locator("#how-to-read").evaluate((el) => [...el.querySelectorAll("h2,h3,li,p,span[data-evidence]")].map((e) => ({ tag: e.tagName.toLowerCase(), text: e.textContent.replace(/\s+/g, " ").trim() })));
for (const b of htr) out.push({ page: "How to read this (panel)", section: "panel", ...b, words: b.text.split(/\s+/).length });
await browser.close();

for (const b of out) {
  b.flags = [];
  for (const [kind, rx] of PATTERNS) for (const m of b.text.matchAll(rx)) b.flags.push({ kind, match: m[0] });
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`captured ${out.length} text blocks; ${out.filter((b) => b.flags.length).length} with raw identifiers`);
