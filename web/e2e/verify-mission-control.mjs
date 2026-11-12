// Playwright check of the Mission Control page.
// Usage: node e2e/verify-mission-control.mjs [baseUrl] [outDir]
// Loads the page, switches week/method/seeds, enables compare mode, scrubs the timeline,
// takes screenshots at 1440x900 and 1920x1080, records console output, and checks that the
// numbers on screen equal the exported JSON.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? join(here, "..", "..", "docs", "screenshots");
const DATA = join(here, "..", "public", "data");
mkdirSync(OUT, { recursive: true });

const json = (p) => JSON.parse(readFileSync(join(DATA, p), "utf8"));
const runsFile = json("results_runs.json");
const runs = runsFile.rows.map((r) => Object.fromEntries(runsFile.columns.map((c, i) => [c, r[i]])));
const summary = json("results_summary.json");

const consoleLog = [];
const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

async function openPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => consoleLog.push({ viewport: `${viewport.width}x${viewport.height}`, type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => consoleLog.push({ viewport: `${viewport.width}x${viewport.height}`, type: "pageerror", text: String(e) }));
  await page.goto(`${BASE}/#/mission-control`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="scene-A"] canvas', { timeout: 30000 });
  await page.waitForSelector('[data-testid="metric-A-duration_fulfillment"]');
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const dataValue = (page, sel) => page.locator(sel).first().getAttribute("data-value");

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
}

async function crossCheck(page, label, spec) {
  const row = runs.find(
    (r) =>
      r.method === spec.method &&
      r.variant === spec.variant &&
      r.test_week === `${spec.week}_2018` &&
      r.evaluation_seed === spec.eval &&
      (spec.train === null ? r.training_seed === null : r.training_seed === spec.train),
  );
  const series = summary.series[spec.series];
  const out = { label, spec, values: {} };
  for (const m of ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "unmet_hours", "mission_fairness"]) {
    const shown = Number(await dataValue(page, `[data-testid="metric-A-${m}"] [data-metric]`));
    const text = (await page.locator(`[data-testid="metric-A-${m}"] [data-metric]`).first().textContent()).trim();
    const expected = row[m];
    out.values[m] = { shown, text, expected, summary_week_mean: series.per_week[spec.week].mean[m], summary_overall: series.overall.mean[m] };
    check(`${label}: ${m} equals results_runs.json`, shown === expected, `${shown} vs ${expected}; displayed "${text}"`);
    const ctxText = await page.locator(`[data-testid="metric-A-${m}"]`).first().textContent();
    const fmt = (v) => (m === "unmet_hours" ? v.toFixed(1) : v.toFixed(4));
    check(
      `${label}: ${m} context shows summary week mean and cross-week mean`,
      ctxText.includes(fmt(series.per_week[spec.week].mean[m])) && ctxText.includes(fmt(series.overall.mean[m])),
      `${fmt(series.per_week[spec.week].mean[m])} / ${fmt(series.overall.mean[m])}`,
    );
  }
  const viol = Number(await dataValue(page, '[data-testid="violations-A"]'));
  check(`${label}: violations shown = 0 and equal to data`, viol === 0 && row.constraint_violations === 0);
  const unsched = Number(await dataValue(page, '[data-testid="unscheduled-count-A"]'));
  const listCount = Number(await dataValue(page, '[data-testid="unscheduled-list-count-A"]'));
  const derived = row.number_of_requests - row.scheduled_requests;
  check(`${label}: unscheduled count equals derived (number_of_requests - scheduled_requests)`, unsched === derived && listCount === derived, `${unsched} / list ${listCount} vs ${derived}`);
  out.unscheduled = { shown: unsched, list: listCount, derived };
  return out;
}

