// Checks for the BEE Mechanism Lab and the Ablation Lab.
// - Ablation number trace: every displayed traced number equals its JSON value, its text matches
//   the value, and it has an evidence badge in its scope (>= 30 cells sampled across states).
// - axe-core (WCAG 2.1 AA) on both pages at 1440x900 and 1920x1080.
// - Wording scan, console errors and warnings, screenshots.
// Usage: node e2e/verify-pages-2-3.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? join(here, "..", "..", "docs", "screenshots", "pages_2_3");
mkdirSync(OUT, { recursive: true });
const DATA = join(here, "..", "public", "data");
const files = Object.fromEntries(["ablation.json", "paired.json", "thresholds.json"].map((f) => [f, JSON.parse(readFileSync(join(DATA, f), "utf8"))]));
const BANNED = /\b(improves?|improved|improvement|outperforms?|significant(ly)?|wins?|beats?|superior)\b/i;

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const consoleLog = [];
const resolve = (trace) => {
  const [file, path] = trace.split(":");
  return path.split("/").reduce((o, k) => (o == null ? undefined : o[/^\d+$/.test(k) ? Number(k) : k]), files[file]);
};
function textMatches(text, v) {
  const t = text.trim();
  if (t === "equal") return v === 0;
  const m = t.match(/^(higher|lower) by ([\d.]+)$/);
  if (m) {
    const d = m[2].split(".")[1]?.length ?? 0;
    return Math.sign(v) === (m[1] === "higher" ? 1 : -1) && Math.abs(Math.abs(v) - Number(m[2])) <= 0.5 * 10 ** -d + 1e-12;
  }
  const n = Number(t.replace(/,/g, ""));
  if (Number.isNaN(n)) return false;
  const d = t.split(".")[1]?.length ?? 0;
  const tol = /e/i.test(t) ? Math.abs(v) * 0.05 : 0.5 * 10 ** -d + 1e-12;
  return Math.abs(n - v) <= Math.max(tol, Math.abs(v) * 0.05 * (d === 0 && Math.abs(v) < 1 ? 1 : 0));
}

