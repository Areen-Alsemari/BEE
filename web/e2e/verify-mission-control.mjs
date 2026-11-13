import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:4173";
const OUT = process.argv[3] ?? join(here, "..", "..", "docs", "screenshots", "light_redesign", "latest");
const DATA = join(here, "..", "public", "data");
mkdirSync(OUT, { recursive: true });

const json = (p) => JSON.parse(readFileSync(join(DATA, p), "utf8"));
const runsFile = json("results_runs.json");
const runs = runsFile.rows.map((r) => Object.fromEntries(runsFile.columns.map((c, i) => [c, r[i]])));
const summary = json("results_summary.json");

const consoleLog = [];
const checks = [];
const rubric = {};
const check = (name, ok, detail, item) => {
  checks.push({ name, ok, detail, item });
  if (item) (rubric[item] ??= []).push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${item ? `[${item}] ` : ""}${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

async function openPage(viewport, hash = "/mission-control") {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const tag = `${viewport.width}x${viewport.height}`;
  page.on("console", (m) => consoleLog.push({ viewport: tag, type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => consoleLog.push({ viewport: tag, type: "pageerror", text: String(e) }));
  await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
  if (hash === "/mission-control") {
    await page.waitForSelector('[data-testid="scene-A"] canvas', { timeout: 30000 });
    await page.waitForSelector('[data-testid="metric-A-duration_fulfillment"]');
    await waitSettled(page, "scene-A");
  }
  return { ctx, page };
}

const dataValue = (page, sel) => page.locator(sel).first().getAttribute("data-value");
const sceneState = (page, id = "scene-A") => page.evaluate((k) => window.__beeScene?.[k], id);
async function waitSettled(page, id = "scene-A", ms = 8000) {
  const t0 = Date.now();
  await page.waitForTimeout(600);
  while (Date.now() - t0 < ms) {
    const s = await sceneState(page, id);
    if (s?.settled) return s;
    await page.waitForTimeout(200);
  }
  return sceneState(page, id);
}
async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  await waitSettled(page);
}
async function setTimeFraction(page, f) {
  await page.locator('[data-testid="scrubber"]').evaluate((el, frac) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, String(Number(el.min) + (Number(el.max) - Number(el.min)) * frac));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, f);
}
const overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0;
function labelsOk(state) {
  const vis = [...(state?.labels ?? []), ...(state?.spacecraftLabels ?? [])].filter((l) => l.visible);
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) if (overlaps(vis[i], vis[j])) return { ok: false, pair: [vis[i].id, vis[j].id] };
  return { ok: true, n: vis.length, complexes: (state?.labels ?? []).filter((l) => l.visible).map((l) => l.id) };
}

async function crossCheck(page, label, spec) {
  const row = runs.find(
    (r) => r.method === spec.method && r.variant === spec.variant && r.test_week === `${spec.week}_2018` && r.evaluation_seed === spec.eval && (spec.train === null ? r.training_seed === null : r.training_seed === spec.train),
  );
  const series = summary.series[spec.series];
  for (const m of ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "unmet_hours", "mission_fairness"]) {
    const shown = Number(await dataValue(page, `[data-testid="metric-A-${m}"] [data-metric]`));
    check(`${label}: ${m} equals results_runs.json`, shown === row[m], `${shown} vs ${row[m]}`, "i");
    const ctxText = await page.locator(`[data-testid="metric-A-${m}"]`).first().textContent();
    const fmt = (v) => (m === "unmet_hours" ? v.toFixed(1) : v.toFixed(4));
    check(`${label}: ${m} context = summary week + cross-week mean`, ctxText.includes(fmt(series.per_week[spec.week].mean[m])) && ctxText.includes(fmt(series.overall.mean[m])), "", "i");
  }
  check(`${label}: violations shown = 0`, Number(await dataValue(page, '[data-testid="violations-A"]')) === 0 && row.constraint_violations === 0, "", "i");
  const unsched = Number(await dataValue(page, '[data-testid="unscheduled-count-A"]'));
  const listCount = Number(await dataValue(page, '[data-testid="unscheduled-list-count-A"]'));
  const derived = row.number_of_requests - row.scheduled_requests;
  check(`${label}: unscheduled count = derived`, unsched === derived && listCount === derived, `${unsched} / list ${listCount} vs ${derived}`, "i");
}

