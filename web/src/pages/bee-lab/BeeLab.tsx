import * as d3 from "d3";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadBeeParams, loadGaps, loadProtocol, loadThresholds, useData, type Thresholds, type Trace, type TraceRow } from "../../data/loaders";
import { Ready } from "../../components/States";
import { ConfirmMarker, EvidenceBadge } from "../../components/EvidenceBadge";
import { activation, recomputeTraceRow, stimulus, threshold, type BeeMethodParams, type BeeParamsFile } from "../../lib/beeMath";
import { BRAND, METHOD_COLORS } from "../../config/theme";
import type { GapsFile, ProtocolFile } from "../../data/types";

const fmt = (v: number, d = 4) => v.toFixed(d);
const sig = (v: number, n = 2) => Number(v.toPrecision(n)).toString();
const exact = (v: number | boolean | string) => String(v);

// Expose the browser equations for the automated recompute check.
(window as unknown as { __beeMath?: unknown }).__beeMath = { recomputeTraceRow, stimulus, threshold, activation };

export default function BeeLab() {
  const params = useData(loadBeeParams, []);
  const thr = useData(loadThresholds, []);
  const gaps = useData(loadGaps, []);
  const protocol = useData(loadProtocol, []);
  return (
    <div className="mx-auto max-w-[1500px] px-6 pb-12 pt-5" data-testid="bee-lab">
      <Ready items={[params, thr, gaps, protocol]} what="BEE data">
        {(p, t, g, pr) => <BeeLabView params={p} thr={t} gaps={g} protocol={pr} />}
      </Ready>
    </div>
  );
}

