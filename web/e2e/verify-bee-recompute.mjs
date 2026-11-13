import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3];
const thr = JSON.parse(readFileSync(join(here, "..", "public", "data", "thresholds.json"), "utf8"));
const TOL = 1e-6;
const PER_METHOD = 150;

let seed = 20181001;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const samples = [];
for (const method of ["adaptive_bee", "adaptive_a3_first_pass"]) {
  const pool = [];
  for (const tr of thr.traces.filter((t) => t.method === method))
    tr.rows.forEach((row, i) => pool.push({ method, run: `${tr.test_week} train ${tr.training_seed} eval ${tr.evaluation_seed}`, index: i, row: Object.fromEntries(tr.columns.map((c, k) => [c, row[k]])) }));
  const picked = new Set();
  while (picked.size < PER_METHOD) picked.add(Math.floor(rand() * pool.length));
  for (const i of picked) samples.push(pool[i]);
  console.log(`${method}: sampled ${PER_METHOD} of ${pool.length} recorded rows`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e}`));
await page.goto(`${BASE}/#/bee-lab`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__beeMath && window.__beeParams);

const results = await page.evaluate((items) => {
  const m = window.__beeMath;
  const P = window.__beeParams.methods;
  return items.map((it) => m.recomputeTraceRow(it.method === "adaptive_bee" ? P.adaptive_A6 : P.adaptive_A3, it.row));
}, samples);

const FIELDS = ["stimulus", "contention_increase", "relative_unmet_pressure", "pressure_count", "adaptation_enabled", "threshold", "activation"];
const maxDiff = Object.fromEntries(FIELDS.map((f) => [f, 0]));
const mismatches = [];
samples.forEach((s, i) => {
  for (const f of FIELDS) {
    const rec = s.row[f];
    const got = results[i][f];
    const d = typeof rec === "boolean" ? (rec === got ? 0 : 1) : Math.abs(got - rec);
    maxDiff[f] = Math.max(maxDiff[f], d);
    if (!(d < TOL)) mismatches.push({ method: s.method, run: s.run, row: s.index, field: f, recorded: rec, recomputed: got, diff: d });
  }
});

const ui = [];
for (const [method, run, step] of [
  ["adaptive_bee", "3", 57],
  ["adaptive_a3_first_pass", "10", 120],
]) {
  await page.selectOption('[data-testid="rp-method"]', method);
  await page.selectOption('[data-testid="rp-run"]', run);
  await page.locator('[data-testid="rp-step"]').evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, step);
  await page.click('[data-testid="rp-recompute"]');
  const d = Number(await page.locator('[data-testid="rp-result"]').getAttribute("data-maxdiff"));
  ui.push({ method, run, step, maxDiff: d, pass: d < TOL });
}
await browser.close();

const report = {
  sampled_rows: samples.length,
  per_method: PER_METHOD,
  tolerance: TOL,
  max_abs_difference: maxDiff,
  mismatches,
  ui_button_checks: ui,
  not_recomputable: {
    placement_scarcity: "needs the candidate placement counts at that step and when the request was first seen (environment state, not in the trace)",
    resource_contention: "needs the set of valid requests and their candidate antennas at that step (not in the trace)",
    mission_unmet_ratio: "needs seconds allocated and requested per mission at that step (not in the trace)",
    initial_contention: "contention when the request was first seen in the episode (not in the trace)",
    mean_mission_unmet: "mean over all missions at that step (not in the trace)",
  },
  console: logs,
};
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log("max |difference| per field:", JSON.stringify(maxDiff));
console.log(`mismatches above ${TOL}: ${mismatches.length}`);
for (const m of mismatches.slice(0, 20)) console.log("  ", JSON.stringify(m));
console.log("on-page Recompute button:", JSON.stringify(ui));
console.log("console:", logs.length ? logs.join(" | ") : "none");
const ok = mismatches.length === 0 && ui.every((u) => u.pass) && logs.length === 0 && samples.length >= 200;
console.log(ok ? `PASS: ${samples.length} rows agree within ${TOL}` : "FAIL");
process.exit(ok ? 0 : 1);
