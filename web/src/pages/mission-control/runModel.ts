import type { HeuristicRule, MethodId } from "../../config/theme";
import type { RunRow, ScheduleIndexEntry, WeekId } from "../../data/types";

export const VARIANT: Record<Exclude<MethodId, "heuristics">, string> = {
  plain_ppo: "maskable_ppo",
  fixed_bee: "F2",
  adaptive_bee: "A6",
  adaptive_a3_first_pass: "A3",
};

export interface RunSpec {
  method: MethodId;
  rule: HeuristicRule;
  week: WeekId;
  trainingSeed: number;
  evaluationSeed: number;
}

export const variantOf = (method: MethodId, rule: HeuristicRule) => (method === "heuristics" ? rule : VARIANT[method]);
export const seriesId = (method: MethodId, rule: HeuristicRule) => (method === "heuristics" ? `heuristics/${rule}` : method);

export function trainingSeedsFor(rows: RunRow[], method: MethodId, rule: HeuristicRule, week: WeekId): number[] {
  if (method === "heuristics") return [];
  const v = variantOf(method, rule);
  const s = new Set<number>();
  for (const r of rows)
    if (r.method === method && r.variant === v && r.test_week === `${week}_2018` && r.training_seed !== null) s.add(r.training_seed);
  return [...s].sort((a, b) => a - b);
}

export function findRun(rows: RunRow[], spec: RunSpec): RunRow | undefined {
  const v = variantOf(spec.method, spec.rule);
  return rows.find(
    (r) =>
      r.method === spec.method &&
      r.variant === v &&
      r.test_week === `${spec.week}_2018` &&
      r.evaluation_seed === spec.evaluationSeed &&
      (spec.method === "heuristics" ? r.training_seed === null : r.training_seed === spec.trainingSeed),
  );
}

export function findScheduleEntry(index: ScheduleIndexEntry[], spec: RunSpec): ScheduleIndexEntry | undefined {
  const v = variantOf(spec.method, spec.rule);
  return index.find(
    (e) =>
      e.method === spec.method &&
      e.variant === v &&
      e.week === spec.week &&
      e.evaluation_seed === spec.evaluationSeed &&
      (spec.method === "heuristics" ? e.training_seed === null : e.training_seed === spec.trainingSeed),
  );
}