const browser = await chromium.launch();
const traced = new Map();
const report = { axe: {}, numberTrace: {}, wording: {} };

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  const tag = `${viewport.width}x${viewport.height}`;
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => consoleLog.push({ tag, type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => consoleLog.push({ tag, type: "pageerror", text: String(e) }));

  for (const [hash, name] of [
    ["/bee-lab", "bee_lab"],
    ["/ablation", "ablation"],
  ]) {
    await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
    await page.waitForSelector(name === "bee_lab" ? '[data-testid="hex-cards"]' : '[data-testid="matrix"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `${tag}_${name}_top.png`) });
    await page.screenshot({ path: join(OUT, `${tag}_${name}_full.png`), fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    report.axe[`${tag}:${name}`] = axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`) }));
    check(`${tag} ${name}: axe WCAG 2.1 AA`, axe.violations.length === 0, axe.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "0 violations");
    const text = await page.locator("main").innerText();
    const hit = text.match(BANNED);
    report.wording[`${tag}:${name}`] = hit ? hit[0] : null;
    check(`${tag} ${name}: no banned comparison words`, !hit, hit ? hit[0] : "");
  }

  // page 2 interactions
  await page.goto(`${BASE}/#/bee-lab`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="hex-cards"]');
  check(`${tag} bee_lab: mask statement shown`, (await page.locator('[data-testid="mask-statement"]').innerText()).includes("The BEE features are inputs to the policy. The action mask is the shared feasibility mask."));
  const allowedBefore = await page.locator('[data-testid="allowed-count"]').innerText();
  const cardsBefore = await page.locator('[data-testid="hex-cards"] [data-card]').count();
  const actBefore = await page.locator('[data-testid="hex-cards"] [data-activation]').first().textContent();
  await page.locator('[data-testid="theta"]').evaluate((el) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "0.2");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const actAfter = await page.locator('[data-testid="hex-cards"] [data-activation]').first().textContent();
  check(
    `${tag} bee_lab: moving θ changes activation but not the allowed set or the cards`,
    actBefore !== actAfter && (await page.locator('[data-testid="allowed-count"]').innerText()) === allowedBefore && (await page.locator('[data-testid="hex-cards"] [data-card]').count()) === cardsBefore,
    `activation ${actBefore} -> ${actAfter}; allowed ${allowedBefore}; cards ${cardsBefore}`,
  );
  if (viewport.width === 1440) await page.locator('[data-testid="panel-sees"]').screenshot({ path: join(OUT, `${tag}_bee_lab_theta_0.20.png`) });
  await page.click('[data-testid="sb-method-adaptive_A6"]');
  for (const [k, v] of [
    ["sb-scarcity", 0.1],
    ["sb-increase", 0.0],
    ["sb-rel", 0.0],
  ])
    await page.locator(`[data-testid="${k}"]`).evaluate((el, val) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(val));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
  await page.waitForTimeout(200);
  const gateOff = await page.locator('[data-testid="sb-gate-state"]').innerText();
  check(`${tag} bee_lab: A6 selective gate shows off when fewer than 2 indicators fire`, /off/.test(gateOff), gateOff);
  if (viewport.width === 1440) await page.locator("#sandbox").screenshot({ path: join(OUT, `${tag}_bee_lab_sandbox_gate_off.png`) });

  // page 3 number trace across states
  if (viewport.width === 1440) {
    await page.goto(`${BASE}/#/ablation`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="matrix"]');
    for (const [cfg, ref] of [
      ["A6", "A6"],
      ["A6", "A3"],
      ["A1", "A6"],
      ["A3", "A6"],
      ["A4", "A3"],
      ["A5", "A6"],
    ]) {
      await page.click(`[data-testid="cfg-${cfg}"]`);
      await page.click(`[data-testid="ref-${ref}"]`);
      await page.waitForTimeout(250);
      const items = await page.locator("[data-trace]").evaluateAll((els) =>
        els.map((e) => ({
          trace: e.getAttribute("data-trace"),
          value: Number(e.getAttribute("data-value")),
          text: e.textContent,
          badged: !!e.closest("[data-num-scope]")?.querySelector("[data-evidence]"),
          scoped: !!e.closest("[data-num-scope]"),
        })),
      );
      for (const it of items) traced.set(`${it.trace}|${it.text}`, it);
      if (cfg === "A4" && ref === "A3") await page.locator('[data-testid="stage-shortlist"]').screenshot({ path: join(OUT, `${tag}_ablation_A4_vs_A3_shortlist.png`) });
    }
    const all = [...traced.values()];
    const bad = all.filter((it) => {
      const v = resolve(it.trace);
      return typeof v !== "number" || v !== it.value || !textMatches(it.text, it.value) || !it.badged;
    });
    report.numberTrace = {
      cells: all.length,
      distinct_paths: new Set(all.map((x) => x.trace)).size,
      failures: bad.map((b) => ({ ...b, json: resolve(b.trace) })),
      sample: all.slice(0, 40),
    };
    check(`ablation: ${all.length} displayed numbers equal ablation.json / paired.json / thresholds.json`, all.length >= 30 && bad.filter((b) => resolve(b.trace) !== b.value).length === 0, `${all.length} cells, ${new Set(all.map((x) => x.trace)).size} distinct paths`);
    check(`ablation: displayed text matches each value`, bad.filter((b) => !textMatches(b.text, b.value)).length === 0, bad.filter((b) => !textMatches(b.text, b.value)).slice(0, 3).map((b) => `${b.trace}=${b.text}`).join("; "));
    check(`ablation: every traced number has an evidence badge in its scope`, bad.filter((b) => !b.badged).length === 0, bad.filter((b) => !b.badged).slice(0, 3).map((b) => b.trace).join("; "));
    const untracedNums = await page.locator("main").evaluate((root) => {
      const out = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        const t = n.textContent.trim();
        if (!/\d\.\d{3,}/.test(t)) continue;
        if (n.parentElement.closest("[data-trace], svg, select, option, [data-evidence], code")) continue;
        out.push(t.slice(0, 80));
      }
      return out;
    });
    check("ablation: no 3+ decimal number outside a traced element", untracedNums.length === 0, untracedNums.slice(0, 4).join(" | "));
  }
  await ctx.close();
}
await browser.close();

const errs = consoleLog.filter((m) => m.type === "error" || m.type === "pageerror" || m.type === "warning");
check("console: no errors or warnings on either page", errs.length === 0, errs.slice(0, 3).map((e) => e.text).join(" | "));
writeFileSync(join(OUT, "pages_2_3_report.json"), JSON.stringify({ checks, report, console: consoleLog }, null, 2));
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