function Section({ id, title, kicker, badge, children }: { id: string; title: string; kicker: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="panel mt-5 p-5" aria-labelledby={`${id}-h`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`${id}-h`} className="text-lg font-semibold text-brand">
          {title}
        </h2>
        {badge}
      </div>
      <p className="mt-1 max-w-4xl text-sm text-fg-2">{kicker}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BeeLabView({ params, thr, gaps, protocol }: { params: BeeParamsFile; thr: Thresholds; gaps: GapsFile; protocol: ProtocolFile }) {
  useEffect(() => {
    (window as unknown as { __beeParams?: unknown }).__beeParams = params;
  }, [params]);
  const n4 = gaps.needs_confirmation.find((r) => (r.id ?? r["#"]) === "N4");
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand">BEE Mechanism Lab</h1>
        <p className="mt-1 max-w-4xl text-fg-2">
          How the bee-inspired features are computed for each request, on the exact equations from the team&apos;s code and on recorded data.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand-tint px-4 py-3" data-testid="mask-statement">
          <span className="text-base font-semibold text-brand">{params.statement}</span>
          <span className="text-xs text-muted">
            Source: <code>{params.mask.shared_mask.file}</code> lines {params.mask.shared_mask.lines?.[0]}-{params.mask.shared_mask.lines?.[1]}; fixed stream check{" "}
            <code>{params.mask.fixed_stream_mask_unchanged_test.text}</code> (cell {params.mask.fixed_stream_mask_unchanged_test.cell}).
          </span>
        </div>
      </header>
      <HowBeeDecides params={params} thr={thr} protocol={protocol} />
      <Sandbox params={params} n4={n4} />
      <Replay params={params} thr={thr} />
      <TracesShow params={params} thr={thr} />
    </>
  );
}

// ------------------------------------------------------------------ shared bits
function Hex({ size, fill, opacity, stroke, children, label }: { size: number; fill: string; opacity: number; stroke: string; children?: ReactNode; label?: string }) {
  const r = size / 2;
  const pts = d3.range(6).map((i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${r + r * 0.95 * Math.cos(a)},${r + r * 0.95 * Math.sin(a)}`;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role={label ? "img" : undefined} aria-label={label}>
      <polygon points={pts.join(" ")} fill="#ffffff" stroke={stroke} strokeWidth={1.5} />
      <polygon points={pts.join(" ")} fill={fill} fillOpacity={opacity} stroke="none" />
      {children}
    </svg>
  );
}

function Slider({ label, value, min, max, step, onChange, testId, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; testId?: string; hint?: string }) {
  const digits = step >= 1 ? 0 : 2;
  return (
    <label className="block text-sm">
      <span className="flex items-baseline justify-between">
        <span className="font-medium text-fg">{label}</span>
        <span className="num text-fg" data-testid={testId ? `${testId}-value` : undefined}>
          {fmt(value, digits)}
        </span>
      </span>
      <input type="range" className="mt-1 w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} aria-label={label} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function ActivationCurve({ p, theta, points, width = 420, height = 240 }: { p: BeeMethodParams; theta: number; points: { s: number; label: string }[]; width?: number; height?: number }) {
  const m = { l: 44, r: 12, t: 12, b: 36 };
  const x = d3.scaleLinear().domain([0, 1]).range([m.l, width - m.r]);
  const y = d3.scaleLinear().domain([0, 1]).range([height - m.b, m.t]);
  const path = d3
    .line<[number, number]>()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]))(d3.range(0, 1.0001, 0.005).map((s) => [s, activation(p, s, theta)]));
  return (
    <svg width={width} height={height} role="img" aria-label={`Activation against stimulus for threshold ${fmt(theta, 2)}`} data-testid="activation-curve">
      {x.ticks(5).map((t) => (
        <g key={`x${t}`}>
          <line x1={x(t)} x2={x(t)} y1={m.t} y2={height - m.b} stroke="#e1e7f1" />
          <text x={x(t)} y={height - m.b + 14} fontSize={11} textAnchor="middle" fill="#4a5675">
            {t}
          </text>
        </g>
      ))}
      {y.ticks(5).map((t) => (
        <g key={`y${t}`}>
          <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="#e1e7f1" />
          <text x={m.l - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="#4a5675">
            {t}
          </text>
        </g>
      ))}
      <text x={(m.l + width - m.r) / 2} y={height - 4} fontSize={12} textAnchor="middle" fill="#2b3756">
        stimulus s
      </text>
      <text x={12} y={(m.t + height - m.b) / 2} fontSize={12} textAnchor="middle" fill="#2b3756" transform={`rotate(-90 12 ${(m.t + height - m.b) / 2})`}>
        activation
      </text>
      <line x1={x(theta)} x2={x(theta)} y1={m.t} y2={height - m.b} stroke={BRAND.navy} strokeDasharray="4 3" />
      <text x={x(theta) + 4} y={m.t + 12} fontSize={11} fill={BRAND.navy}>
        θ = {fmt(theta, 2)}
      </text>
      <path d={path ?? ""} fill="none" stroke={METHOD_COLORS.adaptive_bee} strokeWidth={2.5} />
      {points.map((pt, i) => (
        <circle key={i} cx={x(pt.s)} cy={y(activation(p, pt.s, theta))} r={4} fill="#ffffff" stroke={BRAND.fg} strokeWidth={1.5}>
          <title>{pt.label}</title>
        </circle>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ (a) How BEE decides
function HowBeeDecides({ params, thr, protocol }: { params: BeeParamsFile; thr: Thresholds; protocol: ProtocolFile }) {
  const p = params.methods.adaptive_A6;
  const trace = thr.traces.find((t) => t.method === "adaptive_bee" && t.test_week === "W40_2018" && t.training_seed === 42 && t.evaluation_seed === 1001)!;
  const cards = useMemo(() => {
    const n = 12;
    return d3.range(n).map((i) => trace.rows[Math.round((i * (trace.rows.length - 1)) / (n - 1))]);
  }, [trace]);
  const t = p.threshold.kind === "adaptive" ? p.threshold : null;
  const [theta, setTheta] = useState(t ? t.base_threshold.value : 0.5);
  const diag = thr.diagnostic.rows;
  const [dstep, setDstep] = useState(0);
  const d = diag[dstep];
  const total = protocol.weekly_request_totals.W40;
  return (
    <Section
      id="how"
      title="How BEE decides what the policy sees"
      kicker="BEE adds information to the observation; it does not remove actions. The set of allowed actions is the shared feasibility mask, identical for every method. BEE computes a stimulus and an activation for each request and passes them to the policy as extra inputs."
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className="rounded-lg border border-line bg-sunken p-4" data-testid="panel-allowed">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-fg">What is allowed</h3>
            <EvidenceBadge kind="recorded" />
          </div>
          <p className="mt-1 text-sm text-fg-2">
            The shared feasibility mask: a request is allowed when it still has a feasible placement. The threshold slider on the right never changes this panel.
          </p>
          <Slider label="Recorded step" value={dstep} min={0} max={diag.length - 1} step={1} onChange={setDstep} testId="allowed-step" />
          <div className="mt-2 text-sm">
            Step <span className="num">{d.step}</span>: <span className="num font-semibold" data-testid="allowed-count">{d.valid_requests}</span> of{" "}
            <span className="num">{total}</span> requests allowed
          </div>
          <div className="mt-2 flex flex-wrap gap-[2px]" aria-hidden>
            {d3.range(total).map((i) => (
              <span key={i} className="inline-block h-[7px] w-[7px]" style={{ background: i < d.valid_requests ? BRAND.blue : "#d5dbe6", clipPath: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)" }} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{thr.diagnostic.note} Source: {thr.diagnostic.source_file}.</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4" data-testid="panel-sees">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-fg">What the policy sees</h3>
            <EvidenceBadge kind="recorded" label="inputs: recorded trace values" />
            <EvidenceBadge kind="whatif" label="activation: what-if θ" />
          </div>
          <p className="mt-1 text-sm text-fg-2">
            Twelve requests recorded in the W40 A6 run (training seed 42, evaluation seed 1001), each at the step it was chosen. Moving θ changes each card&apos;s
            activation (fill and value). Every card stays in the feasible set.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <Slider
                label="Threshold θ (what-if)"
                value={theta}
                min={t ? t.minimum_threshold.value : 0.1}
                max={t ? t.maximum_threshold.value : 0.9}
                step={0.01}
                onChange={setTheta}
                testId="theta"
                hint={`Range is the A6 clip range [${t?.minimum_threshold.value}, ${t?.maximum_threshold.value}]; activation = clip(s^${p.activation.sensitivity_k.value} / (s^${p.activation.sensitivity_k.value} + θ^${p.activation.sensitivity_k.value} + ${p.activation.epsilon}), 0, 1).`}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 2xl:grid-cols-6" data-testid="hex-cards">
                {cards.map((r) => {
                  const a = activation(p, r.stimulus, theta);
                  return (
                    <motion.div key={r.step} layout className="flex flex-col items-center rounded-md border border-line bg-surface p-1.5 text-center" data-card={r.track_id}>
                      <Hex size={56} fill={METHOD_COLORS.adaptive_bee} opacity={a} stroke={BRAND.navy} label={`Request ${r.track_id}, activation ${fmt(a, 3)}`} />
                      <span className="num mt-0.5 whitespace-nowrap text-sm font-semibold text-fg" data-activation={a}>
                        {fmt(a, 2)}
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-fg-2">activation</span>
                      <span className="num whitespace-nowrap text-[11px] text-muted" title={r.track_id}>
                        s {fmt(r.stimulus, 3)}
                      </span>
                      <span className="text-[11px] font-medium text-ok-fg">allowed</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <ActivationCurve p={p} theta={theta} points={cards.map((r) => ({ s: r.stimulus, label: r.track_id }))} />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ (b) What-if sandbox
const METHOD_KEYS = ["fixed_F2", "adaptive_A6", "adaptive_A3"] as const;
type MKey = (typeof METHOD_KEYS)[number];
const MCOLOR: Record<MKey, string> = { fixed_F2: METHOD_COLORS.fixed_bee, adaptive_A6: METHOD_COLORS.adaptive_bee, adaptive_A3: METHOD_COLORS.adaptive_a3_first_pass };

function Sandbox({ params, n4 }: { params: BeeParamsFile; n4?: Record<string, string> }) {
  const [sel, setSel] = useState<MKey>("adaptive_A6");
  const [v, setV] = useState({ scarcity: 0.35, contention: 0.6, increase: 0.05, unmet: 0.8, rel: 0.12 });
  const set = (k: keyof typeof v) => (x: number) => setV((o) => ({ ...o, [k]: x }));
  const res = (k: MKey) => {
    const p = params.methods[k];
    const s = stimulus(p, v.scarcity, v.contention, v.unmet);
    const th = threshold(p, v.scarcity, v.increase, v.rel);
    return { p, s, ...th, a: activation(p, s, th.theta) };
  };
  const cur = res(sel);
  const p = cur.p;
  const w = p.stimulus_weights;
  return (
    <Section
      id="sandbox"
      title="What-if sandbox"
      kicker="Choose input values and see the stimulus, threshold and activation each method's code would compute. These are what-if values computed from the equations, not results."
      badge={<EvidenceBadge kind="whatif" />}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Slider label="Placement scarcity" value={v.scarcity} min={0} max={1} step={0.01} onChange={set("scarcity")} testId="sb-scarcity" />
          <Slider label="Resource contention" value={v.contention} min={0} max={1} step={0.01} onChange={set("contention")} testId="sb-contention" />
          <Slider label="Contention increase (adaptive)" value={v.increase} min={0} max={1} step={0.01} onChange={set("increase")} testId="sb-increase" />
          <Slider label="Mission unmet ratio" value={v.unmet} min={0} max={1} step={0.01} onChange={set("unmet")} testId="sb-unmet" />
          <Slider label="Relative unmet pressure (adaptive)" value={v.rel} min={0} max={1} step={0.01} onChange={set("rel")} testId="sb-rel" />
          <p className="text-xs text-muted">Each method reads these inputs with its own definitions (see the notes below the table).</p>
        </div>
        <div>
          <div role="radiogroup" aria-label="Method" className="flex flex-wrap gap-2">
            {METHOD_KEYS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={sel === k} className={`btn ${sel === k ? "btn-on" : ""}`} onClick={() => setSel(k)} data-testid={`sb-method-${k}`}>
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: MCOLOR[k] }} />
                {params.methods[k].label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3" data-testid="sb-detail">
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Stimulus</div>
              <div className="num mt-1 text-2xl font-semibold text-fg" data-testid="sb-stimulus">
                {fmt(cur.s)}
              </div>
              <div className="num mt-1 text-xs text-fg-2">
                {w.scarcity}·{fmt(v.scarcity, 2)} + {w.contention}·{fmt(v.contention, 2)} + {w.unmet}·{fmt(v.unmet, 2)}
                {p.stimulus.clip ? `, clipped to [${p.stimulus.clip.join(", ")}]` : ", no clip"}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Threshold θ</div>
              <div className="num mt-1 text-2xl font-semibold text-fg" data-testid="sb-theta">
                {fmt(cur.theta)}
              </div>
              {p.threshold.kind === "fixed" ? (
                <div className="mt-1 text-xs text-fg-2">fixed at {p.threshold.value.value}</div>
              ) : (
                <>
                  <div className="num mt-1 text-xs text-fg-2">
                    clip({p.threshold.base_threshold.value} − {p.threshold.scarcity_strength.value}·s − {p.threshold.contention_strength.value}·Δc − {p.threshold.unmet_strength.value}·u
                    <sub>rel</sub>, {p.threshold.minimum_threshold.value}, {p.threshold.maximum_threshold.value})
                  </div>
                  {p.gate && (
                    <div className="mt-2" data-testid="sb-gate">
                      <div className="flex flex-wrap gap-1">
                        {[
                          [`scarcity ≥ ${p.gate.scarcity_indicator_limit.value}`, cur.gate.flags[0]],
                          [`Δ contention ≥ ${p.gate.contention_indicator_limit.value}`, cur.gate.flags[1]],
                          [`relative unmet ≥ ${p.gate.unmet_indicator_limit.value}`, cur.gate.flags[2]],
                        ].map(([lbl, on]) => (
                          <span
                            key={String(lbl)}
                            className={`rounded-full border px-2 py-[1px] text-xs ${on ? "border-ok-fg/50 bg-ok-bg text-ok-fg" : "border-line-strong bg-surface text-muted"}`}
                            data-fired={on ? "yes" : "no"}
                          >
                            {on ? "● " : "○ "}
                            {lbl}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 text-xs">
                        {p.gate.selective_mode.value ? (
                          <>
                            Selective gate: {cur.gate.count} of 3 indicators fire, needs {p.gate.minimum_pressure_indicators.value}:{" "}
                            <strong className={cur.gate.enabled ? "text-ok-fg" : "text-danger-fg"} data-testid="sb-gate-state">
                              {cur.gate.enabled ? "adaptation on" : "adaptation off, θ = base"}
                            </strong>
                          </>
                        ) : (
                          <span data-testid="sb-gate-state">Not selective: adaptation always on</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="rounded-lg border border-line bg-sunken p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Activation</div>
              <div className="num mt-1 text-2xl font-semibold text-fg" data-testid="sb-activation">
                {fmt(cur.a)}
              </div>
              <div className="mt-1 text-xs text-fg-2">{p.activation.formula}</div>
            </div>
          </div>
          <table className="mt-4 w-full text-sm" data-testid="sb-compare">
            <caption className="text-left text-xs text-muted">Same inputs, all three methods (what-if)</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-1 font-semibold">Method</th>
                <th className="font-semibold">Weights (s, c, u)</th>
                <th className="text-right font-semibold">Stimulus</th>
                <th className="text-right font-semibold">θ</th>
                <th className="text-right font-semibold">Activation</th>
              </tr>
            </thead>
            <tbody>
              {METHOD_KEYS.map((k) => {
                const r = res(k);
                return (
                  <tr key={k} className="border-b border-line/60">
                    <td className="py-1">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: MCOLOR[k] }} />
                      {r.p.label}
                    </td>
                    <td className="num">
                      {r.p.stimulus_weights.scarcity} / {r.p.stimulus_weights.contention} / {r.p.stimulus_weights.unmet}
                    </td>
                    <td className="num text-right">{fmt(r.s)}</td>
                    <td className="num text-right">{fmt(r.theta)}</td>
                    <td className="num text-right">{fmt(r.a)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900" data-testid="pair-note-n4">
            {n4 && <ConfirmMarker id="N4" text={n4["What needs confirming"]} />} <strong>Fixed vs adaptive is not like for like.</strong> {params.differences_note}
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-brand">Input definitions in each method&apos;s code</summary>
            <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {METHOD_KEYS.map((k) => (
                <div key={k} className="rounded-md border border-line p-2">
                  <div className="font-semibold">{params.methods[k].label}</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-fg-2">
                    {Object.entries(params.methods[k].definitions).map(([name, d]) => (
                      <li key={name}>
                        <span className="font-medium text-fg">{name.replace(/_/g, " ")}</span>: {d.words}
                        {d.normalisation ? ` (normalisation: ${d.normalisation})` : ""}.{" "}
                        <span className="text-muted">
                          {d.source.file}
                          {d.source.cell !== undefined ? `, cell ${d.source.cell}` : ""}, line {d.source.line}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ (c) Replay a real step
const REPLAY_FIELDS: (keyof TraceRow)[] = [
  "placement_scarcity",
  "resource_contention",
  "mission_unmet_ratio",
  "initial_contention",
  "mean_mission_unmet",
  "contention_increase",
  "relative_unmet_pressure",
  "pressure_count",
  "adaptation_enabled",
  "stimulus",
  "threshold",
  "activation",
];
const RECOMPUTED = new Set(["contention_increase", "relative_unmet_pressure", "pressure_count", "adaptation_enabled", "stimulus", "threshold", "activation"]);

function Replay({ params, thr }: { params: BeeParamsFile; thr: Thresholds }) {
  const [method, setMethod] = useState<"adaptive_bee" | "adaptive_a3_first_pass">("adaptive_bee");
  const runs = thr.traces.filter((t) => t.method === method);
  const [runIdx, setRunIdx] = useState(0);
  const run: Trace = runs[Math.min(runIdx, runs.length - 1)];
  const [step, setStep] = useState(0);
  const row = run.rows[Math.min(step, run.rows.length - 1)];
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [method, runIdx, step]);
  const p = params.methods[method === "adaptive_bee" ? "adaptive_A6" : "adaptive_A3"];
  const rc = recomputeTraceRow(p, row) as Record<string, number | boolean>;
  const diffs = Object.fromEntries(
    [...RECOMPUTED].map((f) => [f, typeof rc[f] === "boolean" ? (rc[f] === row[f as keyof TraceRow] ? 0 : 1) : Math.abs((rc[f] as number) - (row[f as keyof TraceRow] as number))]),
  );
  const maxDiff = Math.max(...Object.values(diffs));
  return (
    <Section
      id="replay"
      title="Replay a real step"
      kicker="Pick a cross-week run and a step from the exported threshold traces. The table shows the selected request's values exactly as recorded. The button recomputes the derived values from the recorded inputs with the browser equations."
      badge={
        <span className="flex gap-1">
          <EvidenceBadge kind="recorded" />
          <EvidenceBadge kind="cross_week" />
        </span>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted">Configuration</span>
          <select className="ctl mt-1" value={method} onChange={(e) => (setMethod(e.target.value as typeof method), setRunIdx(0), setStep(0))} data-testid="rp-method">
            <option value="adaptive_bee">Adaptive A6 (selected)</option>
            <option value="adaptive_a3_first_pass">Adaptive A3 (first pass)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted">Run (week · training seed · evaluation seed)</span>
          <select className="ctl mt-1" value={runIdx} onChange={(e) => (setRunIdx(Number(e.target.value)), setStep(0))} data-testid="rp-run">
            {runs.map((t, i) => (
              <option key={t.source_file} value={i}>
                {t.test_week.slice(0, 3)} · {t.training_seed} · {t.evaluation_seed}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[260px] flex-1">
          <Slider label={`Step (0 to ${run.rows.length - 1})`} value={step} min={0} max={run.rows.length - 1} step={1} onChange={setStep} testId="rp-step" />
        </div>
        <button type="button" className="btn btn-on" onClick={() => setShown(true)} data-testid="rp-recompute">
          Recompute from recorded inputs
        </button>
      </div>
      <div className="mt-2 text-xs text-muted">
        Request <span className="num">{row.track_id}</span>, action {row.action}. Source: <code>{run.source_file}</code>
      </div>
      <table className="mt-3 w-full text-sm" data-testid="rp-table">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-1 font-semibold">Field</th>
            <th className="text-right font-semibold">Recorded (exact)</th>
            <th className="text-right font-semibold">Recomputed</th>
            <th className="text-right font-semibold">|difference|</th>
          </tr>
        </thead>
        <tbody>
          {REPLAY_FIELDS.map((f) => (
            <tr key={f} className="border-b border-line/60">
              <td className="py-1">{f.replace(/_/g, " ")}</td>
              <td className="num text-right" data-field={f} data-value={String(row[f])}>
                {exact(row[f])}
              </td>
              <td className="num text-right">{RECOMPUTED.has(f) ? (shown ? exact(rc[f]) : "·") : <span className="text-muted">input</span>}</td>
              <td className="num text-right">{RECOMPUTED.has(f) && shown ? diffs[f].toExponential(1) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {shown && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${maxDiff < 1e-6 ? "border-ok-fg/40 bg-ok-bg text-ok-fg" : "border-danger-fg/40 bg-danger-bg text-danger-fg"}`}
          data-testid="rp-result"
          data-maxdiff={maxDiff}
        >
          Largest difference {maxDiff.toExponential(2)}: {maxDiff < 1e-6 ? "below 1e-6, the browser equations reproduce the recorded values." : "above 1e-6."}
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ (d) What the traces show
function TracesShow({ params, thr }: { params: BeeParamsFile; thr: Thresholds }) {
  const p = params.methods.adaptive_A6;
  const base = p.threshold.kind === "adaptive" ? p.threshold.base_threshold.value : 0.5;
  const a6 = thr.traces.filter((t) => t.method === "adaptive_bee");
  const all = a6.flatMap((t) => t.rows.map((r) => r.threshold));
  const atBase = all.filter((v) => v === base).length;
  const bins = d3.bin().domain([0.1, base]).thresholds(d3.range(0.1, base, 0.025))(all.filter((v) => v < base));
  const W = 560;
  const H = 230;
  const m = { l: 48, r: 12, t: 12, b: 36 };
  const x = d3.scaleLinear().domain([0.1, base + 0.025]).range([m.l, W - m.r]);
  const ymax = Math.max(atBase, ...bins.map((b) => b.length));
  const y = d3.scaleLinear().domain([0, ymax]).nice().range([H - m.b, m.t]);
  const byFold = thr.selected_threshold_by_fold.adaptive_bee;
  const dg = thr.diagnostic;
  const dW = 560;
  const dx = d3.scaleLinear().domain(d3.extent(dg.rows, (r) => r.step) as [number, number]).range([m.l, dW - m.r]);
  const dy = d3.scaleLinear().domain([0, d3.max(dg.rows, (r) => r.scarcity_term)!]).nice().range([H - m.b, m.t]);
  const terms = [
    { k: "scarcity_term", label: "scarcity term", color: METHOD_COLORS.plain_ppo, dash: "" },
    { k: "unmet_term", label: "unmet term", color: METHOD_COLORS.fixed_bee, dash: "6 3" },
    { k: "contention_term", label: "contention term", color: METHOD_COLORS.adaptive_bee, dash: "2 3" },
  ];
  return (
    <Section
      id="traces"
      title="What the traces show"
      kicker="A6 cross-week traces record the threshold of the request chosen at every step. Counts below are taken from the 35 exported A6 traces."
      badge={<EvidenceBadge kind="cross_week" />}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <h3 className="font-semibold text-fg">Selected thresholds (A6, all steps of all 35 runs)</h3>
          <p className="mt-1 text-sm text-fg-2" data-testid="share-at-base">
            <span className="num font-semibold">{atBase.toLocaleString()}</span> of <span className="num">{all.length.toLocaleString()}</span> recorded selections (
            <span className="num">{((100 * atBase) / all.length).toFixed(1)}%</span>) are at the base threshold {base}; the remaining{" "}
            <span className="num">{(all.length - atBase).toLocaleString()}</span> were adapted lower.
          </p>
          <svg width={W} height={H} role="img" aria-label="Histogram of selected thresholds" className="mt-2 max-w-full">
            {y.ticks(4).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e1e7f1" />
                <text x={m.l - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="#4a5675">
                  {t}
                </text>
              </g>
            ))}
            {bins.map((b, i) => (
              <rect key={i} x={x(b.x0!) + 1} y={y(b.length)} width={Math.max(1, x(b.x1!) - x(b.x0!) - 2)} height={y(0) - y(b.length)} fill={METHOD_COLORS.adaptive_bee} opacity={0.75}>
                <title>{`${b.x0?.toFixed(3)}-${b.x1?.toFixed(3)}: ${b.length}`}</title>
              </rect>
            ))}
            <rect x={x(base) + 1} y={y(atBase)} width={x(base + 0.025) - x(base) - 2} height={y(0) - y(atBase)} fill={BRAND.navy}>
              <title>{`exactly ${base}: ${atBase}`}</title>
            </rect>
            {[0.1, 0.2, 0.3, 0.4, base].map((t) => (
              <text key={t} x={x(t) + (t === base ? (x(base + 0.025) - x(base)) / 2 : 0)} y={H - m.b + 14} fontSize={11} textAnchor="middle" fill="#4a5675">
                {t}
              </text>
            ))}
            <text x={(m.l + W) / 2} y={H - 4} fontSize={12} textAnchor="middle" fill="#2b3756">
              selected threshold (navy bar: exactly {base})
            </text>
          </svg>
          <table className="mt-3 w-full text-sm" data-testid="by-fold">
            <caption className="text-left text-xs text-muted">Per fold, from adaptive_threshold_results.csv</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-1 font-semibold">Test week</th>
                <th className="text-right font-semibold">Mean selected θ</th>
                <th className="text-right font-semibold">Minimum selected θ</th>
              </tr>
            </thead>
            <tbody>
              {byFold.map((r) => (
                <tr key={String(r.fold)} className="border-b border-line/60">
                  <td className="py-1">{String(r.test_week).slice(0, 3)}</td>
                  <td className="num text-right">{fmt(r.mean_selected_threshold as number)}</td>
                  <td className="num text-right">{fmt(r.minimum_selected_threshold as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-semibold text-fg">Diagnostic: the three adjustment terms per step</h3>
          <p className="mt-1 text-sm text-fg-2" data-testid="diag-facts">
            Means over the {dg.rows.length} steps: scarcity term <span className="num font-semibold">{sig(dg.term_means.scarcity_term)}</span>, unmet term{" "}
            <span className="num font-semibold">{sig(dg.term_means.unmet_term)}</span>, contention term{" "}
            <span className="num font-semibold" data-testid="contention-mean">
              {sig(dg.term_means.contention_term)}
            </span>{" "}
            (max {sig(dg.term_max.contention_term)}). In this diagnostic the threshold moves mainly through the scarcity term; the contention term is about 0.
          </p>
          <svg width={dW} height={H} role="img" aria-label="Scarcity, unmet and contention terms by step" className="mt-2 max-w-full">
            {dy.ticks(4).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={dW - m.r} y1={dy(t)} y2={dy(t)} stroke="#e1e7f1" />
                <text x={m.l - 6} y={dy(t) + 4} fontSize={11} textAnchor="end" fill="#4a5675">
                  {t}
                </text>
              </g>
            ))}
            {dx.ticks(6).map((t) => (
              <text key={t} x={dx(t)} y={H - m.b + 14} fontSize={11} textAnchor="middle" fill="#4a5675">
                {t}
              </text>
            ))}
            <text x={(m.l + dW) / 2} y={H - 4} fontSize={12} textAnchor="middle" fill="#2b3756">
              step
            </text>
            {terms.map((tm) => (
              <path
                key={tm.k}
                d={
                  d3
                    .line<Record<string, number>>()
                    .x((r) => dx(r.step))
                    .y((r) => dy(r[tm.k]))(dg.rows) ?? ""
                }
                fill="none"
                stroke={tm.color}
                strokeWidth={2.2}
                strokeDasharray={tm.dash || undefined}
              />
            ))}
          </svg>
          <div className="mt-1 flex flex-wrap gap-4 text-xs">
            {terms.map((tm) => (
              <span key={tm.k} className="flex items-center gap-1.5">
                <svg width={26} height={8} aria-hidden>
                  <line x1={1} x2={25} y1={4} y2={4} stroke={tm.color} strokeWidth={2.5} strokeDasharray={tm.dash || undefined} />
                </svg>
                {tm.label}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{dg.note}</p>
          <div className="mt-3 rounded-md border border-dashed border-line-strong bg-sunken px-3 py-2 text-sm" data-testid="hypothesis">
            <span className="mr-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold text-slate-800">hypothesis, not tested</span>
            Contention is measured relative to each request&apos;s own contention when it was first seen, and the number of valid requests shrinks as the week fills
            up, which may keep the contention increase small. The traces do not test this.
          </div>
        </div>
      </div>
    </Section>
  );
}