const report = { axe: {}, darkSurfaces: {}, presets: {}, beams: [], colourBlind: {} };

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  const tag = `${viewport.width}x${viewport.height}`;
  const { ctx, page } = await openPage(viewport);
  const s0 = await sceneState(page);
  await page.screenshot({ path: join(OUT, `${tag}_01_default_W40.png`) });
  check(`${tag}: Earth diameter is 35-45% of the scene's shorter side`, s0.earthFraction >= 0.35 && s0.earthFraction <= 0.45, s0.earthFraction.toFixed(3), "a");
  const sceneBox = await page.locator('[data-testid="scene-A"]').boundingBox();
  check(`${tag}: scene height is 55-60% of viewport`, sceneBox.height / viewport.height >= 0.54 && sceneBox.height / viewport.height <= 0.61, (sceneBox.height / viewport.height).toFixed(3), "layout");
  const lab0 = labelsOk(s0);
  check(`${tag}: complex and spacecraft labels do not overlap (default view)`, lab0.ok, JSON.stringify(lab0), "b");
  check(`${tag}: at least 3 spacecraft variants present`, s0.variants.length >= 3, s0.variants.join(", "), "c");

  const logo = await page.locator('img[alt="BEE project logo"]').first().evaluate((img) => {
    const p = img.parentElement;
    const bg = getComputedStyle(img).backgroundColor;
    return { imgBg: bg, parentBg: getComputedStyle(p).backgroundColor, parentTag: p.tagName, src: img.getAttribute("src") };
  });
  check(`${tag}: logo shown directly (no badge background)`, /rgba\(0, 0, 0, 0\)|transparent/.test(logo.imgBg) && logo.src.endsWith("brand/bee-logo.png"), JSON.stringify(logo), "g");

  for (const p of ["goldstone", "canberra", "madrid", "follow", "system"]) {
    await page.click(`[data-testid="preset-${p}"]`);
    await page.waitForTimeout(2600);
    const st = await sceneState(page);
    const lab = labelsOk(st);
    report.presets[`${tag}:${p}`] = { mode: st.mode, earthFraction: st.earthFraction, labels: lab };
    check(`${tag}: preset ${p} applied`, st.mode === p, `mode ${st.mode}`, "e");
    check(`${tag}: preset ${p} labels do not overlap`, lab.ok, JSON.stringify(lab), "b");
    if (["goldstone", "canberra", "madrid"].includes(p)) check(`${tag}: preset ${p} shows its complex label`, lab.complexes?.includes(p), lab.complexes?.join(","), "e");
    await page.screenshot({ path: join(OUT, `${tag}_02_preset_${p}.png`) });
  }
  const back = await sceneState(page);
  check(`${tag}: returns to Whole system (Earth fraction restored)`, back.mode === "system" && Math.abs(back.earthFraction - s0.earthFraction) < 0.02, `${back.earthFraction.toFixed(3)} vs ${s0.earthFraction.toFixed(3)}`, "e");

  if (viewport.width === 1440) {
    for (const method of ["adaptive_bee", "plain_ppo"]) {
      await page.selectOption('[data-testid="a-method"]', method);
      for (const week of ["W10", "W30", "W50"]) {
        await page.click(`[data-testid="week-${week}"]`);
        await settle(page);
        for (const f of [0.31, 0.68]) {
          await setTimeFraction(page, f);
          const st = await waitSettled(page);
          const bad = st.beams.filter((b) => b.crossesEarth || b.fromRadius < 1.0 || b.fromRadius > 1.06 || Math.abs(b.dishDistance - 0.03) > 1e-6);
          const toR = st.beams.map((b) => Math.hypot(...b.to));
          report.beams.push({ method, week, f, t: st.t, n: st.beams.length, settled: st.settled, crossing: st.beams.filter((b) => b.crossesEarth).length });
          check(
            `${method} ${week} t=${f}: ${st.beams.length} beams straight from a dish, none crossing Earth`,
            st.settled && st.beams.length > 0 && bad.length === 0 && toR.every((r) => r >= 1.7 && r <= 2.7),
            `settled ${st.settled}, crossing ${st.beams.filter((b) => b.crossesEarth).length}, start radius ${Math.min(...st.beams.map((b) => b.fromRadius)).toFixed(3)}-${Math.max(...st.beams.map((b) => b.fromRadius)).toFixed(3)}`,
            "d",
          );
        }
      }
      await page.screenshot({ path: join(OUT, `${tag}_03_beams_${method}_W50.png`) });
    }
  }

  await page.click('[data-testid="week-W20"]');
  await page.selectOption('[data-testid="a-method"]', "plain_ppo");
  await page.selectOption('[data-testid="evaluation-seed"]', "3003");
  await settle(page);
  if (viewport.width === 1440) await crossCheck(page, "W20 plain PPO seed 42 eval 3003", { method: "plain_ppo", variant: "maskable_ppo", week: "W20", train: 42, eval: 3003, series: "plain_ppo" });
  const before = Number(await dataValue(page, '[data-testid="playhead"]'));
  const box = await page.locator('[data-testid="timeline"] svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.35, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + 10, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = Number(await dataValue(page, '[data-testid="playhead"]'));
  check(`${tag}: scrubbing moves the playhead and the scene clock`, after > before, `${before} -> ${after}`, "i");
  const bar = page.locator('[data-testid="timeline"] [data-request]').nth(5);
  const rid = await bar.getAttribute("data-request");
  await bar.click({ force: true });
  await page.waitForTimeout(300);
  check(`${tag}: clicking a timeline request opens its detail card`, (await page.locator('[data-testid="detail-card"]').textContent()).includes(rid), rid, "i");
  await page.click('[data-testid="detail-card"] button:has-text("Go to start")');
  await waitSettled(page);
  await page.screenshot({ path: join(OUT, `${tag}_04_selected_request.png`) });

  await page.click('[data-testid="week-W50"]');
  await page.selectOption('[data-testid="a-method"]', "heuristics");
  await page.selectOption('[data-testid="a-rule"]', "earliest_window_end");
  await page.selectOption('[data-testid="evaluation-seed"]', "1001");
  await settle(page);
  if (viewport.width === 1440) await crossCheck(page, "W50 earliest window-end eval 1001", { method: "heuristics", variant: "earliest_window_end", week: "W50", train: null, eval: 1001, series: "heuristics/earliest_window_end" });

  await page.click('[data-testid="week-W10"]');
  await page.selectOption('[data-testid="a-method"]', "fixed_bee");
  await settle(page);
  await page.selectOption('[data-testid="training-seed"]', "42");
  await page.selectOption('[data-testid="evaluation-seed"]', "5005");
  await settle(page);
  if (viewport.width === 1440) await crossCheck(page, "W10 fixed BEE seed 42 eval 5005", { method: "fixed_bee", variant: "F2", week: "W10", train: 42, eval: 5005, series: "fixed_bee" });

  await page.click('[data-testid="week-W40"]');
  await page.selectOption('[data-testid="a-method"]', "adaptive_bee");
  await settle(page);
  await page.selectOption('[data-testid="training-seed"]', "42");
  await page.selectOption('[data-testid="evaluation-seed"]', "1001");
  await settle(page);
  const axe1 = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  report.axe[`${tag}:single`] = axe1.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.failureSummary?.split("\n").slice(0, 2).join(" ") + " :: " + n.target.join(" ")) }));
  check(`${tag}: axe (WCAG 2.1 AA) on single view`, axe1.violations.length === 0, axe1.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "0 violations", "g");

  await page.check('[data-testid="compare-toggle"]');
  await page.selectOption('[data-testid="b-method"]', "plain_ppo");
  await settle(page);
  await page.waitForSelector('[data-testid="scene-B"] canvas');
  await page.waitForSelector('[data-testid="compare-summary"]');
  await waitSettled(page, "scene-B");
  const onlyA = Number(await page.locator('[data-testid="only-a"]').textContent());
  const onlyB = Number(await page.locator('[data-testid="only-b"]').textContent());
  check(`${tag}: compare Only A / Only B = 46 / 45`, onlyA === 46 && onlyB === 45, `${onlyA}/${onlyB}`, "i");
  await setTimeFraction(page, 0.45);
  await waitSettled(page, "scene-A");
  await waitSettled(page, "scene-B");
  const sA = await sceneState(page, "scene-A");
  const sB = await sceneState(page, "scene-B");
  check(`${tag}: compare shows two scenes, Earth large in each`, !!sA && !!sB && sA.earthFraction >= 0.35 && sB.earthFraction >= 0.35, `${sA?.earthFraction.toFixed(3)} / ${sB?.earthFraction.toFixed(3)}`, "f");
  check(`${tag}: compare beams do not cross Earth`, [...sA.beams, ...sB.beams].every((b) => !b.crossesEarth), `${sA.beams.length}+${sB.beams.length} beams`, "d");
  await page.screenshot({ path: join(OUT, `${tag}_05_compare_W40_A6_vs_plainppo.png`) });
  await page.click('[data-testid="preset-madrid"]');
  await page.waitForTimeout(2600);
  const mA = await sceneState(page, "scene-A");
  const mB = await sceneState(page, "scene-B");
  check(`${tag}: compare scenes share presets (Madrid)`, mA.mode === "madrid" && mB.mode === "madrid", `${mA.mode}/${mB.mode}`, "f");
  check(`${tag}: compare labels do not overlap`, labelsOk(mA).ok && labelsOk(mB).ok, "", "b");
  await page.screenshot({ path: join(OUT, `${tag}_06_compare_preset_madrid.png`) });
  await page.click('[data-testid="preset-system"]');
  await page.waitForTimeout(2200);
  const axe2 = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  report.axe[`${tag}:compare`] = axe2.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
  check(`${tag}: axe (WCAG 2.1 AA) on compare view`, axe2.violations.length === 0, axe2.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "0 violations", "g");

  const dark = await page.evaluate(() => {
    const lum = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return 1;
      const [r, g, b, a = 1] = m[1].split(",").map(Number);
      if (a < 0.5) return 1;
      const f = (x) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 14) continue;
      const L = lum(cs.backgroundColor);
      if (L < 0.2 && !el.classList.contains("btn-on") && !(el.tagName === "A" && el.getAttribute("aria-current") === "page")) out.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 60), bg: cs.backgroundColor, w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
  report.darkSurfaces[tag] = dark;
  check(`${tag}: no dark surfaces (brand primary buttons and active nav excluded)`, dark.length === 0, dark.slice(0, 4).map((d) => `${d.tag}.${d.cls} ${d.bg}`).join(" | ") || "none", "g");

  if (viewport.width === 1440) {
    const cdp = await ctx.newCDPSession(page);
    for (const type of ["deuteranopia", "protanopia", "tritanopia", "achromatopsia"]) {
      await cdp.send("Emulation.setEmulatedVisionDeficiency", { type });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT, `${tag}_07_colourblind_${type}_compare.png`) });
    }
    await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "none" });
    await page.click("text=Help");
    await page.waitForTimeout(500);
    for (const type of ["none", "deuteranopia", "protanopia", "tritanopia"]) {
      await cdp.send("Emulation.setEmulatedVisionDeficiency", { type });
      await page.waitForTimeout(300);
      await page.locator('#how-to-read section:has(h3:has-text("Method colours"))').screenshot({ path: join(OUT, `${tag}_08_legend_${type}.png`) });
    }
    await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "none" });
    const shapes = await page.locator("#how-to-read li svg[data-shape]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-shape")))]);
    check(`${tag}: each method has a distinct marker shape in the legend`, shapes.length >= 4, shapes.join(", "), "h");
    await page.click('#how-to-read button:has-text("Close")');
  }
  await page.uncheck('[data-testid="compare-toggle"]');
  await page.screenshot({ path: join(OUT, `${tag}_09_full_page.png`), fullPage: true });
  await ctx.close();
}

