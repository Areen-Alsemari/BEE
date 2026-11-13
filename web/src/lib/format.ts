import { utcFormat } from "d3";
import type { MetricKey } from "../data/types";

/** Plain-language labels (docs/COPY_DECK.md section 1.1). Raw field names stay in Details/tooltips only. */
export const METRIC_LABEL: Record<MetricKey | "scheduled_requests" | "allocated_hours" | "number_of_requests", string> = {
  duration_fulfillment: "Requested time delivered",
  minimum_satisfaction_rate: "Got at least their minimum",
  full_satisfaction_rate: "Fully served",
  unmet_hours: "Hours not delivered",
  mission_fairness: "Fairness across missions",
  constraint_violations: "Rule violations",
  runtime_seconds: "Time to build a week",
  scheduled_requests: "Booked requests",
  allocated_hours: "Hours booked",
  number_of_requests: "Requests that week",
};

/** One-sentence definitions, written from the code (environment.py get_episode_metrics, validator.py). */
export const METRIC_DEFINITION: Record<MetricKey, string> = {
  duration_fulfillment: "Share of all antenna time requested that week that the schedule actually delivered.",
  minimum_satisfaction_rate: "Share of that week's requests scheduled for at least their minimum duration.",
  full_satisfaction_rate: "Share of that week's requests that got their full requested duration.",
  unmet_hours: "Requested hours that the schedule did not deliver.",
  mission_fairness: "How evenly missions got their requested time, from 0 to 1. 1 means an equal share for every mission.",
  constraint_violations: "Schedule entries that break a rule: duplicates, wrong duration, outside visibility, during maintenance, antenna overlap, or wrong antenna.",
  runtime_seconds: "Seconds of computer time to build one week's schedule.",
};

/** Metrics shown as a share (0-1 in the data) are written as percentages in the main view. */
export const PERCENT_METRICS = new Set(["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "mission_fairness"]);

/** Display formatting only; values are never altered before formatting. Exact fractions (4dp) for tables, Details and downloads. */
export function fmtMetric(key: string, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  if (key === "unmet_hours" || key === "allocated_hours") return v.toFixed(1);
  if (key === "runtime_seconds") return v.toFixed(1);
  if (key === "constraint_violations" || key === "scheduled_requests" || key === "number_of_requests")
    return String(Math.round(v * 1000) / 1000);
  return v.toFixed(4);
}

/** Main-view display for rate metrics: a percentage. Falls back to fmtMetric for non-rate metrics. */
export function fmtMain(key: string, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  if (PERCENT_METRICS.has(key)) return `${(v * 100).toFixed(1)}%`;
  return fmtMetric(key, v);
}

export function fmtSigned(key: string, v: number): string {
  const s = fmtMetric(key, Math.abs(v));
  return (v > 0 ? "+" : v < 0 ? "−" : "±") + s;
}

/** Plain words for a signed difference: "higher by X", "lower by X", "about the same". */
export function fmtWords(key: string, v: number, tol = 0): string {
  if (Math.abs(v) <= tol) return "about the same";
  const s = fmtMain(key, Math.abs(v));
  return v > 0 ? `higher by ${s}` : `lower by ${s}`;
}

const tsFmt = utcFormat("%a %d %b %H:%M");
const dayFmt = utcFormat("%a %d %b");
export const fmtTime = (epoch: number) => `${tsFmt(new Date(epoch * 1000))} UTC`;
export const fmtDay = (epoch: number) => dayFmt(new Date(epoch * 1000));
export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h} h ${m.toString().padStart(2, "0")} min` : `${m} min`;
}

/** Primary names keep PPO; the configuration code (A6, F2...) is a small secondary label, not in the main name. */
export function methodLabel(method: string, rule?: string): string {
  const base: Record<string, string> = {
    heuristics: "Simple rule",
    plain_ppo: "Plain PPO",
    fixed_bee: "Fixed BEE",
    adaptive_bee: "Adaptive BEE",
    adaptive_a3_first_pass: "Earlier adaptive BEE",
  };
  const rules: Record<string, string> = {
    random_feasible: "random allowed request",
    earliest_window_end: "earliest deadline first",
    shortest_duration: "shortest request first",
    least_flexible: "fewest viewing windows first",
    weighted_composite_H4: "weighted score",
  };
  return method === "heuristics" && rule ? `${base[method]}: ${rules[rule] ?? rule}` : base[method] ?? method;
}

/** Small secondary code shown beside a method's plain name (deck 1.2: "code in a small secondary label"). */
export function methodCode(method: string, rule?: string): string | null {
  if (method === "fixed_bee") return "F2";
  if (method === "adaptive_bee") return "A6";
  if (method === "adaptive_a3_first_pass") return "A3";
  if (method === "heuristics" && rule === "weighted_composite_H4") return "H4";
  return null;
}

/** Plain names for the ablation variants (deck 1.3), derived from their component flags. */
export const ABLATION_NAME: Record<string, string> = {
  A1: "All three signals, always adapting",
  A2: "Scarcity signal only",
  A3: "Contention signal only",
  A4: "Unmet-demand signal only",
  A5: "All three signals, weaker",
  A6: "All three signals, adapts under pressure",
};
