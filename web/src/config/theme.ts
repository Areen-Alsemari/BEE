/**
 * Visual identity.
 *
 * Brand tones are taken from the logo (dominant navy #000030 / #183078 and mid-blue #3060a8).
 * The brand blue is reserved for project identity and is never a method colour.
 *
 * Method colours follow the Okabe-Ito colour-blind-safe set, chosen to stay apart from
 * the brand blue and from each other: orange, bluish green, reddish purple. Heuristics
 * share one warm-grey family with a shade per rule. The first-pass A3 entry is a lighter
 * tint of the adaptive colour and is always drawn dashed or outlined, never as a peer.
 */
export const BRAND = {
  navyDeep: "#000030",
  navy: "#0b1638",
  navyMid: "#183078",
  blue: "#3060a8",
  blueLight: "#6f95d6",
} as const;

export type MethodId = "heuristics" | "plain_ppo" | "fixed_bee" | "adaptive_bee" | "adaptive_a3_first_pass";
export type HeuristicRule =
  | "random_feasible"
  | "earliest_window_end"
  | "shortest_duration"
  | "least_flexible"
  | "weighted_composite_H4";

export const METHOD_COLORS: Record<MethodId, string> = {
  heuristics: "#bdb6a8",
  plain_ppo: "#E69F00",
  fixed_bee: "#009E73",
  adaptive_bee: "#CC79A7",
  adaptive_a3_first_pass: "#E8B9D3",
};

export const HEURISTIC_SHADES: Record<HeuristicRule, string> = {
  random_feasible: "#8f897d",
  earliest_window_end: "#e3ddd0",
  shortest_duration: "#6f6a60",
  least_flexible: "#a9a294",
  weighted_composite_H4: "#cbc4b6",
};

export const PRIMARY_METHODS: MethodId[] = ["heuristics", "plain_ppo", "fixed_bee", "adaptive_bee"];
export const HEURISTIC_RULES: HeuristicRule[] = [
  "random_feasible",
  "earliest_window_end",
  "shortest_duration",
  "least_flexible",
  "weighted_composite_H4",
];

export function seriesColor(method: MethodId, rule?: HeuristicRule): string {
  if (method === "heuristics" && rule) return HEURISTIC_SHADES[rule];
  return METHOD_COLORS[method];
}

export const STATUS = {
  ok: "#7fc8a9",
  warn: "#f0c36a",
  pending: "#8c93a8",
  danger: "#e0786b",
} as const;
