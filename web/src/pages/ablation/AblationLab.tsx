import * as d3 from "d3";
import { useMemo, useState, type ReactNode } from "react";
import { loadAblation, loadPaired, loadThresholds, useData, type Thresholds } from "../../data/loaders";
import { Ready } from "../../components/States";
import { EvidenceBadge, evidenceFromStage } from "../../components/EvidenceBadge";
import { Num, f2, f4, f6, signedWords } from "../../components/Num";
import { BRAND, METHOD_COLORS } from "../../config/theme";
import type { PairedFile } from "../../data/types";

type Stage = "screening" | "shortlist" | "confirmation";
const STAGES: Stage[] = ["screening", "shortlist", "confirmation"];
type Comp = { scarcity: boolean; contention: boolean; unmet: boolean; selective_gate: boolean; strength: string };
interface StageData {
  reached: boolean;
  badge: string;
  timesteps?: number;
  training_seeds?: number[];
  n_runs?: number;
  metrics?: Record<string, number>;
  delta_vs_A6?: Record<string, number>;
  delta_vs_A3?: Record<string, number>;
  mean_selected_threshold?: number;
  min_selected_threshold?: number;
}
interface Config {
  id: string;
  components_label: string;
  components: Comp;
  stages: Record<Stage, StageData>;
}
interface Ablation {
  references: { id: string; default: boolean; delta_key: string; label: string; supporting_data?: { mean_selected_threshold_by_stage: Record<Stage, number>; cross_week_mean_selected_threshold: number; base_threshold: number } }[];
  stage_badges: Record<string, string>;
  configurations: Config[];
  confirmation_tie: { badge: string; A3_duration_fulfillment: number; A6_duration_fulfillment: number; gap: number; larger_across_seed_sd: number; status: string; rule: string; selected: string; selection_reason: string };
  cross_week: { badge: string; A6: { duration_fulfillment: number }; A3_first_pass: { duration_fulfillment: number } };
  evidence_note: string;
  contention_note: string;
}

const METRICS: { k: string; label: string }[] = [
  { k: "duration_fulfillment", label: "Duration fulfillment" },
  { k: "minimum_satisfaction_rate", label: "Minimum satisfaction" },
  { k: "full_satisfaction_rate", label: "Full satisfaction" },
  { k: "mission_fairness", label: "Mission fairness" },
  { k: "fulfillment_std", label: "Fulfillment SD (across runs)" },
  { k: "runtime_seconds", label: "Runtime (s)" },
  { k: "constraint_violations", label: "Constraint violations" },
];
const COMPONENT_ROWS: { k: keyof Comp; label: string }[] = [
  { k: "scarcity", label: "Scarcity term" },
  { k: "contention", label: "Contention term" },
  { k: "unmet", label: "Unmet-demand term" },
  { k: "selective_gate", label: "Selective gate (2 of 3)" },
  { k: "strength", label: "Strength" },
];
const sig2 = (x: number) => String(Number(x.toPrecision(2)));
const fmtMetric = (k: string) => (k === "runtime_seconds" ? f2 : k === "constraint_violations" ? (x: number) => String(x) : f4);

export default function AblationLab() {
  const ab = useData(loadAblation, []);
  const paired = useData(loadPaired, []);
  const thr = useData(loadThresholds, []);
  return (
    <div className="mx-auto max-w-[1500px] px-6 pb-12 pt-5" data-testid="ablation-lab">
      <Ready items={[ab, paired, thr]} what="ablation data">
        {(a, p, t) => <AblationView ab={a as unknown as Ablation} paired={p} thr={t} />}
      </Ready>
    </div>
  );
}

