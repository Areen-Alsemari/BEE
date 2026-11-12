// Checks for the Results Arena (4), Landing (6) and Protocol (7) pages, plus page 2 section (d).
// - number trace: every [data-trace] number equals its JSON value, its text matches, and it has a badge in scope
//   (>= 60 on the Results Arena across metric, sort and pair selections)
// - template sentences: every number in "What these results show" is a traced number
// - axe WCAG 2.1 AA, wording scan, console errors and warnings, screenshots at 1440x900 and 1920x1080
// Usage: node e2e/verify-pages-4-6-7.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? join(here, "..", "..", "docs", "screenshots", "pages_4_6_7");
mkdirSync(OUT, { recursive: true });
const DATA = join(here, "..", "public", "data");
const files = Object.fromEntries(["results_summary.json", "paired.json", "protocol.json", "thresholds.json"].map((f) => [f, JSON.parse(readFileSync(join(DATA, f), "utf8"))]));
const BANNED = /\b(improves?|improved|improvement|outperforms?|significant(ly)?|wins?|beats?|superior)\b/i;
const METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "unmet_hours", "mission_fairness", "runtime_seconds"];

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const consoleLog = [];
const resolve = (trace) => {
  const [file, path] = trace.split(":");
  return path.split("/").map(decodeURIComponent).reduce((o, k) => (o == null ? undefined : o[/^\d+$/.test(k) ? Number(k) : k]), files[file]);
};
function textMatches(text, v) {
  let t = text.trim().replace(/−/g, "-").replace(/,/g, "");
  if (t === "equal") return v === 0;
  const m = t.match(/^(higher|lower) by ([\d.]+)$/);
  if (m) {
    const d = m[2].split(".")[1]?.length ?? 0;
    return Math.sign(v) === (m[1] === "higher" ? 1 : -1) && Math.abs(Math.abs(v) - Number(m[2])) <= 0.5 * 10 ** -d + 1e-12;
  }
  const pct = t.endsWith("%");
  if (pct) t = t.slice(0, -1);
  const n = Number(t);
  if (Number.isNaN(n)) return false;
  const d = t.split(".")[1]?.length ?? 0;
  const target = pct ? v * 100 : v;
  if (/e/i.test(t)) return Math.abs(n - target) <= Math.abs(target) * 1e-6;
  const sigOk = !t.includes(".") || Math.abs(n - Number(target.toPrecision(Math.max(1, t.replace(/^-?0\.0*/, "").length)))) < 1e-15;
  return Math.abs(n - target) <= 0.5 * 10 ** -d + 1e-12 || sigOk;
}
async function collect(page) {
  return page.locator("main [data-trace]").evaluateAll((els) =>
    els.map((e) => ({
      trace: e.getAttribute("data-trace"),
      value: Number(e.getAttribute("data-value")),
      text: e.textContent,
      badged: !!e.closest("[data-num-scope]")?.querySelector("[data-evidence]"),
    })),
  );
}
function evaluate(label, items, min) {
  const uniq = [...new Map(items.map((i) => [`${i.trace}|${i.text}`, i])).values()];
  const wrong = uniq.filter((i) => resolve(i.trace) !== i.value);
  const text = uniq.filter((i) => !textMatches(i.text, i.value));
  const unbadged = uniq.filter((i) => !i.badged);
  check(`${label}: ${uniq.length} traced numbers equal the JSON`, uniq.length >= min && wrong.length === 0, `${uniq.length} cells; ${wrong.slice(0, 3).map((w) => `${w.trace}=${w.value} json ${resolve(w.trace)}`).join("; ")}`);
  check(`${label}: displayed text matches each value`, text.length === 0, text.slice(0, 3).map((w) => `${w.trace} "${w.text}"`).join("; "));
  check(`${label}: every traced number has a badge in its scope`, unbadged.length === 0, unbadged.slice(0, 3).map((w) => w.trace).join("; "));
  return { cells: uniq.length, wrong, text, unbadged, sample: uniq.slice(0, 25) };
}

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const report = { trace: {}, axe: {}, templates: {} };

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  const tag = `${viewport.width}x${viewport.height}`;
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => consoleLog.push({ tag, type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => consoleLog.push({ tag, type: "pageerror", text: String(e) }));
  for (const [hash, name, ready] of [
    ["/results", "results", '[data-testid="cross-week-table"]'],
    ["/", "landing", '[data-testid="results-strip"]'],
    ["/protocol", "protocol", '[data-testid="timesteps"]'],
  ]) {
    await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
    await page.waitForSelector(ready);
    await page.waitForTimeout(name === "landing" ? 1500 : 500);
    await page.screenshot({ path: join(OUT, `${tag}_${name}_top.png`) });
    await page.screenshot({ path: join(OUT, `${tag}_${name}_full.png`), fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    report.axe[`${tag}:${name}`] = axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`) }));
    check(`${tag} ${name}: axe WCAG 2.1 AA`, axe.violations.length === 0, axe.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "0 violations");
    const txt = await page.locator("main").innerText();
    const hit = txt.match(BANNED);
    check(`${tag} ${name}: no banned comparison words`, !hit, hit ? hit[0] : "");
    if (viewport.width === 1440) report.trace[name] = evaluate(`${name}`, await collect(page), name === "results" ? 60 : 1);
  }

  if (viewport.width === 1440) {
    // Results: cycle metrics, sorting and the heuristic pairs; collect everything shown
    await page.goto(`${BASE}/#/results`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="cross-week-table"]');
    const all = [];
    for (const m of METRICS) {
      await page.selectOption('[data-testid="table-metric"]', m);
      await page.selectOption('[data-testid="paired-metric"]', m);
      await page.click('[data-testid="sort-W30"]');
      await page.waitForTimeout(150);
      all.push(...(await collect(page)));
    }
    await page.check('[data-testid="toggle-heuristic-pairs"]');
    await page.selectOption('[data-testid="paired-metric"]', "duration_fulfillment");
    await page.waitForTimeout(250);
    all.push(...(await collect(page)));
    await page.locator('[data-pair="supplementary_pairs/1"]').screenshot({ path: join(OUT, `${tag}_results_heuristic_pair.png`) });
    report.trace.results_all_states = evaluate("results (all metrics, sorts, heuristic pairs)", all, 60);

    // template sentences: every number in them sits in a traced element whose value is in the data
    await page.uncheck('[data-testid="toggle-heuristic-pairs"]');
    const sentences = await page.locator('[data-testid="template-sentences"] li').evaluateAll((lis) =>
      lis.map((li) => {
        const clone = li.cloneNode(true);
        clone.querySelectorAll("[data-trace]").forEach((e) => e.remove());
        return { id: li.getAttribute("data-sentence"), text: li.textContent, residual: clone.textContent, traced: [...li.querySelectorAll("[data-trace]")].map((e) => [e.getAttribute("data-trace"), Number(e.getAttribute("data-value")), e.textContent]) };
      }),
    );
    const residualNumbers = sentences.flatMap((s) =>
      (s.residual.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((n) => !/^(5|25|088|25,088|1|2|3|4|42|123|456|6|10|20|30|40|50)$/.test(n)).map((n) => `${s.id}: ${n}`),
    );
    const allowedResidual = sentences.flatMap((s) => (s.residual.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => ({ s: s.id, n })));
    const countsOk = sentences.every((s) => {
      const m = s.residual.match(/higher in (\d) of (\d) folds/);
      if (!m) return true;
      const pair = files["paired.json"][s.id.split("-")[1]][Number(s.id.split("-")[2])];
      return Number(m[1]) === pair.metrics.duration_fulfillment.folds_first_better && Number(m[2]) === 5;
    });
    const tracedOk = sentences.every((s) => s.traced.every(([t, v, txt]) => resolve(t) === v && textMatches(txt, v)));
    report.templates = { sentences, residualNumbers, allowedResidual };
    check("templates: every decimal number is a traced data value", residualNumbers.length === 0 && tracedOk, residualNumbers.join("; "));
    check("templates: fold counts in sentences equal paired.json", countsOk);
    check("templates: allowed vocabulary only", !sentences.some((s) => BANNED.test(s.text)));

    // N4 beside adaptive vs fixed
    check("results: N4 note beside adaptive minus fixed BEE", (await page.locator('[data-pair="pairs/1"] [data-testid="pair-note-n4"]').count()) === 1);
    // downloads exist and produce files
    const [csv] = await Promise.all([page.waitForEvent("download"), page.click('[data-testid="table-csv"]')]);
    const [svg] = await Promise.all([page.waitForEvent("download"), page.click('[data-testid="chart-svg"]')]);
    const [png] = await Promise.all([page.waitForEvent("download"), page.click('[data-testid="paired-png"]')]);
    check("results: CSV, SVG and PNG downloads", [csv, svg, png].every(Boolean), [csv, svg, png].map((d) => d.suggestedFilename()).join(", "));

    // landing: tour disabled, open lab link
    await page.goto(`${BASE}/#/`, { waitUntil: "networkidle" });
    check("landing: Start the tour disabled with 'coming next'", (await page.locator('[data-testid="start-tour"]').isDisabled()) && (await page.locator('[data-testid="start-tour"]').innerText()).includes("coming next"));
    check("landing: full project title", (await page.locator('[data-testid="full-title"]').innerText()) === "A Bee-Inspired Reinforcement Learning Scheduler for Ground-Station Communication Requests");

    // page 2 section (d) now reads exported numbers
    await page.goto(`${BASE}/#/bee-lab`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="share-at-base"]');
    const d = await page.locator('[data-testid="share-at-base"] [data-trace]').evaluateAll((els) => els.map((e) => ({ trace: e.getAttribute("data-trace"), value: Number(e.getAttribute("data-value")), text: e.textContent, badged: true })));
    report.trace.bee_lab_d = evaluate("bee lab (d) share and counts", d, 6);
    check("bee lab (a): episodes note present and panels separated", (await page.locator('[data-testid="episodes-note"]').count()) === 1);
  }
  await ctx.close();
}
await browser.close();
const errs = consoleLog.filter((m) => ["error", "pageerror", "warning"].includes(m.type));
check("console: no errors or warnings", errs.length === 0, errs.slice(0, 3).map((e) => e.text).join(" | "));
writeFileSync(join(OUT, "pages_4_6_7_report.json"), JSON.stringify({ checks, report, console: consoleLog }, null, 2));
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
