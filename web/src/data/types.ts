/** Types for every file in public/data, matching scripts/export_data.py. */
import type { HeuristicRule, MethodId } from "../config/theme";

export type WeekId = "W10" | "W20" | "W30" | "W40" | "W50";
export const WEEKS: WeekId[] = ["W10", "W20", "W30", "W40", "W50"];
export type WeekKey = `${WeekId}_2018`;

export const METRIC_KEYS = [
  "duration_fulfillment",
  "minimum_satisfaction_rate",
  "full_satisfaction_rate",
  "unmet_hours",
  "mission_fairness",
  "constraint_violations",
  "runtime_seconds",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export const EXTRA_KEYS = ["scheduled_requests", "allocated_hours", "number_of_requests"] as const;
export type ExtraKey = (typeof EXTRA_KEYS)[number];
export type MetricRecord = Record<MetricKey | ExtraKey, number | null>;

// methods.json
export interface MethodInfo {
  id: MethodId;
  name: string;
  color_key: string;
  primary: boolean;
  description: string;
  variant?: string;
  rules?: { id: HeuristicRule; name: string }[];
}
export interface MethodsFile {
  methods: MethodInfo[];
}

// missions.json
export interface MissionsFile {
  missions: { id: string; color: string; color_dark: string }[];
  source: string;
}

// complexes.json
export interface Complex {
  id: "goldstone" | "canberra" | "madrid";
  name: string;
  country: string;
  dss_min: number;
  dss_max: number;
  lat: number;
  lon: number;
}
export interface ComplexesFile {
  note: string;
  complexes: Complex[];
  antennas: { id: string; complex: Complex["id"] }[];
  source: string;
}

// results_runs.json
export interface RunRow extends MetricRecord {
  method: MethodId;
  variant: string;
  fold: number;
  test_week: WeekKey;
  training_seed: number | null;
  evaluation_seed: number;
  protocol: boolean;
  supplementary_label: string | null;
  evidence_stage: string;
  source: string;
}
export interface RunsFile {
  columns: string[];
  notes: Record<string, string>;
  rows: (string | number | boolean | null)[][];
}

// results_summary.json
export interface WeekSummary {
  fold: number;
  test_week: WeekKey;
  n_training_seeds: number;
  training_seeds: number[] | null;
  n_eval_seeds_per_training_seed: number;
  mean: MetricRecord;
  eval_seed_sd_duration_fulfillment: number;
  training_seed_sd_duration_fulfillment: number | null;
  per_training_seed_duration_fulfillment: Record<string, number> | null;
  run_min_duration_fulfillment: number;
  run_max_duration_fulfillment: number;
}
export interface OverallSummary {
  n_folds: number;
  mean: MetricRecord;
  fold_sd: MetricRecord;
  fold_min: MetricRecord;
  fold_max: MetricRecord;
}
export interface SeriesSummary {
  per_week: Record<WeekId, WeekSummary>;
  overall: OverallSummary;
}
export interface SummaryFile {
  aggregation: string;
  uncertainty: string;
  protocol_runs: string;
  fixed_bee_runtime_note: string;
  series: Record<string, SeriesSummary>;
  supplementary: Record<string, SeriesSummary & { label: string }>;
}

// paired.json
export interface PairMetric {
  direction: string;
  per_fold: { fold: number; test_week: WeekId; first: number; second: number; difference: number }[];
  mean_difference: number;
  folds_first_better: number;
  folds_equal: number;
  min_difference: number;
  max_difference: number;
  bootstrap_95_interval: [number, number];
  bootstrap_note: string;
}
export interface Pair {
  first: string;
  second: string;
  label: string;
  unit: string;
  metrics: Record<string, PairMetric>;
  scale: { definition: string; metrics: Record<string, { first_w50_sd: number; second_w50_sd: number; band_half_width: number }> };
}
export interface SeedSpread {
  kind: string;
  metrics: Record<string, { per_training_seed?: Record<string, number>; per_evaluation_seed?: Record<string, number>; sd: number; range: number }>;
}
export interface PairedFile {
  w50_seed_spread_by_metric: Record<string, SeedSpread>;
  unit: string;
  pairs: Pair[];
  supplementary_pairs: Pair[];
  w50_seed_spread: Record<
    string,
    {
      kind: string;
      metric: string;
      per_training_seed?: Record<string, number>;
      per_evaluation_seed?: Record<string, number>;
      sd: number;
      range: number;
    }
  >;
}

// schedules
export interface ScheduleIndexEntry {
  file: string;
  method: MethodId;
  variant: string;
  week: WeekId;
  training_seed: number | null;
  evaluation_seed: number;
}
export interface ScheduleIndexFile {
  files: ScheduleIndexEntry[];
  default_evaluation_seed: number;
  note: string;
}
export interface ScheduleRow {
  request_id: string;
  mission: string;
  antennas: string[];
  start: number;
  end: number;
  visibility_start: number;
  visibility_end: number;
  reservation_start: number;
  reservation_end: number;
  allocated_seconds: number;
}
export interface ScheduleFile {
  method: MethodId;
  variant: string;
  test_week: WeekKey;
  fold: number;
  training_seed: number | null;
  evaluation_seed: number;
  n_requests: number;
  n_scheduled: number;
  n_unscheduled: number;
  source_file: string;
  fields: string[];
  rows: unknown[][];
  unscheduled: string[];
}
export interface Schedule extends Omit<ScheduleFile, "rows"> {
  rows: ScheduleRow[];
}

// windows
export interface RequestInfo {
  request_id: string;
  mission: string;
  user: string;
  duration_seconds: number;
  minimum_duration_seconds: number;
  setup_seconds: number;
  teardown_seconds: number;
  time_window_start: number;
  time_window_end: number;
  resource_options: string[];
}
export interface VisibilityWindow {
  request_index: number;
  resource_option: string;
  rise: number;
  set: number;
  feasible_start: number;
  feasible_end: number;
}
export interface WindowsFile {
  week: WeekKey;
  n_requests: number;
  span: [number, number];
  antennas: { id: string; complex: Complex["id"] }[];
  request_fields: string[];
  requests: unknown[][];
  visibility_fields: string[];
  visibility: unknown[][];
  maintenance_fields: string[];
  maintenance: unknown[][];
}
export interface Windows {
  week: WeekKey;
  n_requests: number;
  span: [number, number];
  antennas: { id: string; complex: Complex["id"] }[];
  requests: RequestInfo[];
  requestById: Map<string, RequestInfo>;
  visibility: VisibilityWindow[];
  maintenance: { antenna: string; start: number; end: number }[];
}

// gaps.json
export interface GapsFile {
  source: string;
  open: Record<string, string>[];
  needs_confirmation: Record<string, string>[];
  resolved: Record<string, string>[];
  caveats: Record<string, string>[];
}

// protocol.json (only fields used by the UI are typed strictly)
export interface ProtocolFile {
  weeks: WeekKey[];
  weekly_request_totals: Record<WeekId, number>;
  evaluation_seeds: number[];
  training_seeds: { folds_1_4: number[]; W50: number[] };
  aggregation_order: string[];
  timesteps: Record<string, unknown>;
  selection: Record<string, Record<string, unknown>>;
  notebooks: Record<string, string>;
  [k: string]: unknown;
}

// ablation.json and thresholds.json are typed loosely until their pages are built
export type AblationFile = Record<string, unknown> & { configurations: unknown[]; references: unknown[] };
export type ThresholdsFile = Record<string, unknown> & { traces: unknown[]; diagnostic: unknown };
