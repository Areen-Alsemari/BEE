import * as d3 from "d3";
import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { loadGaps, loadPaired, loadSummary, useData } from "../../data/loaders";
import { Ready } from "../../components/States";
import { ConfirmMarker, EvidenceBadge } from "../../components/EvidenceBadge";
import { MethodGlyph } from "../../components/MethodGlyph";
import { Num } from "../../components/Num";
import { BRAND, HEURISTIC_RULES, METHOD_CUES, seriesColor, type HeuristicRule, type MarkerShape, type MethodId } from "../../config/theme";
import { METRIC_LABEL, methodLabel } from "../../lib/format";
import { downloadCsv, downloadPng, downloadSvg, tracePath } from "../../lib/download";
import { WEEKS, type GapsFile, type Pair, type PairedFile, type SummaryFile, type WeekId } from "../../data/types";

const METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "unmet_hours", "mission_fairness", "runtime_seconds"] as const;
type Metric = (typeof METRICS)[number];
const LOWER_BETTER = new Set<Metric>(["unmet_hours", "runtime_seconds"]);
const fmtM = (m: Metric) => (x: number) => (m === "unmet_hours" || m === "runtime_seconds" ? x.toFixed(1) : x.toFixed(4));
const fmtD = (m: Metric) => (x: number) => {
  const d = m === "unmet_hours" || m === "runtime_seconds" ? 1 : 4;
  return x > 0 ? `+${x.toFixed(d)}` : x < 0 ? `−${Math.abs(x).toFixed(d)}` : (0).toFixed(d);
};
const words = (m: Metric) => (x: number) => {
  const d = m === "unmet_hours" || m === "runtime_seconds" ? 1 : 4;
  return x > 0 ? `higher by ${x.toFixed(d)}` : x < 0 ? `lower by ${Math.abs(x).toFixed(d)}` : "equal";
};

interface Series {
  sid: string;
  method: MethodId;
  rule?: HeuristicRule;
  label: string;
  secondary: boolean;
}
const SERIES: Series[] = [
  ...HEURISTIC_RULES.map((r) => ({ sid: `heuristics/${r}`, method: "heuristics" as MethodId, rule: r, label: methodLabel("heuristics", r), secondary: false })),
  { sid: "plain_ppo", method: "plain_ppo", label: "Plain PPO", secondary: false },
  { sid: "fixed_bee", method: "fixed_bee", label: "Fixed BEE (F2)", secondary: false },
  { sid: "adaptive_bee", method: "adaptive_bee", label: "Adaptive BEE (A6)", secondary: false },
  { sid: "adaptive_a3_first_pass", method: "adaptive_a3_first_pass", label: "First-pass A3 (secondary)", secondary: true },
];
const SER = Object.fromEntries(SERIES.map((s) => [s.sid, s]));
const PPO_SIDS = ["plain_ppo", "fixed_bee", "adaptive_bee"];
const S = "results_summary.json";
const P = "paired.json";

export default function ResultsArena() {
  const summary = useData(loadSummary, []);
  const paired = useData(loadPaired, []);
  const gaps = useData(loadGaps, []);
  return (
    <div className="mx-auto max-w-[1500px] px-6 pb-12 pt-5" data-testid="results-arena">
      <Ready items={[summary, paired, gaps]} what="results">
        {(s, p, g) => <Arena summary={s} paired={p} gaps={g} />}
      </Ready>
    </div>
  );
}