for (const hash of ["/", "/results"]) {
  const { ctx, page } = await openPage({ width: 1440, height: 900 }, hash);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `1440x900_10_page${hash.replace("/", "_") || "_home"}.png`) });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  report.axe[`page${hash}`] = axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
  check(`page ${hash}: axe`, axe.violations.length === 0, axe.violations.map((v) => `${v.id}:${v.nodes.length}`).join(", ") || "0 violations", "g");
  await ctx.close();
}

await browser.close();

const PALETTE = { heuristics: "#2f2f2f", plain_ppo: "#b84e00", fixed_bee: "#00805c", adaptive_bee: "#a23f9c" };
const M = {
  none: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function lab(rgb) {
  const [r, g, b] = rgb.map(toLin);
  let X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
for (const [type, m] of Object.entries(M)) {
  const sim = Object.fromEntries(
    Object.entries(PALETTE).map(([k, hex]) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map(toLin);
      const o = [0, 1, 2].map((i) => m[i * 3] * c[0] + m[i * 3 + 1] * c[1] + m[i * 3 + 2] * c[2]).map((v) => Math.min(1, Math.max(0, toSrgb(v))));
      return [k, lab(o)];
    }),
  );
  const keys = Object.keys(sim);
  let min = Infinity;
  let pair = "";
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const d = Math.hypot(...sim[keys[i]].map((v, k) => v - sim[keys[j]][k]));
      if (d < min) [min, pair] = [d, `${keys[i]}~${keys[j]}`];
    }
  report.colourBlind[type] = { minDeltaE: Number(min.toFixed(1)), closestPair: pair };
  check(`method palette distinguishable under ${type}`, min >= 10, `min deltaE76 ${min.toFixed(1)} (${pair}); shapes and dash patterns also differ`, "h");
}

const errors = consoleLog.filter((m) => m.type === "error" || m.type === "pageerror");
const warnings = consoleLog.filter((m) => m.type === "warning");
check("console: no errors or warnings", errors.length + warnings.length === 0, `${errors.length} errors, ${warnings.length} warnings`, "j");
writeFileSync(join(OUT, "verify_report.json"), JSON.stringify({ checks, rubric, report, console: consoleLog }, null, 2));
for (const m of [...errors, ...warnings]) console.log(`  [${m.viewport}] ${m.type}: ${m.text.slice(0, 300)}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
for (const [k, v] of Object.entries(rubric).sort()) console.log(`rubric ${k}: ${v.every((x) => x.ok) ? "pass" : "FAIL"} (${v.filter((x) => x.ok).length}/${v.length})`);
process.exit(failed.length ? 1 : 0);
