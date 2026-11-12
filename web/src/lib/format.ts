import { utcFormat } from "d3";
import type { MetricKey } from "../data/types";

export const METRIC_LABEL: Record<MetricKey | "scheduled_requests" | "allocated_hours" | "number_of_requests", string> = {
  duration_fulfillment: "Duration fulfillment",
  minimum_satisfaction_rate: "Minimum satisfaction",
  full_satisfaction_rate: "Full satisfaction",
  unmet_hours: "Unmet hours",
  mission_fairness: "Mission fairness",
  constraint_violations: "Constraint violations",
  runtime_seconds: "Runtime (s)",
  scheduled_requests: "Scheduled requests",
  allocated_hours: "Allocated hours",
  number_of_requests: "Requests in week",
};

/** Display formatting only; values are never altered before formatting. */
export function fmtMetric(key: string, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  if (key === "unmet_hours" || key === "allocated_hours") return v.toFixed(1);
  if (key === "runtime_seconds") return v.toFixed(1);
  if (key === "constraint_violations" || key === "scheduled_requests" || key === "number_of_requests")
    return String(Math.round(v * 1000) / 1000);
  return v.toFixed(4);
}

export function fmtSigned(key: string, v: number): string {
  const s = fmtMetric(key, Math.abs(v));
  return (v > 0 ? "+" : v < 0 ? "−" : "±") + s;
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

export function methodLabel(method: string, rule?: string): string {
  const base: Record<string, string> = {
    heuristics: "Heuristic",
    plain_ppo: "Plain PPO",
    fixed_bee: "Fixed BEE",
    adaptive_bee: "Adaptive BEE (A6)",
    adaptive_a3_first_pass: "First-pass A3",
  };
  const rules: Record<string, string> = {
    random_feasible: "random feasible",
    earliest_window_end: "earliest window-end",
    shortest_duration: "shortest duration",
    least_flexible: "least flexible",
    weighted_composite_H4: "weighted composite H4",
  };
  return method === "heuristics" && rule ? `${base[method]}: ${rules[rule] ?? rule}` : base[method] ?? method;
}