function Section({ id, title, kicker, right, children, scope }: { id: string; title: string; kicker?: ReactNode; right?: ReactNode; children: ReactNode; scope?: boolean }) {
  return (
    <section id={id} className="panel mt-5 p-5" aria-labelledby={`${id}-h`} data-num-scope={scope ? "" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="text-lg font-semibold text-brand">
          {title}
        </h2>
        {right}
      </div>
      {kicker && <div className="mt-1 max-w-5xl text-sm text-fg-2">{kicker}</div>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricPicker({ value, onChange, testId }: { value: Metric; onChange: (m: Metric) => void; testId: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      Metric
      <select className="ctl" value={value} onChange={(e) => onChange(e.target.value as Metric)} data-testid={testId}>
        {METRICS.map((m) => (
          <option key={m} value={m}>
            {METRIC_LABEL[m]}
          </option>
        ))}
      </select>
    </label>
  );
}

function rowBadge(s: Series) {
  if (s.method === "heuristics") return <EvidenceBadge kind="heuristic" />;
  if (s.secondary) return <EvidenceBadge kind="supplementary" label="secondary: first pass" />;
  return <EvidenceBadge kind="cross_week" />;
}

function confirmId(method: MethodId) {
  return method === "fixed_bee" ? "N1" : method === "plain_ppo" ? "N2" : method === "heuristics" ? "N3" : null;
}

function Arena({ summary, paired, gaps }: { summary: SummaryFile; paired: PairedFile; gaps: GapsFile }) {
  const gap = (id: string) => gaps.needs_confirmation.find((r) => (r.id ?? r["#"]) === id);
  const n4 = gap("N4");
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand">Results Arena</h1>
        <p className="mt-1 max-w-5xl text-fg-2">
          Cross-week results for every method: five test weeks (folds), averaged over evaluation seeds, then training seeds, then folds. Every number is read from
          the exported result files.
        </p>
      </header>
      <CrossWeekTable summary={summary} paired={paired} gap={gap} />
      <WeekChart summary={summary} paired={paired} />
      <PairedPanel paired={paired} n4={n4} />
      <WhatTheyShow summary={summary} paired={paired} n4={n4} />
    </>
  );
}

// ------------------------------------------------------------------ (a) table
function CrossWeekTable({ summary, paired, gap }: { summary: SummaryFile; paired: PairedFile; gap: (id: string) => Record<string, string> | undefined }) {
  const [metric, setMetric] = useState<Metric>("duration_fulfillment");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "overall", dir: -1 });
  const valueOf = (s: Series, key: string) => {
    const ser = summary.series[s.sid];
    if (key === "overall") return ser.overall.mean[metric]!;
    if (key === "fold_sd") return ser.overall.fold_sd[metric]!;
    if (key === "w50_sd") return paired.w50_seed_spread_by_metric[s.sid].metrics[metric].sd;
    if (key === "label") return s.label;
    return ser.per_week[key as WeekId].mean[metric]!;
  };
  const rows = [...SERIES].sort((a, b) => {
    const va = valueOf(a, sort.key);
    const vb = valueOf(b, sort.key);
    return (typeof va === "string" ? String(va).localeCompare(String(vb)) : (va as number) - (vb as number)) * sort.dir;
  });
  const best = [...SERIES].sort((a, b) => (valueOf(b, "overall") as number) - (valueOf(a, "overall") as number))[LOWER_BETTER.has(metric) ? SERIES.length - 1 : 0];
  const cols: { key: string; label: string }[] = [...WEEKS.map((w) => ({ key: w, label: w })), { key: "overall", label: "Overall" }, { key: "fold_sd", label: "Fold SD" }, { key: "w50_sd", label: "W50 seed SD" }];
  const supp = summary.supplementary.fixed_bee_all_training_seeds;
  const csv = () =>
    downloadCsv(
      `cross_week_${metric}.csv`,
      ["method", ...cols.map((c) => c.key), "evidence"],
      SERIES.map((s) => [s.label, ...cols.map((c) => valueOf(s, c.key)), s.method === "heuristics" ? "heuristic (no training)" : s.secondary ? "secondary: first pass" : "full cross-week (25,088)"]),
    );
  return (
    <Section
      id="table"
      title="Cross-week table"
      kicker={
        <>
          Mean of {METRIC_LABEL[metric].toLowerCase()} per test week, the overall mean over the five folds, the SD across folds, and the SD across W50 seeds (training
          seeds for the PPO-based methods, evaluation seeds for heuristics) as the comparison scale. {LOWER_BETTER.has(metric) ? "Lower is better for this metric." : "Higher is better for this metric."}{" "}
          Click a column header to sort.
        </>
      }
      right={
        <div className="flex items-center gap-2">
          <MetricPicker value={metric} onChange={setMetric} testId="table-metric" />
          <button className="btn" onClick={csv} data-testid="table-csv">
            Download CSV
          </button>
        </div>
      }
    >
      <p className="mb-3 rounded-md bg-brand-tint px-3 py-2 text-sm" data-testid="table-shows" data-num-scope>
        <strong>What the table shows:</strong> for {METRIC_LABEL[metric].toLowerCase()},{" "}
        <span className="inline-flex items-center gap-1 align-middle">
          <MethodGlyph method={best.method} rule={best.rule} />
          {best.label}
        </span>{" "}
        has the{" "}
        {LOWER_BETTER.has(metric) ? "lowest" : "highest"} overall value (
        <Num v={valueOf(best, "overall") as number} trace={tracePath(S, "series", best.sid, "overall", "mean", metric)} format={fmtM(metric)} />
        ). <EvidenceBadge kind={best.method === "heuristics" ? "heuristic" : "cross_week"} />
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm" data-testid="cross-week-table">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <th className="py-2 text-left">
                <button className="font-semibold uppercase" onClick={() => setSort({ key: "label", dir: sort.key === "label" ? ((-sort.dir) as 1 | -1) : 1 })}>
                  Method
                </button>
              </th>
              {cols.map((c) => (
                <th key={c.key} className="px-2 text-right" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button className="font-semibold uppercase" onClick={() => setSort({ key: c.key, dir: sort.key === c.key ? ((-sort.dir) as 1 | -1) : -1 })} data-testid={`sort-${c.key}`}>
                    {c.label}
                    {sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
              <th className="px-2 text-left font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const cid = confirmId(s.method);
              const g = cid ? gap(cid) : undefined;
              return (
                <tr key={s.sid} className={`border-b border-line/60 ${s.sid === best.sid ? "bg-brand-tint/60" : ""}`} data-num-scope data-row={s.sid}>
                  <td className="py-1.5">
                    <span className="flex items-center gap-1.5">
                      <MethodGlyph method={s.method} rule={s.rule} />
                      <span className={s.secondary ? "italic" : ""}>{s.label}</span>
                      {g && <ConfirmMarker id={cid!} text={g["What needs confirming"]} />}
                    </span>
                  </td>
                  {WEEKS.map((w) => (
                    <td key={w} className="px-2 text-right">
                      <Num v={valueOf(s, w) as number} trace={tracePath(S, "series", s.sid, "per_week", w, "mean", metric)} format={fmtM(metric)} />
                    </td>
                  ))}
                  <td className="px-2 text-right font-semibold">
                    <Num v={valueOf(s, "overall") as number} trace={tracePath(S, "series", s.sid, "overall", "mean", metric)} format={fmtM(metric)} />
                  </td>
                  <td className="px-2 text-right text-fg-2">
                    <Num v={valueOf(s, "fold_sd") as number} trace={tracePath(S, "series", s.sid, "overall", "fold_sd", metric)} format={fmtM(metric)} />
                  </td>
                  <td className="px-2 text-right text-fg-2">
                    <Num v={valueOf(s, "w50_sd") as number} trace={tracePath(P, "w50_seed_spread_by_metric", s.sid, "metrics", metric, "sd")} format={fmtM(metric)} />
                  </td>
                  <td className="px-2">{rowBadge(s)}</td>
                </tr>
              );
            })}
            <tr className="text-fg-2" data-num-scope>
              <td className="py-1.5 italic">Fixed BEE, all training seeds on every fold</td>
              {WEEKS.map((w) => (
                <td key={w} className="px-2 text-right">
                  <Num v={supp.per_week[w].mean[metric]!} trace={tracePath(S, "supplementary", "fixed_bee_all_training_seeds", "per_week", w, "mean", metric)} format={fmtM(metric)} />
                </td>
              ))}
              <td className="px-2 text-right">
                <Num v={supp.overall.mean[metric]!} trace={tracePath(S, "supplementary", "fixed_bee_all_training_seeds", "overall", "mean", metric)} format={fmtM(metric)} />
              </td>
              <td className="px-2 text-right">
                <Num v={supp.overall.fold_sd[metric]!} trace={tracePath(S, "supplementary", "fixed_bee_all_training_seeds", "overall", "fold_sd", metric)} format={fmtM(metric)} />
              </td>
              <td />
              <td className="px-2">
                <EvidenceBadge kind="supplementary" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Protocol rows use training seed 42 on folds 1-4 and seeds 42, 123 and 456 on W50. The supplementary fixed BEE row uses all three seeds on every fold and is not
        part of the protocol comparison. First-pass A3 is shown for the A3 vs A6 comparison only.
      </p>
    </Section>
  );
}

// ------------------------------------------------------------------ (b) chart
function marker(shape: MarkerShape, x: number, y: number, r: number, color: string, key?: string) {
  const common = { key, stroke: color, strokeWidth: 1.6 };
  switch (shape) {
    case "square":
      return <rect {...common} x={x - r} y={y - r} width={2 * r} height={2 * r} fill={color} />;
    case "circle":
      return <circle {...common} cx={x} cy={y} r={r} fill={color} />;
    case "triangle":
      return <path {...common} d={`M${x},${y - r * 1.15} L${x + r * 1.1},${y + r * 0.9} L${x - r * 1.1},${y + r * 0.9} Z`} fill={color} />;
    case "diamond":
      return <path {...common} d={`M${x},${y - r * 1.25} L${x + r * 1.1},${y} L${x},${y + r * 1.25} L${x - r * 1.1},${y} Z`} fill={color} />;
    case "diamond-open":
      return <path {...common} d={`M${x},${y - r * 1.25} L${x + r * 1.1},${y} L${x},${y + r * 1.25} L${x - r * 1.1},${y} Z`} fill="#ffffff" />;
  }
}

function WeekChart({ summary, paired }: { summary: SummaryFile; paired: PairedFile }) {
  const [metric, setMetric] = useState<Metric>("duration_fulfillment");
  const [shown, setShown] = useState<Set<string>>(new Set(["heuristics/earliest_window_end", "heuristics/random_feasible", "plain_ppo", "fixed_bee", "adaptive_bee"]));
  const svgRef = useRef<SVGSVGElement>(null);
  const list = SERIES.filter((s) => shown.has(s.sid));
  const W = 1060;
  const H = 380;
  const m = { l: 64, r: 150, t: 20, b: 44 };
  const xs = [...WEEKS, "Overall"];
  const x0 = d3.scaleBand<string>().domain(xs).range([m.l, W - m.r]).padding(0.18);
  const x1 = d3.scaleBand<string>().domain(list.map((s) => s.sid)).range([0, x0.bandwidth()]).padding(0.25);
  const allVals = list.flatMap((s) => [
    ...WEEKS.map((w) => summary.series[s.sid].per_week[w].mean[metric]!),
    ...Object.values(paired.w50_seed_spread_by_metric[s.sid].metrics[metric].per_training_seed ?? paired.w50_seed_spread_by_metric[s.sid].metrics[metric].per_evaluation_seed ?? {}),
  ]);
  const ext = d3.extent(allVals) as [number, number];
  const pad = (ext[1] - ext[0]) * 0.08 || 0.01;
  const y = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).nice().range([H - m.b, m.t]);
  const cx = (w: string, sid: string) => x0(w)! + x1(sid)! + x1.bandwidth() / 2;
  return (
    <Section
      id="chart"
      title="By week, every fold visible"
      kicker={
        <>
          Each marker is one fold (test week) of one method, connected in the method&apos;s dash pattern. At W50 the thin whisker and small hollow markers show the
          spread across training seeds (evaluation seeds for heuristics): the reference scale for differences. The Overall column is the mean of the five folds.
        </>
      }
      right={
        <div className="flex flex-wrap items-center gap-2">
          <MetricPicker value={metric} onChange={setMetric} testId="chart-metric" />
          <button className="btn" onClick={() => downloadSvg(svgRef.current, `by_week_${metric}.svg`)} data-testid="chart-svg">
            SVG
          </button>
          <button className="btn" onClick={() => downloadPng(svgRef.current, `by_week_${metric}.png`)} data-testid="chart-png">
            PNG
          </button>
        </div>
      }
    >
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" role="group" aria-label="Methods shown">
        {SERIES.map((s) => (
          <label key={s.sid} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={shown.has(s.sid)}
              onChange={(e) => setShown((o) => (e.target.checked ? new Set([...o, s.sid]) : new Set([...o].filter((x) => x !== s.sid))))}
              data-testid={`chart-show-${s.sid}`}
            />
            <MethodGlyph method={s.method} rule={s.rule} />
            {s.label}
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} width={W} height={H} role="img" aria-label={`${METRIC_LABEL[metric]} by week and method`} data-testid="week-chart">
          {y.ticks(6).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e1e7f1" />
              <text x={m.l - 8} y={y(t) + 4} fontSize={12} textAnchor="end" fill="#4a5675">
                {fmtM(metric)(t)}
              </text>
            </g>
          ))}
          {xs.map((w) => (
            <text key={w} x={x0(w)! + x0.bandwidth() / 2} y={H - m.b + 20} fontSize={13} textAnchor="middle" fill="#2b3756" fontWeight={w === "Overall" ? 600 : 400}>
              {w}
            </text>
          ))}
          <line x1={x0("Overall")! - 8} x2={x0("Overall")! - 8} y1={m.t} y2={H - m.b} stroke="#cfd7e6" />
          <text x={16} y={(m.t + H - m.b) / 2} fontSize={12} fill="#2b3756" textAnchor="middle" transform={`rotate(-90 16 ${(m.t + H - m.b) / 2})`}>
            {METRIC_LABEL[metric]}
          </text>
          {list.map((s) => {
            const col = seriesColor(s.method, s.rule);
            const cue = METHOD_CUES[s.method];
            const pts = WEEKS.map((w) => [cx(w, s.sid), y(summary.series[s.sid].per_week[w].mean[metric]!)] as [number, number]);
            const sp = paired.w50_seed_spread_by_metric[s.sid].metrics[metric];
            const seeds = Object.values(sp.per_training_seed ?? sp.per_evaluation_seed ?? {});
            const w50x = cx("W50", s.sid);
            return (
              <g key={s.sid}>
                <path d={d3.line()(pts) ?? ""} fill="none" stroke={col} strokeWidth={1.8} strokeDasharray={cue.dash || undefined} opacity={0.9} />
                <line x1={w50x} x2={w50x} y1={y(d3.min(seeds)!)} y2={y(d3.max(seeds)!)} stroke={col} strokeWidth={1.2} />
                {seeds.map((v, i) => (
                  <circle key={i} cx={w50x + 7} cy={y(v)} r={2.6} fill="#ffffff" stroke={col} strokeWidth={1.2} />
                ))}
                {pts.map(([px, py], i) => marker(cue.shape, px, py, 5, col, `${s.sid}-${i}`))}
                {marker(cue.shape, cx("Overall", s.sid), y(summary.series[s.sid].overall.mean[metric]!), 6.5, col, `${s.sid}-o`)}
              </g>
            );
          })}
          {list.map((s, i) => (
            <g key={s.sid} transform={`translate(${W - m.r + 14},${m.t + 8 + i * 22})`}>
              {marker(METHOD_CUES[s.method].shape, 6, 0, 5, seriesColor(s.method, s.rule))}
              <text x={18} y={4} fontSize={12} fill="#0e1b3d">
                {s.label.replace("Heuristic: ", "")}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ (c) paired comparisons
function PairStrip({ pair, group, index, metric, n4 }: { pair: Pair; group: string; index: number; metric: Metric; n4?: Record<string, string> }) {
  const pm = pair.metrics[metric];
  const sc = pair.scale.metrics[metric];
  const W = 620;
  const H = 124;
  const m = { l: 16, r: 16, t: 12, b: 26 };
  const ext = Math.max(sc.band_half_width, ...pm.per_fold.map((f) => Math.abs(f.difference)), Math.abs(pm.bootstrap_95_interval[0]), Math.abs(pm.bootstrap_95_interval[1])) * 1.15;
  const x = d3.scaleLinear().domain([-ext, ext]).range([m.l, W - m.r]);
  const cy = 58;
  // stagger fold labels that would overlap
  const labelRow: number[] = [];
  [...pm.per_fold.keys()]
    .sort((i, j) => pm.per_fold[i].difference - pm.per_fold[j].difference)
    .reduce<number[]>((placed, i) => {
      const px = x(pm.per_fold[i].difference);
      let row = 0;
      while (placed.some((q, k) => labelRow[k] === row && Math.abs(q - px) < 26)) row++;
      labelRow[i] = row;
      placed[i] = px;
      return placed;
    }, []);
  const first = SER[pair.first];
  const second = SER[pair.second];
  const fcol = seriesColor(first.method, first.rule);
  const base = [P, group, index, "metrics", metric] as const;
  const isAF = new Set([pair.first, pair.second]).has("adaptive_bee") && new Set([pair.first, pair.second]).has("fixed_bee");
  const higherFolds = LOWER_BETTER.has(metric) ? pm.per_fold.length - pm.folds_first_better - pm.folds_equal : pm.folds_first_better;
  return (
    <div className="rounded-lg border border-line bg-sunken p-3" data-num-scope data-pair={`${group}/${index}`}>
      <div className="flex flex-wrap items-center gap-2">
        <MethodGlyph method={first.method} rule={first.rule} />
        <span className="font-semibold">{first.label}</span>
        <span className="text-muted">minus</span>
        <MethodGlyph method={second.method} rule={second.rule} />
        <span className="font-semibold">{second.label}</span>
        <EvidenceBadge kind={second.method === "heuristics" ? "heuristic" : "cross_week"} label={second.method === "heuristics" ? "compared on evaluation seeds only" : undefined} />
        {group === "supplementary_pairs" && second.method !== "heuristics" && <EvidenceBadge kind="supplementary" label="supplementary, suggestive" />}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 xl:grid-cols-[620px_minmax(0,1fr)]">
        <svg width={W} height={H} role="img" aria-label={`Per-fold differences, ${pair.label}`} className="max-w-full" data-pair-svg>
          <rect x={x(-sc.band_half_width)} width={x(sc.band_half_width) - x(-sc.band_half_width)} y={cy - 14} height={H - (cy - 14) - m.b} fill={BRAND.blue} opacity={0.1} />
          <line x1={x(0)} x2={x(0)} y1={m.t - 4} y2={H - m.b} stroke={BRAND.fg} />
          <line x1={x(pm.bootstrap_95_interval[0])} x2={x(pm.bootstrap_95_interval[1])} y1={cy + 24} y2={cy + 24} stroke={BRAND.fg} strokeWidth={2} />
          <line x1={x(pm.bootstrap_95_interval[0])} x2={x(pm.bootstrap_95_interval[0])} y1={cy + 19} y2={cy + 29} stroke={BRAND.fg} strokeWidth={2} />
          <line x1={x(pm.bootstrap_95_interval[1])} x2={x(pm.bootstrap_95_interval[1])} y1={cy + 19} y2={cy + 29} stroke={BRAND.fg} strokeWidth={2} />
          {pm.per_fold.map((f, i) => (
            <g key={f.fold}>
              {marker(METHOD_CUES[first.method].shape, x(f.difference), cy, 5, fcol)}
              <line x1={x(f.difference)} x2={x(f.difference)} y1={cy - 7} y2={m.t + 4 + labelRow[i] * 12} stroke="#b7bfd4" strokeWidth={0.8} />
              <text x={x(f.difference)} y={m.t + labelRow[i] * 12} fontSize={10} textAnchor="middle" fill="#2b3756">
                {f.test_week}
              </text>
            </g>
          ))}
          <line x1={x(pm.mean_difference)} x2={x(pm.mean_difference)} y1={m.t} y2={H - m.b} stroke={fcol} strokeWidth={2.5} strokeDasharray="5 2" />
          <text x={x(-ext) + 2} y={H - 8} fontSize={10} fill="#4a5675">
            {fmtD(metric)(-ext)}
          </text>
          <text x={x(0)} y={H - 8} fontSize={10} textAnchor="middle" fill="#4a5675">
            0
          </text>
          <text x={x(ext) - 2} y={H - 8} fontSize={10} textAnchor="end" fill="#4a5675">
            {fmtD(metric)(ext)}
          </text>
        </svg>
        <div className="text-sm">
          <div>
            Mean difference <Num v={pm.mean_difference} trace={tracePath(...base, "mean_difference")} format={words(metric)} className="font-semibold" />; first method higher in{" "}
            <span className="num font-semibold">{higherFolds}</span> of <span className="num">{pm.per_fold.length}</span> folds; per-fold range{" "}
            <Num v={pm.min_difference} trace={tracePath(...base, "min_difference")} format={fmtD(metric)} /> to{" "}
            <Num v={pm.max_difference} trace={tracePath(...base, "max_difference")} format={fmtD(metric)} />.
          </div>
          <div className="mt-1">
            Bootstrap interval <Num v={pm.bootstrap_95_interval[0]} trace={tracePath(...base, "bootstrap_95_interval", 0)} format={fmtD(metric)} /> to{" "}
            <Num v={pm.bootstrap_95_interval[1]} trace={tracePath(...base, "bootstrap_95_interval", 1)} format={fmtD(metric)} /> (n = 5 folds, indicative only).
          </div>
          <div className="mt-1 text-fg-2">
            Scale (shaded): ±<Num v={sc.band_half_width} trace={tracePath(P, group, index, "scale", "metrics", metric, "band_half_width")} format={fmtM(metric)} />, the larger W50
            seed SD of the two methods.
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            {pm.per_fold.map((f, i) => (
              <span key={f.fold}>
                {f.test_week} <Num v={f.difference} trace={tracePath(...base, "per_fold", i, "difference")} format={fmtD(metric)} />
              </span>
            ))}
          </div>
          {isAF && n4 && (
            <div className="mt-2 rounded-md border border-orange-300 bg-orange-50 px-2 py-1.5 text-xs text-orange-900" data-testid="pair-note-n4">
              <ConfirmMarker id="N4" text={n4["What needs confirming"]} /> Not an isolated effect of the threshold rule: fixed BEE and adaptive BEE also differ in
              stimulus weights, contention definition and activation details (awaiting owner confirmation).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PairedPanel({ paired, n4 }: { paired: PairedFile; n4?: Record<string, string> }) {
  const [metric, setMetric] = useState<Metric>("duration_fulfillment");
  const [heur, setHeur] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const a3 = paired.supplementary_pairs.findIndex((p) => p.first === "adaptive_bee" && p.second === "adaptive_a3_first_pass");
  const heurIdx = paired.supplementary_pairs.map((p, i) => [p, i] as const).filter(([p]) => p.second.startsWith("heuristics/"));
  const svgs = () => [...(wrap.current?.querySelectorAll<SVGSVGElement>("svg[data-pair-svg]") ?? [])];
  const combined = () => {
    const list = svgs();
    const ns = "http://www.w3.org/2000/svg";
    const out = document.createElementNS(ns, "svg") as SVGSVGElement;
    let yoff = 0;
    list.forEach((s) => {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("transform", `translate(0,${yoff})`);
      g.innerHTML = s.innerHTML;
      out.appendChild(g);
      yoff += s.getBoundingClientRect().height + 8;
    });
    out.setAttribute("width", "620");
    out.setAttribute("height", String(yoff));
    out.style.position = "absolute";
    out.style.left = "-9999px";
    document.body.appendChild(out);
    return out;
  };
  const dl = (kind: "svg" | "png") => {
    const s = combined();
    if (kind === "svg") downloadSvg(s, `paired_${metric}.svg`);
    else downloadPng(s, `paired_${metric}.png`);
    setTimeout(() => s.remove(), 1500);
  };
  const csv = () =>
    downloadCsv(
      `paired_${metric}.csv`,
      ["pair", "W10", "W20", "W30", "W40", "W50", "mean_difference", "folds_first_better", "min", "max", "bootstrap_low", "bootstrap_high", "band_half_width", "note"],
      [...paired.pairs, ...paired.supplementary_pairs].map((p) => {
        const pm = p.metrics[metric];
        return [p.label, ...pm.per_fold.map((f) => f.difference), pm.mean_difference, pm.folds_first_better, pm.min_difference, pm.max_difference, ...pm.bootstrap_95_interval, p.scale.metrics[metric].band_half_width, "n = 5 folds, indicative only"];
      }),
    );
  return (
    <Section
      id="paired"
      title="Paired comparisons"
      kicker={
        <>
          Per-fold differences (first method minus second), after averaging over evaluation seeds and then training seeds; folds 1-4 use training seed 42 and W50 uses
          42, 123 and 456. Dots: the five folds. Dashed line: mean. Black bar: bootstrap interval over folds (n = 5 folds, indicative only). Shaded band: the W50 seed
          spread, for scale. {LOWER_BETTER.has(metric) ? "For this metric lower is better." : ""}
        </>
      }
      right={
        <div className="flex flex-wrap items-center gap-2">
          <MetricPicker value={metric} onChange={setMetric} testId="paired-metric" />
          <button className="btn" onClick={csv} data-testid="paired-csv">
            CSV
          </button>
          <button className="btn" onClick={() => dl("svg")} data-testid="paired-svg">
            SVG
          </button>
          <button className="btn" onClick={() => dl("png")} data-testid="paired-png">
            PNG
          </button>
        </div>
      }
    >
      <div ref={wrap} className="space-y-3">
        {paired.pairs.map((p, i) => (
          <PairStrip key={i} pair={p} group="pairs" index={i} metric={metric} n4={n4} />
        ))}
        <PairStrip pair={paired.supplementary_pairs[a3]} group="supplementary_pairs" index={a3} metric={metric} />
        <label className="flex cursor-pointer items-center gap-2 pt-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={heur} onChange={(e) => setHeur(e.target.checked)} data-testid="toggle-heuristic-pairs" />
          Show PPO-based methods minus each heuristic rule (supplementary; compared on evaluation seeds only)
        </label>
        {heur &&
          heurIdx.map(([p, i]) => (
            <Fragment key={i}>
              <PairStrip pair={p} group="supplementary_pairs" index={i} metric={metric} />
            </Fragment>
          ))}
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ (d) what the results show (templates)
function WhatTheyShow({ summary, paired, n4 }: { summary: SummaryFile; paired: PairedFile; n4?: Record<string, string> }) {
  const m: Metric = "duration_fulfillment";
  const sentences = useMemo(() => {
    const out: { id: string; node: ReactNode }[] = [];
    const overall = (sid: string) => summary.series[sid].overall.mean[m]!;
    const ranked = [...SERIES].filter((s) => !s.secondary).sort((a, b) => overall(b.sid) - overall(a.sid));
    const top = ranked[0];
    const ov = (sid: string) => <Num v={overall(sid)} trace={tracePath(S, "series", sid, "overall", "mean", m)} format={fmtM(m)} className="font-semibold" />;
    const sd = (sid: string) => <Num v={paired.w50_seed_spread_by_metric[sid].metrics[m].sd} trace={tracePath(P, "w50_seed_spread_by_metric", sid, "metrics", m, "sd")} format={fmtM(m)} />;
    const ppoBelowTop = PPO_SIDS.every((sid) => overall(sid) < overall(top.sid));
    out.push({
      id: "heuristic",
      node: (
        <>
          Overall duration fulfillment is highest for {top.label} ({ov(top.sid)}){ppoBelowTop ? ", higher than each of the three PPO-based methods" : ""}.
        </>
      ),
    });
    const ppoSorted = [...PPO_SIDS].sort((a, b) => overall(a) - overall(b));
    out.push({
      id: "ppo",
      node: (
        <>
          The three PPO-based methods have overall duration fulfillment {ppoSorted.map((sid, i) => (
            <Fragment key={sid}>
              {i ? (i === ppoSorted.length - 1 ? " and " : ", ") : ""}
              {SER[sid].label} {ov(sid)}
            </Fragment>
          ))}
          ; their W50 seed SDs are {PPO_SIDS.map((sid, i) => (
            <Fragment key={sid}>
              {i ? (i === PPO_SIDS.length - 1 ? " and " : ", ") : ""}
              {sd(sid)}
            </Fragment>
          ))}{" "}
          (n = 5 folds).
        </>
      ),
    });
    const rf = "heuristics/random_feasible";
    out.push({
      id: "random",
      node: (
        <>
          The random feasible rule has overall duration fulfillment {ov(rf)},{" "}
          {overall(rf) >= overall(ppoSorted[0]) && overall(rf) <= overall(ppoSorted[2])
            ? "between the lowest and highest of the three PPO-based methods"
            : Math.min(Math.abs(overall(rf) - overall(ppoSorted[0])), Math.abs(overall(rf) - overall(ppoSorted[2]))) <= Math.max(...PPO_SIDS.map((x) => paired.w50_seed_spread_by_metric[x].metrics[m].sd))
              ? "within the seed spread of the PPO-based methods"
              : overall(rf) > overall(ppoSorted[2])
                ? "higher than the PPO-based methods by more than their seed spread"
                : "lower than the PPO-based methods by more than their seed spread"}
          .
        </>
      ),
    });
    [...paired.pairs.map((p, i) => [p, "pairs", i] as const), [paired.supplementary_pairs[paired.supplementary_pairs.findIndex((p) => p.first === "adaptive_bee" && p.second === "adaptive_a3_first_pass")], "supplementary_pairs", paired.supplementary_pairs.findIndex((p) => p.first === "adaptive_bee" && p.second === "adaptive_a3_first_pass")] as const].forEach(([p, g, i]) => {
      const pm = p.metrics[m];
      const band = p.scale.metrics[m].band_half_width;
      const within = Math.abs(pm.mean_difference) <= band;
      out.push({
        id: `pair-${g}-${i}`,
        node: (
          <>
            {SER[p.first].label} minus {SER[p.second].label}: mean difference <Num v={pm.mean_difference} trace={tracePath(P, g, i, "metrics", m, "mean_difference")} format={words(m)} />, first method higher in{" "}
            <span className="num">{pm.folds_first_better}</span> of <span className="num">{pm.per_fold.length}</span> folds;{" "}
            {within ? "within the W50 seed spread" : "larger than the W50 seed spread"} (±
            <Num v={band} trace={tracePath(P, g, i, "scale", "metrics", m, "band_half_width")} format={fmtM(m)} />, n = 5 folds).
            {g === "supplementary_pairs" ? " Suggestive only: one trained model per fold on folds 1-4." : ""}
          </>
        ),
      });
    });
    return out;
  }, [summary, paired]);
  return (
    <Section id="show" title="What these results show" kicker="Every sentence below is filled from results_summary.json and paired.json when the page loads; no number is typed in." scope>
      <div className="flex gap-1">
        <EvidenceBadge kind="cross_week" />
        <EvidenceBadge kind="heuristic" />
      </div>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm" data-testid="template-sentences">
        {sentences.map((s) => (
          <li key={s.id} data-sentence={s.id}>
            {s.node}
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-md border border-dashed border-line-strong bg-sunken px-3 py-2 text-sm" data-testid="hypothesis">
        <span className="mr-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold text-slate-800">hypothesis, not tested</span>
        Under the shared 25,088-step budget the PPO-based policies may not have trained long enough to separate from each other or from simple rules. The study did not
        test longer training.
      </div>
      <h3 className="mt-4 font-semibold text-fg">What this cannot show</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" data-testid="cannot-show">
        <li>No ranking among the PPO-based methods: their differences are of the size of the seed spread, with n = 5 folds.</li>
        <li>
          Adaptive minus fixed BEE is not an isolated effect of the threshold rule {n4 && <ConfirmMarker id="N4" text={n4["What needs confirming"]} />}: the two
          streams also differ in stimulus weights, contention definition and activation details.
        </li>
        <li>Seed coverage differs: one training seed on folds 1-4 and three on W50; heuristics have evaluation seeds only.</li>
      </ul>
    </Section>
  );
}