const crossChecks = [];
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  const tag = `${viewport.width}x${viewport.height}`;
  const { ctx, page } = await openPage(viewport);
  await page.screenshot({ path: join(OUT, `mc_${tag}_1_default_W40_adaptive.png`) });

  // Week, method, evaluation seed.
  await page.click('[data-testid="week-W20"]');
  await page.selectOption('[data-testid="a-method"]', "plain_ppo");
  await page.selectOption('[data-testid="evaluation-seed"]', "3003");
  await settle(page);
  if (viewport.width === 1440) crossChecks.push(await crossCheck(page, "W20 plain PPO seed 42 eval 3003", { method: "plain_ppo", variant: "maskable_ppo", week: "W20", train: 42, eval: 3003, series: "plain_ppo" }));

  // Scrub: drag across the timeline, then use the slider.
  const before = Number(await dataValue(page, '[data-testid="playhead"]'));
  const box = await page.locator('[data-testid="timeline"] svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.35, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + 10, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = Number(await dataValue(page, '[data-testid="playhead"]'));
  const shownTime = await page.locator('[data-testid="current-time"]').textContent();
  const sceneLinks = Number(await dataValue(page, '[data-testid="active-links"]'));
  check(`${tag}: scrubbing moves the playhead and the scene clock`, after > before, `${before} -> ${after}; ${shownTime}; active links ${sceneLinks}`);
  await page.screenshot({ path: join(OUT, `mc_${tag}_2_W20_plainppo_eval3003_scrubbed.png`) });

  // Click a request bar: it should show in the detail card.
  const bar = page.locator('[data-testid="timeline"] [data-request]').nth(5);
  const rid = await bar.getAttribute("data-request");
  await bar.click({ force: true });
  await page.waitForTimeout(300);
  const detail = await page.locator('[data-testid="detail-card"] h2').textContent();
  check(`${tag}: clicking a timeline request opens its detail card`, detail.includes(rid), `${rid}`);
  await page.click('[data-testid="detail-card"] button:has-text("Jump to start")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `mc_${tag}_3_selected_request.png`) });

  // Heuristic rule.
  await page.click('[data-testid="week-W50"]');
  await page.selectOption('[data-testid="a-method"]', "heuristics");
  await page.selectOption('[data-testid="a-rule"]', "earliest_window_end");
  await page.selectOption('[data-testid="evaluation-seed"]', "1001");
  await settle(page);
  if (viewport.width === 1440)
    crossChecks.push(
      await crossCheck(page, "W50 heuristic earliest window-end eval 1001", { method: "heuristics", variant: "earliest_window_end", week: "W50", train: null, eval: 1001, series: "heuristics/earliest_window_end" }),
    );
  await page.screenshot({ path: join(OUT, `mc_${tag}_4_W50_heuristic_ewe.png`) });

  // Fixed BEE (recomputed values) and training seed selector.
  await page.click('[data-testid="week-W10"]');
  await page.selectOption('[data-testid="a-method"]', "fixed_bee");
  await settle(page);
  await page.selectOption('[data-testid="training-seed"]', "42");
  await page.selectOption('[data-testid="evaluation-seed"]', "5005");
  await settle(page);
  if (viewport.width === 1440) crossChecks.push(await crossCheck(page, "W10 fixed BEE seed 42 eval 5005", { method: "fixed_bee", variant: "F2", week: "W10", train: 42, eval: 5005, series: "fixed_bee" }));
  const seedOpts = await page.locator('[data-testid="training-seed"] option').allTextContents();
  check(`${tag}: fixed BEE W10 training-seed options`, seedOpts.length === 3, seedOpts.join(" | "));
  await page.selectOption('[data-testid="training-seed"]', "123");
  await settle(page);
  const badges = await page.locator('[data-testid="metrics-A"] [data-evidence]').evaluateAll((els) => els.map((e) => e.getAttribute("data-evidence")));
  check(`${tag}: supplementary seed shows recomputed + supplementary badges`, badges.includes("recomputed") && badges.includes("supplementary"), badges.join(","));
  await page.screenshot({ path: join(OUT, `mc_${tag}_5_W10_fixed_seed123_supplementary.png`) });

  // Compare mode on W40, A6 vs plain PPO, seed 42 / 1001.
  await page.click('[data-testid="week-W40"]');
  await page.selectOption('[data-testid="a-method"]', "adaptive_bee");
  await settle(page);
  await page.selectOption('[data-testid="training-seed"]', "42");
  await page.selectOption('[data-testid="evaluation-seed"]', "1001");
  await page.check('[data-testid="compare-toggle"]');
  await page.selectOption('[data-testid="b-method"]', "plain_ppo");
  await settle(page);
  await page.waitForSelector('[data-testid="scene-B"] canvas');
  await page.waitForSelector('[data-testid="compare-summary"]');
  const onlyA = Number(await page.locator('[data-testid="only-a"]').textContent());
  const onlyB = Number(await page.locator('[data-testid="only-b"]').textContent());
  const sa = json("schedules/W40_adaptive_bee_A6_seed42_eval1001.json");
  const sb = json("schedules/W40_plain_ppo_maskable_ppo_seed42_eval1001.json");
  const ia = new Set(sa.rows.map((r) => r[0]));
  const ib = new Set(sb.rows.map((r) => r[0]));
  const expA = [...ia].filter((x) => !ib.has(x)).length;
  const expB = [...ib].filter((x) => !ia.has(x)).length;
  check(`${tag}: compare mode only-A / only-B counts equal schedule files`, onlyA === expA && onlyB === expB, `${onlyA}/${onlyB} vs ${expA}/${expB}`);
  await page.locator('[data-testid="scrubber"]').evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, String(Number(el.min) + (Number(el.max) - Number(el.min)) * 0.45));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `mc_${tag}_6_compare_W40_A6_vs_plainppo.png`) });

  await page.uncheck('[data-testid="compare-toggle"]');
  await page.click('[data-testid="play-toggle"]');
  await page.waitForTimeout(1500);
  await page.click('[data-testid="play-toggle"]');
  await ctx.close();
}

await browser.close();
const errors = consoleLog.filter((m) => m.type === "error" || m.type === "pageerror");
const warnings = consoleLog.filter((m) => m.type === "warning");
writeFileSync(join(OUT, "verify_report.json"), JSON.stringify({ checks, crossChecks, console: consoleLog }, null, 2));
console.log(`\nconsole: ${errors.length} errors, ${warnings.length} warnings, ${consoleLog.length} messages total`);
for (const m of [...errors, ...warnings]) console.log(`  [${m.viewport}] ${m.type}: ${m.text.slice(0, 300)}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length || errors.length ? 1 : 0);
