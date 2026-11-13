import { useMemo, useState } from "react";
import { useLab } from "../../store/useLabStore";
import { HEURISTIC_RULES, PRIMARY_METHODS, seriesTextColor, type HeuristicRule, type MethodId } from "../../config/theme";
import { MethodGlyph } from "../../components/MethodGlyph";
import { WEEKS, type ComplexesFile, type GapsFile, type PairedFile, type RunRow, type Schedule, type SeriesSummary, type WeekId, type Windows } from "../../data/types";
import { ConfirmMarker, EvidenceBadge, evidenceFromStage } from "../../components/EvidenceBadge";
import { MetricCard } from "../../components/MetricCard";
import { Pending } from "../../components/States";
import { Details, SpreadNote } from "../../components/PageChrome";
import { fmtDuration, fmtMain, fmtMetric, fmtTime, methodLabel, METRIC_LABEL } from "../../lib/format";

// ------------------------------------------------------------ controls
function MethodPicker({
  label,
  method,
  rule,
  onMethod,
  onRule,
  testId,
}: {
  label: string;
  method: MethodId;
  rule: HeuristicRule;
  onMethod: (m: MethodId) => void;
  onRule: (r: HeuristicRule) => void;
  testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-2xs uppercase tracking-wider text-muted">
        {label}
        <select className="ctl mt-1 w-full" value={method} onChange={(e) => onMethod(e.target.value as MethodId)} data-testid={`${testId}-method`}>
          {PRIMARY_METHODS.map((m) => (
            <option key={m} value={m}>
              {methodLabel(m)}
            </option>
          ))}
        </select>
      </label>
      {method === "heuristics" && (
        <label className="block text-2xs uppercase tracking-wider text-muted">
          Which rule
          <select className="ctl mt-1 w-full" value={rule} onChange={(e) => onRule(e.target.value as HeuristicRule)} data-testid={`${testId}-rule`}>
            {HEURISTIC_RULES.map((r) => (
              <option key={r} value={r}>
                {methodLabel("heuristics", r).replace(/^Simple rule: /, "")}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function Controls({
  seedsA,
  seedInfo,
  evalSeeds,
}: {
  seedsA: number[];
  seedInfo: (seed: number) => string;
  evalSeeds: number[];
}) {
  const s = useLab();
  return (
    <div className="panel flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div>
        <div className="panel-title">Week</div>
        <div className="mt-1.5 grid grid-cols-5 gap-1" role="radiogroup" aria-label="Week">
          {WEEKS.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={s.selectedWeek === w}
              className={`btn justify-center px-0 text-xs ${s.selectedWeek === w ? "btn-on" : ""}`}
              onClick={() => s.set({ selectedWeek: w, selectedRequestId: null, currentTime: null, playing: false })}
              data-testid={`week-${w}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <MethodPicker
        label={s.compareMode ? "Method A" : "Method"}
        method={s.methodA}
        rule={s.ruleA}
        onMethod={(m) => s.set({ methodA: m, selectedRequestId: null })}
        onRule={(r) => s.set({ ruleA: r, selectedRequestId: null })}
        testId="a"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-2xs uppercase tracking-wider text-muted">
          Training run
          {seedsA.length === 0 ? (
            <div className="ctl mt-1 text-muted" title="Simple rules are not trained">
              n/a
            </div>
          ) : (
            <select
              className="ctl mt-1 w-full"
              value={s.trainingSeed}
              onChange={(e) => s.set({ trainingSeed: Number(e.target.value), selectedRequestId: null })}
              data-testid="training-seed"
            >
              {seedsA.map((x, i) => (
                <option key={x} value={x}>
                  Run {i + 1} {seedInfo(x)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="block text-2xs uppercase tracking-wider text-muted">
          Test run
          <select
            className="ctl mt-1 w-full"
            value={s.evaluationSeed}
            onChange={(e) => s.set({ evaluationSeed: Number(e.target.value), selectedRequestId: null })}
            data-testid="evaluation-seed"
          >
            {evalSeeds.map((x, i) => (
              <option key={x} value={x}>
                Run {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="border-t border-line pt-3">
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <span>Compare two methods</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={s.compareMode}
            onChange={(e) => s.set({ compareMode: e.target.checked })}
            data-testid="compare-toggle"
          />
        </label>
        {s.compareMode && (
          <div className="mt-2">
            <MethodPicker
              label="Method B"
              method={s.methodB}
              rule={s.ruleB}
              onMethod={(m) => s.set({ methodB: m })}
              onRule={(r) => s.set({ ruleB: r })}
              testId="b"
            />
            <p className="mt-1.5 text-2xs text-muted">Same week and runs as A.</p>
          </div>
        )}
      </div>
      <div className="border-t border-line pt-3">
        <div className="panel-title">Show on timeline</div>
        {(["maintenance", "visibility"] as const).map((l) => (
          <label key={l} className="mt-1.5 flex cursor-pointer items-center justify-between text-sm">
            <span>{l === "maintenance" ? "Antenna maintenance" : "When each spacecraft is visible"}</span>
            <input type="checkbox" className="h-4 w-4" checked={s.layers[l]} onChange={() => s.toggleLayer(l)} data-testid={`layer-${l}`} />
          </label>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ metrics
const HEADLINE_METRICS = ["duration_fulfillment", "full_satisfaction_rate", "unmet_hours"] as const;
const MORE_METRICS = ["minimum_satisfaction_rate", "mission_fairness"] as const;

export const findGap = (gaps: GapsFile, id: string) => gaps.needs_confirmation.find((r) => (r.id ?? r["#"]) === id);

export function confirmFor(method: MethodId, gaps: GapsFile): { id: string; text: string } | null {
  const id = method === "fixed_bee" ? "N1" : method === "plain_ppo" ? "N2" : method === "heuristics" ? "N3" : null;
  if (!id) return null;
  const row = findGap(gaps, id);
  return row ? { id, text: `${row["Item"]}: ${row["What needs confirming"]}` } : null;
}

export function MetricsPanel({
  tag,
  label,
  method,
  rule,
  run,
  series,
  seriesKey,
  paired,
  week,
  schedule,
  hasScheduleFile,
  gaps,
  compact,
}: {
  tag: "A" | "B";
  label: string;
  color: string;
  method: MethodId;
  rule: HeuristicRule;
  run: RunRow | undefined;
  series: SeriesSummary | undefined;
  seriesKey: string;
  paired: PairedFile;
  week: WeekId;
  schedule: Schedule | null;
  hasScheduleFile: boolean;
  gaps: GapsFile;
  compact: boolean;
}) {
  const confirm = confirmFor(method, gaps);
  void paired;
  void seriesKey;
  return (
    <section className="panel p-3" data-testid={`metrics-${tag}`} aria-label={`Metrics for ${label}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <MethodGlyph method={method} rule={rule} size={13} />
        <h2 className="text-base font-semibold text-fg">{label}</h2>
        {confirm && <ConfirmMarker id={confirm.id} text={confirm.text} />}
      </div>
      {!run ? (
        <div className="mt-2">
          <Pending>No run exists for this method, week and seed combination.</Pending>
        </div>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <EvidenceBadge kind={evidenceFromStage(run.evidence_stage)} />
            {run.source === "recomputed from schedules" && <EvidenceBadge kind="recomputed" />}
            {!run.protocol && <EvidenceBadge kind="supplementary" label="supplementary seed" />}
          </div>
          <div className="mt-1.5 text-xs text-muted">
            Week {week} · run {run.training_seed ?? "n/a"} / {run.evaluation_seed}
          </div>
          <div className={`mt-3 grid grid-cols-1 ${compact ? "gap-1.5" : "gap-2"}`}>
            {HEADLINE_METRICS.map((m) => (
              <MetricCard
                key={m}
                testId={`metric-${tag}-${m}`}
                label={METRIC_LABEL[m]}
                metricKey={m}
                value={run[m]}
                large={!compact}
                accent={m === "duration_fulfillment" ? seriesTextColor(method) : undefined}
                context={series ? `this week's average ${fmtMain(m, series.per_week[week]?.mean[m])}` : undefined}
              />
            ))}
          </div>
          <SpreadNote className="mt-1.5" />
          <Details summary="More" testId={`more-${tag}`}>
            <div className="grid grid-cols-1 gap-1.5">
              {MORE_METRICS.map((m) => (
                <MetricCard key={m} testId={`metric-${tag}-${m}`} label={METRIC_LABEL[m]} metricKey={m} value={run[m]} />
              ))}
            </div>
          </Details>
          <div className="mt-2 flex items-center justify-between rounded-md border border-ok-fg/30 bg-ok-bg px-2.5 py-2 text-sm">
            <span>Rule violations</span>
            <span className="num font-semibold text-ok-fg" data-testid={`violations-${tag}`} data-value={run.constraint_violations ?? ""}>
              {run.constraint_violations === 0 ? "0 ✓" : fmtMetric("constraint_violations", run.constraint_violations)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm">
            <div className="rounded-md bg-sunken px-2 py-1">
              Booked{" "}
              <span className="num font-semibold" data-testid={`scheduled-count-${tag}`} data-value={run.scheduled_requests ?? ""}>
                {run.scheduled_requests}
              </span>{" "}
              <span className="text-muted">of {run.number_of_requests}</span>
            </div>
            <div className="rounded-md bg-sunken px-2 py-1">
              Not booked{" "}
              <span className="num font-semibold" data-testid={`unscheduled-count-${tag}`} data-value={schedule ? schedule.n_unscheduled : ""}>
                {schedule ? schedule.n_unscheduled : "n/a"}
              </span>
            </div>
          </div>
          {!hasScheduleFile && (
            <div className="mt-2">
              <Pending>No schedule saved for this run. Numbers only.</Pending>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------ request detail
export function DetailCard({
  windows,
  complexes,
  scheduleA,
  scheduleB,
  labelA,
  labelB,
}: {
  windows: Windows;
  complexes: ComplexesFile;
  scheduleA: Schedule | null;
  scheduleB: Schedule | null;
  labelA: string;
  labelB: string;
}) {
  const id = useLab((s) => s.selectedRequestId);
  const complexNames = (antennas: string[]) => {
    const names: string[] = [];
    for (const a of antennas) {
      const cid = complexes.antennas.find((x) => x.id === a)?.complex;
      const name = complexes.complexes.find((c) => c.id === cid)?.name;
      if (name && !names.includes(name)) names.push(name);
    }
    return names;
  };
  const set = useLab((s) => s.set);
  if (!id) return <div className="panel p-3 text-xs text-muted">Click a bar, a beam or a spacecraft to see that request.</div>;
  const req = windows.requestById.get(id);
  if (!req) return null;
  const runs = [
    { label: labelA, s: scheduleA },
    ...(scheduleB ? [{ label: labelB, s: scheduleB }] : []),
  ];
  return (
    <section className="panel p-3 text-xs" data-testid="detail-card" aria-label="Selected request">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Request from mission {req.mission}</h2>
        <button className="btn px-1.5 py-0.5 text-2xs" onClick={() => set({ selectedRequestId: null })} aria-label="Clear selection">
          Clear
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-[110px_1fr] gap-x-2 gap-y-1">
        <dt className="text-muted">Asked for</dt>
        <dd>
          {fmtDuration(req.duration_seconds)} <span className="text-muted">(minimum {fmtDuration(req.minimum_duration_seconds)})</span>
        </dd>
        <dt className="text-muted">Could run between</dt>
        <dd>
          {fmtTime(req.time_window_start)} to {fmtTime(req.time_window_end)}
        </dd>
        <dt className="text-muted">Possible antennas</dt>
        <dd className="break-words">{req.resource_options.join(", ")}</dd>
      </dl>
      <Details summary="Show raw values" testId="detail-raw">
        <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5">
          <dt className="text-muted">Request id</dt>
          <dd data-testid="detail-mission">{req.request_id}</dd>
        </dl>
      </Details>
      {runs.map(({ label, s }) => {
        const row = s?.rows.find((r) => r.request_id === id);
        return (
          <div key={label} className="mt-2 rounded-md border border-line p-2" data-testid="detail-run">
            <div className="flex items-center justify-between">
              <span className="font-medium">{label}</span>
              {row ? (
                <span className="rounded bg-ok-bg px-1.5 font-medium text-ok-fg" data-testid="detail-status">
                  booked
                </span>
              ) : (
                <span className="rounded bg-danger-bg px-1.5 font-medium text-danger-fg" data-testid="detail-status">
                  not booked
                </span>
              )}
            </div>
            {row && (
              <dl className="mt-1 grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5">
                <dt className="text-muted">Booked on</dt>
                <dd>
                  {row.antennas.join(" + ")}
                  {row.antennas.length > 1 && (
                    <span className="block text-muted" data-testid="array-note">
                      {complexNames(row.antennas).length > 1
                        ? `Two sites working together: ${complexNames(row.antennas).join(" and ")}`
                        : `At ${complexNames(row.antennas)[0]}`}
                    </span>
                  )}
                </dd>
                <dt className="text-muted">Starts</dt>
                <dd className="num">{fmtTime(row.start)}</dd>
                <dt className="text-muted">Ends</dt>
                <dd className="num">{fmtTime(row.end)}</dd>
                <dt className="text-muted">Got</dt>
                <dd>{fmtDuration(row.allocated_seconds)}</dd>
                <dt className="text-muted">Spacecraft visible</dt>
                <dd className="num">
                  {fmtTime(row.visibility_start)} to {fmtTime(row.visibility_end)}
                </dd>
              </dl>
            )}
            {row && (
              <button className="btn mt-1.5 px-1.5 py-0.5 text-2xs" onClick={() => set({ currentTime: row.start, playing: false })}>
                Go to start
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ------------------------------------------------------------ unscheduled list and compare summary
export function UnscheduledList({ windows, schedule, tag, label }: { windows: Windows; schedule: Schedule | null; tag: "A" | "B"; label: string }) {
  const sel = useLab((s) => s.selectedRequestId);
  const set = useLab((s) => s.set);
  const items = useMemo(
    () =>
      (schedule?.unscheduled ?? [])
        .map((id) => windows.requestById.get(id)!)
        .filter(Boolean)
        .sort((a, b) => a.time_window_start - b.time_window_start),
    [schedule, windows],
  );
  if (!schedule) return null;
  return (
    <section className="panel flex min-h-0 flex-col p-3" aria-label={`Unscheduled requests for ${label}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Not booked ({tag})</h2>
        <span className="num text-xs text-muted" data-testid={`unscheduled-list-count-${tag}`} data-value={items.length}>
          {items.length} of {schedule.n_requests}
        </span>
      </div>
      <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 text-xs">
        {items.map((r) => (
          <li key={r.request_id}>
            <button
              className={`flex w-full items-center gap-2 rounded border-l-2 border-dashed border-danger-fg/60 px-1.5 py-0.5 text-left text-muted hover:bg-hover hover:text-fg ${sel === r.request_id ? "bg-selected text-fg" : ""}`}
              onClick={() => set({ selectedRequestId: r.request_id })}
            >
              <span className="w-10 shrink-0 text-muted">{r.mission}</span>
              <span className="num truncate">{r.request_id}</span>
              <span className="ml-auto shrink-0 text-muted">{fmtDuration(r.duration_seconds)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompareSummary({
  scheduleA,
  scheduleB,
  labelA,
  labelB,
  colorA,
  colorB,
  windows,
  pairNote,
}: {
  pairNote?: { id: string; text: string } | null;
  scheduleA: Schedule;
  scheduleB: Schedule;
  labelA: string;
  labelB: string;
  colorA: string;
  colorB: string;
  windows: Windows;
}) {
  const set = useLab((s) => s.set);
  const [tab, setTab] = useState<"A" | "B">("A");
  const a = new Set(scheduleA.rows.map((r) => r.request_id));
  const b = new Set(scheduleB.rows.map((r) => r.request_id));
  const onlyA = [...a].filter((x) => !b.has(x)).sort();
  const onlyB = [...b].filter((x) => !a.has(x)).sort();
  const both = [...a].filter((x) => b.has(x)).length;
  const neither = windows.n_requests - a.size - onlyB.length;
  const list = tab === "A" ? onlyA : onlyB;
  return (
    <section className="panel p-3 text-xs" data-testid="compare-summary" aria-label={`Compare ${labelA} and ${labelB}`}>
      <h2 className="text-sm font-semibold">Same week, same test run</h2>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <div className="rounded bg-sunken px-2 py-1">
          Booked by both <span className="num font-semibold">{both}</span>
        </div>
        <div className="rounded bg-sunken px-2 py-1">
          By neither <span className="num font-semibold">{neither}</span>
        </div>
        <button className={`rounded px-2 py-1 text-left ${tab === "A" ? "ring-1" : ""}`} style={{ background: `${colorA}22`, ["--tw-ring-color" as string]: colorA }} onClick={() => setTab("A")}>
          Only A <span className="num font-semibold" data-testid="only-a">{onlyA.length}</span>
        </button>
        <button className={`rounded px-2 py-1 text-left ${tab === "B" ? "ring-1" : ""}`} style={{ background: `${colorB}22`, ["--tw-ring-color" as string]: colorB }} onClick={() => setTab("B")}>
          Only B <span className="num font-semibold" data-testid="only-b">{onlyB.length}</span>
        </button>
      </div>
      <div className="mt-1 text-2xs text-muted">Dashed means only one method booked it.</div>
      {pairNote && (
        <div className="mt-2 text-xs text-muted" data-testid="pair-note-n4">
          <ConfirmMarker id={pairNote.id} text={pairNote.text} />
        </div>
      )}
      <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto">
        {list.map((id) => (
          <li key={id}>
            <button className="num w-full rounded px-1 text-left hover:bg-hover" onClick={() => set({ selectedRequestId: id })}>
              {windows.requestById.get(id)?.mission} · {id}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
