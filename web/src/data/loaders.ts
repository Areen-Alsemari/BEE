/** Typed, cached, validated loaders for public/data. Each file is fetched once and only when needed. */
import { useEffect, useState } from "react";
import { DataError, columnIndex, expectFields } from "./validate";
import {
  EXTRA_KEYS,
  METRIC_KEYS,
  type AblationFile,
  type ComplexesFile,
  type GapsFile,
  type MethodsFile,
  type MissionsFile,
  type PairedFile,
  type ProtocolFile,
  type RunRow,
  type RunsFile,
  type Schedule,
  type ScheduleFile,
  type ScheduleIndexFile,
  type SummaryFile,
  type ThresholdsFile,
  type WeekId,
  type Windows,
  type WindowsFile,
} from "./types";

const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<unknown>>();

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new DataError(path, `HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new DataError(path, "not valid JSON");
  }
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = load();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}

// ------------------------------------------------------------------ individual loaders
export const loadMethods = () =>
  cached("methods.json", async () => {
    const d = (await fetchJson("methods.json")) as MethodsFile;
    expectFields("methods.json", d, { methods: "array" });
    d.methods.forEach((m, i) =>
      expectFields("methods.json", m, { id: "string", name: "string", description: "string", primary: "boolean" }, `methods[${i}].`),
    );
    return d;
  });

export const loadMissions = () =>
  cached("missions.json", async () => {
    const d = (await fetchJson("missions.json")) as MissionsFile;
    expectFields("missions.json", d, { missions: "array" });
    d.missions.forEach((m, i) => expectFields("missions.json", m, { id: "string", color: "string" }, `missions[${i}].`));
    return d;
  });

export const loadComplexes = () =>
  cached("complexes.json", async () => {
    const d = (await fetchJson("complexes.json")) as ComplexesFile;
    expectFields("complexes.json", d, { complexes: "array", antennas: "array", note: "string" });
    d.complexes.forEach((c, i) =>
      expectFields("complexes.json", c, { id: "string", name: "string", lat: "number", lon: "number" }, `complexes[${i}].`),
    );
    return d;
  });

const RUN_COLS = [
  "method",
  "variant",
  "fold",
  "test_week",
  "training_seed",
  "evaluation_seed",
  "protocol",
  "supplementary_label",
  "evidence_stage",
  "source",
  ...METRIC_KEYS,
  ...EXTRA_KEYS,
] as const;

export const loadRuns = () =>
  cached("results_runs.json", async () => {
    const d = (await fetchJson("results_runs.json")) as RunsFile;
    expectFields("results_runs.json", d, { columns: "array", rows: "array" });
    const idx = columnIndex("results_runs.json", d.columns, RUN_COLS);
    const rows: RunRow[] = d.rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of RUN_COLS) o[c] = r[idx[c]];
      return o as unknown as RunRow;
    });
    if (rows.length === 0) throw new DataError("results_runs.json", "no rows");
    return { rows, notes: d.notes };
  });

export const loadSummary = () =>
  cached("results_summary.json", async () => {
    const d = (await fetchJson("results_summary.json")) as SummaryFile;
    expectFields("results_summary.json", d, { series: "object", supplementary: "object", aggregation: "string" });
    for (const [k, s] of Object.entries(d.series)) {
      expectFields("results_summary.json", s, { per_week: "object", overall: "object" }, `series.${k}.`);
      expectFields("results_summary.json", s.overall, { mean: "object", fold_sd: "object", n_folds: "number" }, `series.${k}.overall.`);
      for (const m of METRIC_KEYS)
        expectFields("results_summary.json", s.overall.mean, { [m]: "number|null" }, `series.${k}.overall.mean.`);
    }
    return d;
  });

export const loadPaired = () =>
  cached("paired.json", async () => {
    const d = (await fetchJson("paired.json")) as PairedFile;
    expectFields("paired.json", d, { pairs: "array", supplementary_pairs: "array", w50_seed_spread: "object", unit: "string" });
    return d;
  });

export const loadScheduleIndex = () =>
  cached("schedules/index.json", async () => {
    const d = (await fetchJson("schedules/index.json")) as ScheduleIndexFile;
    expectFields("schedules/index.json", d, { files: "array", default_evaluation_seed: "number" });
    return d;
  });

const SCHED_FIELDS = [
  "request_id",
  "mission",
  "antennas",
  "start",
  "end",
  "visibility_start",
  "visibility_end",
  "reservation_start",
  "reservation_end",
  "allocated_seconds",
] as const;

export const loadSchedule = (file: string) =>
  cached(`schedules/${file}`, async () => {
    const path = `schedules/${file}`;
    const d = (await fetchJson(path)) as ScheduleFile;
    expectFields(path, d, {
      method: "string",
      variant: "string",
      test_week: "string",
      n_requests: "number",
      n_scheduled: "number",
      n_unscheduled: "number",
      fields: "array",
      rows: "array",
      unscheduled: "array",
    });
    const idx = columnIndex(path, d.fields, SCHED_FIELDS);
    const rows = d.rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of SCHED_FIELDS) o[c] = r[idx[c]];
      return o as unknown as Schedule["rows"][number];
    });
    if (rows.length !== d.n_scheduled) throw new DataError(path, `row count ${rows.length} != n_scheduled ${d.n_scheduled}`);
    if (d.unscheduled.length !== d.n_unscheduled)
      throw new DataError(path, `unscheduled list ${d.unscheduled.length} != n_unscheduled ${d.n_unscheduled}`);
    return { ...d, rows } as Schedule;
  });

export const loadWindows = (week: WeekId) =>
  cached(`windows/${week}.json`, async () => {
    const path = `windows/${week}.json`;
    const d = (await fetchJson(path)) as WindowsFile;
    expectFields(path, d, { week: "string", n_requests: "number", span: "array", antennas: "array", requests: "array", visibility: "array", maintenance: "array" });
    const ri = columnIndex(path, d.request_fields, [
      "request_id",
      "mission",
      "user",
      "duration_seconds",
      "minimum_duration_seconds",
      "setup_seconds",
      "teardown_seconds",
      "time_window_start",
      "time_window_end",
      "resource_options",
    ] as const);
    const vi = columnIndex(path, d.visibility_fields, ["request_index", "resource_option", "rise", "set", "feasible_start", "feasible_end"] as const);
    const mi = columnIndex(path, d.maintenance_fields, ["antenna", "start", "end"] as const);
    const requests = d.requests.map((r) => {
      const o: Record<string, unknown> = {};
      for (const [k, i] of Object.entries(ri)) o[k] = r[i as number];
      return o as unknown as Windows["requests"][number];
    });
    if (requests.length !== d.n_requests) throw new DataError(path, `request count ${requests.length} != n_requests ${d.n_requests}`);
    const out: Windows = {
      week: d.week,
      n_requests: d.n_requests,
      span: d.span,
      antennas: d.antennas,
      requests,
      requestById: new Map(requests.map((r) => [r.request_id, r])),
      visibility: d.visibility.map((r) => {
        const o: Record<string, unknown> = {};
        for (const [k, i] of Object.entries(vi)) o[k] = r[i as number];
        return o as unknown as Windows["visibility"][number];
      }),
      maintenance: d.maintenance.map((r) => ({ antenna: r[mi.antenna] as string, start: r[mi.start] as number, end: r[mi.end] as number })),
    };
    return out;
  });

export const loadGaps = () =>
  cached("gaps.json", async () => {
    const d = (await fetchJson("gaps.json")) as GapsFile;
    expectFields("gaps.json", d, { open: "array", needs_confirmation: "array", resolved: "array", caveats: "array" });
    return d;
  });

export const loadProtocol = () =>
  cached("protocol.json", async () => {
    const d = (await fetchJson("protocol.json")) as ProtocolFile;
    expectFields("protocol.json", d, { weeks: "array", weekly_request_totals: "object", evaluation_seeds: "array", training_seeds: "object", selection: "object" });
    return d;
  });

export const loadAblation = () =>
  cached("ablation.json", async () => {
    const d = (await fetchJson("ablation.json")) as AblationFile;
    expectFields("ablation.json", d, { configurations: "array", references: "array", stage_badges: "object", evidence_note: "string" });
    return d;
  });

export const loadThresholds = () =>
  cached("thresholds.json", async () => {
    const d = (await fetchJson("thresholds.json")) as ThresholdsFile;
    expectFields("thresholds.json", d, { traces: "array", diagnostic: "object" });
    return d;
  });

// ------------------------------------------------------------------ React hook
export type Loadable<T> = { status: "loading" } | { status: "error"; error: Error } | { status: "ready"; data: T };

/** Run a loader keyed by deps; returns loading / error / ready. */
export function useData<T>(load: (() => Promise<T>) | null, deps: unknown[]): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  useEffect(() => {
    if (!load) return;
    let alive = true;
    setState({ status: "loading" });
    load().then(
      (data) => alive && setState({ status: "ready", data }),
      (error: Error) => alive && setState({ status: "error", error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