function Section({ id, title, kicker, badge, children, scope }: { id: string; title: string; kicker?: string; badge?: ReactNode; children: ReactNode; scope?: boolean }) {
  return (
    <section id={id} className="panel mt-5 p-5" aria-labelledby={`${id}-h`} data-num-scope={scope ? "" : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`${id}-h`} className="text-lg font-semibold text-brand">
          {title}
        </h2>
        {badge}
      </div>
      {kicker && <p className="mt-1 max-w-4xl text-sm text-fg-2">{kicker}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StageBadge({ stage, ab }: { stage: Stage; ab: Ablation }) {
  return <EvidenceBadge kind={evidenceFromStage(ab.stage_badges[stage])} label={ab.stage_badges[stage]} />;
}

function AblationView({ ab, paired, thr }: { ab: Ablation; paired: PairedFile; thr: Thresholds }) {
  const [sel, setSel] = useState("A6");
  const [ref, setRef] = useState(ab.references.find((r) => r.default)?.id ?? "A6");
  const refInfo = ab.references.find((r) => r.id === ref)!;
  const cfgIndex = ab.configurations.findIndex((c) => c.id === sel);
  const cfg = ab.configurations[cfgIndex];
  const [toggles, setToggles] = useState<Comp>(cfg.components);
  const match = (c: Comp) => ab.configurations.find((x) => COMPONENT_ROWS.every((r) => x.components[r.k] === c[r.k]));
  const setToggle = (k: keyof Comp, v: boolean | string) => {
    const next = { ...toggles, [k]: v } as Comp;
    setToggles(next);
    const m = match(next);
    if (m) setSel(m.id);
  };
  const toggleMatch = match(toggles);
  const reachedCounts = Object.fromEntries(STAGES.map((s) => [s, ab.configurations.filter((c) => c.stages[s].reached).map((c) => c.id)]));
  const a6vsA3 = paired.supplementary_pairs.findIndex((p) => p.first === "adaptive_bee" && p.second === "adaptive_a3_first_pass");
  const pair = paired.supplementary_pairs[a6vsA3];
  const dm = pair.metrics.duration_fulfillment;
  const lowerFolds = dm.per_fold.length - dm.folds_first_better - dm.folds_equal;
  const P = `paired.json:supplementary_pairs/${a6vsA3}/metrics/duration_fulfillment`;
  const refIdx = ab.references.findIndex((r) => r.id === "A3");
  const a3ref = ab.references[refIdx];

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand">Ablation Lab</h1>
        <p className="mt-1 max-w-4xl text-fg-2">
          The adaptive-threshold configuration study (A1 to A6) on the W40 validation week, and exactly what its evidence can and cannot support.
        </p>
      </header>

      <section className="mt-4 rounded-xl border-2 border-warn-fg/40 bg-warn-bg p-5" data-testid="can-cannot" aria-labelledby="cc-h">
        <h2 id="cc-h" className="text-lg font-semibold text-fg">
          What this ablation can and cannot support
        </h2>
        <div className="mt-2 grid grid-cols-1 gap-4 text-sm text-fg lg:grid-cols-2">
          <div>
            <div className="font-semibold">It can support</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Which configurations were shortlisted and which reached confirmation, under the declared staged rule.</li>
              <li>That A3 and A6 were tied at confirmation, and that A6 was chosen by the declared W40-only tie-break.</li>
              <li>How each configuration&apos;s recorded thresholds behaved (for example, A3 stays near the base threshold).</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold">It cannot support</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Component-level conclusions. Most configurations were run only at screening budget: all six at {ab.stage_badges.screening}, only{" "}
                {reachedCounts.shortlist.join(", ")} at {ab.stage_badges.shortlist}, and only {reachedCounts.confirmation.join(" and ")} at{" "}
                {ab.stage_badges.confirmation}. No component-level conclusions are drawn.
              </li>
              <li>A comparison with &ldquo;no adaptation&rdquo;: no adaptation-off arm was run at a matched budget. A3 is a proxy only (see the reference toggle).</li>
              <li>Effects on other weeks: every stage used W40 only; the cross-week context below is a separate, suggestive comparison.</li>
            </ul>
          </div>
        </div>
        <p className="mt-2 text-xs text-fg-2">{ab.evidence_note}</p>
      </section>

      <Section
        id="matrix"
        title="Components and configurations"
        kicker="Component flags are read from ablation.json. Click a configuration column, or switch components on and off; combinations that were not run are marked as such."
      >
        <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Component toggles">
          {COMPONENT_ROWS.map((r) =>
            r.k === "strength" ? (
              <label key={r.k} className="flex items-center gap-2 text-sm">
                {r.label}
                <select className="ctl" value={toggles.strength} onChange={(e) => setToggle("strength", e.target.value)} data-testid="toggle-strength">
                  {[...new Set(ab.configurations.map((c) => c.components.strength))].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label key={r.k} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={toggles[r.k] as boolean} onChange={(e) => setToggle(r.k, e.target.checked)} data-testid={`toggle-${r.k}`} />
                {r.label}
              </label>
            ),
          )}
          <span className={`rounded-md px-2 py-1 text-sm ${toggleMatch ? "bg-ok-bg text-ok-fg" : "bg-danger-bg text-danger-fg"}`} data-testid="toggle-result">
            {toggleMatch ? `This combination is ${toggleMatch.id}` : "This combination was not run"}
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-sm" data-testid="matrix">
            <colgroup>
              <col className="w-[190px]" />
              {ab.configurations.map((c) => (
                <col key={c.id} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">Component</th>
                {ab.configurations.map((c) => (
                  <th key={c.id} className="px-1 py-2">
                    <button
                      type="button"
                      className={`btn w-full justify-center ${sel === c.id ? "btn-on" : ""}`}
                      onClick={() => {
                        setSel(c.id);
                        setToggles(c.components);
                      }}
                      aria-pressed={sel === c.id}
                      data-testid={`cfg-${c.id}`}
                    >
                      {c.id}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPONENT_ROWS.map((r) => (
                <tr key={r.k} className="border-b border-line/60">
                  <td className="py-1.5 text-fg-2">{r.label}</td>
                  {ab.configurations.map((c) => {
                    const v = c.components[r.k];
                    return (
                      <td key={c.id} className={`text-center ${sel === c.id ? "bg-brand-tint" : ""}`}>
                        {typeof v === "boolean" ? (v ? <span className="font-semibold text-ok-fg">on</span> : <span className="text-muted">off</span>) : <span>{v}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-b border-line/60">
                <td className="py-1.5 text-fg-2">Label in the results file</td>
                {ab.configurations.map((c) => (
                  <td key={c.id} className={`px-1 text-center text-xs text-muted ${sel === c.id ? "bg-brand-tint" : ""}`}>
                    {c.components_label}
                  </td>
                ))}
              </tr>
              {STAGES.map((s) => (
                <tr key={s} className="border-b border-line/60" data-num-scope>
                  <td className="py-1.5">
                    <div className="text-fg-2">Duration fulfillment</div>
                    <StageBadge stage={s} ab={ab} />
                  </td>
                  {ab.configurations.map((c, ci) => {
                    const st = c.stages[s];
                    return (
                      <td key={c.id} className={`text-center ${sel === c.id ? "bg-brand-tint" : ""}`}>
                        {st.reached ? (
                          <Num v={st.metrics!.duration_fulfillment} trace={`ablation.json:configurations/${ci}/stages/${s}/metrics/duration_fulfillment`} format={f4} />
                        ) : (
                          <span className="text-xs text-muted">not run</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="detail"
        title={`${cfg.id}: ${cfg.components_label}`}
        kicker="Metrics for each stage this configuration reached, with differences against the chosen reference at the same stage. All differences are read from ablation.json."
      >
        <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Reference">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Reference</span>
          {ab.references.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={ref === r.id} className={`btn ${ref === r.id ? "btn-on" : ""}`} onClick={() => setRef(r.id)} data-testid={`ref-${r.id}`}>
              {r.id}
            </button>
          ))}
          <span className="max-w-3xl text-sm text-fg-2" data-testid="ref-label">
            {refInfo.label}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STAGES.map((s) => {
            const st = cfg.stages[s];
            return (
              <div key={s} className="rounded-lg border border-line bg-sunken p-3" data-num-scope data-testid={`stage-${s}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize text-fg">{s}</span>
                  <StageBadge stage={s} ab={ab} />
                </div>
                {!st.reached ? (
                  <p className="mt-3 text-sm text-muted">{cfg.id} did not reach this stage.</p>
                ) : (
                  <>
                    <div className="mt-1 text-xs text-muted">
                      <Num v={st.n_runs!} trace={`ablation.json:configurations/${cfgIndex}/stages/${s}/n_runs`} format={String} /> runs, training seeds{" "}
                      {st.training_seeds!.map((t, i) => (
                        <span key={t}>
                          {i ? ", " : ""}
                          <Num v={t} trace={`ablation.json:configurations/${cfgIndex}/stages/${s}/training_seeds/${i}`} format={String} />
                        </span>
                      ))}
                      , <Num v={st.timesteps!} trace={`ablation.json:configurations/${cfgIndex}/stages/${s}/timesteps`} format={(x) => x.toLocaleString()} /> steps
                    </div>
                    <table className="mt-2 w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted">
                          <th className="font-semibold">Metric</th>
                          <th className="text-right font-semibold">Value</th>
                          <th className="text-right font-semibold">vs {ref}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {METRICS.map((m) => {
                          const delta = (st as unknown as Record<string, Record<string, number>>)[refInfo.delta_key]?.[m.k];
                          return (
                            <tr key={m.k} className="border-t border-line/60">
                              <td className="py-1 text-fg-2">{m.label}</td>
                              <td className="text-right">
                                <Num v={st.metrics![m.k]} trace={`ablation.json:configurations/${cfgIndex}/stages/${s}/metrics/${m.k}`} format={fmtMetric(m.k)} />
                              </td>
                              <td className="text-right text-xs">
                                {delta === undefined ? (
                                  <span className="text-muted">n/a</span>
                                ) : cfg.id === ref ? (
                                  <span className="text-muted">reference</span>
                                ) : (
                                  <Num v={delta} trace={`ablation.json:configurations/${cfgIndex}/stages/${s}/${refInfo.delta_key}/${m.k}`} format={signedWords(m.k === "runtime_seconds" ? 2 : 4)} />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Scale: fulfillment SD across runs is shown for each stage; differences between configurations smaller than that SD are within run-to-run spread. No significance is claimed.
        </p>
      </Section>

      <Section id="tie" title="A3 and A6 at confirmation" badge={<StageBadge stage="confirmation" ab={ab} />} scope>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" data-testid="tie">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs uppercase tracking-wider text-muted">A3 duration fulfillment</div>
              <Num v={ab.confirmation_tie.A3_duration_fulfillment} trace="ablation.json:confirmation_tie/A3_duration_fulfillment" format={f6} className="text-xl font-semibold" />
            </div>
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs uppercase tracking-wider text-muted">A6 duration fulfillment</div>
              <Num v={ab.confirmation_tie.A6_duration_fulfillment} trace="ablation.json:confirmation_tie/A6_duration_fulfillment" format={f6} className="text-xl font-semibold" />
            </div>
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs uppercase tracking-wider text-muted">Gap</div>
              <Num v={ab.confirmation_tie.gap} trace="ablation.json:confirmation_tie/gap" format={f6} className="text-xl font-semibold" />
            </div>
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs uppercase tracking-wider text-muted">Larger across-seed SD</div>
              <Num v={ab.confirmation_tie.larger_across_seed_sd} trace="ablation.json:confirmation_tie/larger_across_seed_sd" format={f6} className="text-xl font-semibold" />
            </div>
          </div>
          <div className="text-sm text-fg">
            <p>
              <strong className="capitalize">{ab.confirmation_tie.status}.</strong> The gap between A3 and A6 (
              <Num v={ab.confirmation_tie.gap} trace="ablation.json:confirmation_tie/gap" format={f6} />) is below the larger across-seed SD (
              <Num v={ab.confirmation_tie.larger_across_seed_sd} trace="ablation.json:confirmation_tie/larger_across_seed_sd" format={f6} />
              ), so the declared W40-only tie-break decided: {ab.confirmation_tie.selected} was chosen because its thresholds adapt further below the base
              threshold (larger mean threshold reduction).
            </p>
            <p className="mt-2 text-xs text-muted">Declared rule: {ab.confirmation_tie.rule}</p>
          </div>
        </div>
      </Section>

      <ThresholdBehaviour ab={ab} thr={thr} a3ref={a3ref} refIdx={refIdx} />

      <Section
        id="crossweek"
        scope
        title="Cross-week context: A6 against the first-pass A3"
        kicker="Suggestive only: n = 5 folds, one trained model per fold on folds 1-4 (three on W50). Values from paired.json, averaged over evaluation seeds and then training seeds per fold."
        badge={
          <span className="flex gap-1">
            <EvidenceBadge kind="cross_week" />
            <EvidenceBadge kind="supplementary" label="suggestive, n = 5 folds" />
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="crossweek">
          <PerFoldBars pm={dm} trace={P} />
          <div className="text-sm">
            <p>
              A6 duration fulfillment is lower than the first-pass A3 in <span className="num font-semibold">{lowerFolds}</span> of{" "}
              <span className="num">{dm.per_fold.length}</span> folds; mean difference{" "}
              <Num v={dm.mean_difference} trace={`${P}/mean_difference`} format={signedWords(4)} />. Bootstrap interval over folds{" "}
              <Num v={dm.bootstrap_95_interval[0]} trace={`${P}/bootstrap_95_interval/0`} format={f4} /> to{" "}
              <Num v={dm.bootstrap_95_interval[1]} trace={`${P}/bootstrap_95_interval/1`} format={f4} /> ({dm.bootstrap_note}).
            </p>
            <p className="mt-2">
              Cross-week means: A6 <Num v={ab.cross_week.A6.duration_fulfillment} trace="ablation.json:cross_week/A6/duration_fulfillment" format={f4} />, first-pass A3{" "}
              <Num v={ab.cross_week.A3_first_pass.duration_fulfillment} trace="ablation.json:cross_week/A3_first_pass/duration_fulfillment" format={f4} />.
            </p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-1 font-semibold">Test week</th>
                  <th className="text-right font-semibold">A6</th>
                  <th className="text-right font-semibold">First-pass A3</th>
                  <th className="text-right font-semibold">A6 minus A3</th>
                </tr>
              </thead>
              <tbody>
                {dm.per_fold.map((f, i) => (
                  <tr key={f.fold} className="border-b border-line/60">
                    <td className="py-1">{f.test_week}</td>
                    <td className="text-right">
                      <Num v={f.first} trace={`${P}/per_fold/${i}/first`} format={f4} />
                    </td>
                    <td className="text-right">
                      <Num v={f.second} trace={`${P}/per_fold/${i}/second`} format={f4} />
                    </td>
                    <td className="text-right">
                      <Num v={f.difference} trace={`${P}/per_fold/${i}/difference`} format={signedWords(4)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </>
  );
}

function PerFoldBars({ pm, trace }: { pm: PairedFile["pairs"][number]["metrics"][string]; trace: string }) {
  const W = 520;
  const H = 230;
  const m = { l: 56, r: 12, t: 14, b: 34 };
  const ext = Math.max(...pm.per_fold.map((f) => Math.abs(f.difference)), Math.abs(pm.bootstrap_95_interval[0]), Math.abs(pm.bootstrap_95_interval[1]));
  const y = d3.scaleLinear().domain([-ext * 1.15, ext * 1.15]).range([H - m.b, m.t]);
  const x = d3.scaleBand<string>().domain(pm.per_fold.map((f) => f.test_week)).range([m.l, W - m.r]).padding(0.35);
  return (
    <svg width={W} height={H} role="img" aria-label="Per-fold difference A6 minus first-pass A3" className="max-w-full" data-trace-chart={trace}>
      {y.ticks(5).map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e1e7f1" />
          <text x={m.l - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="#4a5675">
            {t.toFixed(3)}
          </text>
        </g>
      ))}
      <rect x={m.l} width={W - m.r - m.l} y={y(pm.bootstrap_95_interval[1])} height={y(pm.bootstrap_95_interval[0]) - y(pm.bootstrap_95_interval[1])} fill={BRAND.blue} opacity={0.08} />
      <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke={BRAND.fg} />
      <line x1={m.l} x2={W - m.r} y1={y(pm.mean_difference)} y2={y(pm.mean_difference)} stroke={METHOD_COLORS.adaptive_bee} strokeDasharray="7 3 2 3" strokeWidth={2} />
      {pm.per_fold.map((f) => (
        <g key={f.fold}>
          <rect
            x={x(f.test_week)}
            width={x.bandwidth()}
            y={Math.min(y(0), y(f.difference))}
            height={Math.abs(y(f.difference) - y(0))}
            fill={METHOD_COLORS.adaptive_bee}
            stroke={BRAND.fg}
            strokeWidth={0.8}
          >
            <title>{`${f.test_week}: ${f.difference.toFixed(4)}`}</title>
          </rect>
          <text x={x(f.test_week)! + x.bandwidth() / 2} y={H - m.b + 16} fontSize={12} textAnchor="middle" fill="#2b3756">
            {f.test_week}
          </text>
        </g>
      ))}
      <text x={m.l} y={H - 2} fontSize={11} fill="#4a5675">
        bars: A6 minus A3 per fold · dash-dot: mean
      </text>
      <text x={W - m.r} y={m.t + 2} fontSize={11} textAnchor="end" fill="#4a5675">
        shaded: bootstrap interval (n = 5 folds, indicative only)
      </text>
    </svg>
  );
}

function ThresholdBehaviour({ ab, thr, a3ref, refIdx }: { ab: Ablation; thr: Thresholds; a3ref: Ablation["references"][number]; refIdx: number }) {
  const rows = useMemo(
    () => ab.configurations.flatMap((c, ci) => STAGES.filter((s) => c.stages[s].reached).map((s) => ({ c, ci, s, v: c.stages[s].mean_selected_threshold!, mn: c.stages[s].min_selected_threshold! }))),
    [ab],
  );
  const W = 640;
  const H = 260;
  const m = { l: 44, r: 12, t: 12, b: 40 };
  const x0 = d3.scaleBand<string>().domain(ab.configurations.map((c) => c.id)).range([m.l, W - m.r]).padding(0.2);
  const x1 = d3.scaleBand<string>().domain(STAGES).range([0, x0.bandwidth()]).padding(0.12);
  const y = d3.scaleLinear().domain([0.3, 0.52]).range([H - m.b, m.t]);
  const stageFill: Record<Stage, string> = { screening: "#b45309", shortlist: "#a16207", confirmation: "#0369a1" };
  const sd = a3ref.supporting_data!;
  const dg = thr.diagnostic;
  return (
    <Section
      id="thresholds"
      title="Threshold behaviour"
      kicker="Mean selected threshold per configuration and stage (W40 runs). A3 adapts only on contention increase and stays at about the base threshold; A6 lowers it."
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <svg width={W} height={H} role="img" aria-label="Mean selected threshold by configuration and stage" className="max-w-full">
            {y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e1e7f1" />
                <text x={m.l - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="#4a5675">
                  {t.toFixed(2)}
                </text>
              </g>
            ))}
            <line x1={m.l} x2={W - m.r} y1={y(sd.base_threshold)} y2={y(sd.base_threshold)} stroke={BRAND.fg} strokeDasharray="4 3" />
            <text x={W - m.r} y={y(sd.base_threshold) - 4} fontSize={11} textAnchor="end" fill={BRAND.fg}>
              base threshold {sd.base_threshold}
            </text>
            {rows.map((r) => (
              <rect key={`${r.c.id}-${r.s}`} x={x0(r.c.id)! + x1(r.s)!} width={x1.bandwidth()} y={y(r.v)} height={y(0.3) - y(r.v)} fill={stageFill[r.s]} stroke={BRAND.fg} strokeWidth={0.6}>
                <title>{`${r.c.id} ${r.s}: ${r.v.toFixed(4)}`}</title>
              </rect>
            ))}
            {ab.configurations.map((c) => (
              <text key={c.id} x={x0(c.id)! + x0.bandwidth() / 2} y={H - m.b + 16} fontSize={12} textAnchor="middle" fill="#2b3756">
                {c.id}
              </text>
            ))}
            <text x={m.l} y={H - 4} fontSize={11} fill="#4a5675">
              axis starts at 0.30
            </text>
          </svg>
          <div className="mt-1 flex flex-wrap gap-3 text-xs">
            {STAGES.map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="inline-block h-3 w-3" style={{ background: stageFill[s] }} />
                {ab.stage_badges[s]}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <table className="w-full text-sm" data-testid="threshold-table">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-1 font-semibold">Config</th>
                <th className="font-semibold">Stage</th>
                <th className="text-right font-semibold">Mean θ</th>
                <th className="text-right font-semibold">Min θ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.c.id}-${r.s}`} className="border-b border-line/60" data-num-scope>
                  <td className="py-1">{r.c.id}</td>
                  <td>
                    <StageBadge stage={r.s} ab={ab} />
                  </td>
                  <td className="text-right">
                    <Num v={r.v} trace={`ablation.json:configurations/${r.ci}/stages/${r.s}/mean_selected_threshold`} format={f4} />
                  </td>
                  <td className="text-right">
                    <Num v={r.mn} trace={`ablation.json:configurations/${r.ci}/stages/${r.s}/min_selected_threshold`} format={f4} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="rounded-md border border-line bg-sunken p-3" data-num-scope data-testid="a3-near-base">
            <EvidenceBadge kind="cross_week" /> A3 first pass, cross-week mean selected threshold{" "}
            <Num v={sd.cross_week_mean_selected_threshold} trace={`ablation.json:references/${refIdx}/supporting_data/cross_week_mean_selected_threshold`} format={f4} /> (base{" "}
            <Num v={sd.base_threshold} trace={`ablation.json:references/${refIdx}/supporting_data/base_threshold`} format={f2} />
            ).
          </div>
          <div className="rounded-md border border-line bg-sunken p-3" data-testid="contention-diag" data-num-scope>
            <EvidenceBadge kind="recorded" label={`diagnostic: random-policy ${dg.episode.week.slice(0, 3)} episode, rule ${dg.episode.rule}`} /> Contention term mean{" "}
            <Num v={dg.term_means.contention_term} trace="thresholds.json:diagnostic/term_means/contention_term" format={sig2} className="font-semibold" /> (max{" "}
            <Num v={dg.term_max.contention_term} trace="thresholds.json:diagnostic/term_max/contention_term" format={sig2} />) against a scarcity term mean of{" "}
            <Num v={dg.term_means.scarcity_term} trace="thresholds.json:diagnostic/term_means/scarcity_term" format={sig2} />. {ab.contention_note}
          </div>
        </div>
      </div>
    </Section>
  );
}
