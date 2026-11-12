/**
 * Visual identity for the light theme.
 *
 * Brand (logo navy #183078, blue #2c5aa0) is used for nav, headings, focus and primary buttons
 * only; it is never a method colour. Surface tokens live in src/index.css.
 *
 * Method colours were chosen by a search over darkened Okabe-Ito-style hues and neutrals for the
 * largest minimum CIE76 difference under protanopia, deuteranopia and tritanopia simulation
 * (min deltaE >= 27 in every case), with >= 4.5:1 text contrast on the light surfaces
 * (contrast on white / canvas #f2f5fa / scene backdrop #dfe7f2):
 *   heuristics    #2f2f2f  13.39 / 12.25 / 10.74 (charcoal; rule shades are greys, all >= 4.5:1)
 *   plain PPO     #b84e00   5.09 /  4.66 /  4.08
 *   fixed BEE     #00805c   4.95 /  4.53 /  3.97
 *   adaptive BEE  #a23f9c   5.63 /  5.16 /  4.52
 *   first-pass A3 #b866b0   3.77 /  3.45 /  3.03 (marks only, always dashed / open marker)
 * Every method also has a non-colour cue: a marker shape and a dash pattern.
 */
export const BRAND = {
  navy: "#183078",
  blue: "#2c5aa0",
  fg: "#0e1b3d",
  muted: "#4a5675",
  line: "#cfd7e6",
} as const;

export type MethodId = "heuristics" | "plain_ppo" | "fixed_bee" | "adaptive_bee" | "adaptive_a3_first_pass";
export type HeuristicRule =
  | "random_feasible"
  | "earliest_window_end"
  | "shortest_duration"
  | "least_flexible"
  | "weighted_composite_H4";

export const METHOD_COLORS: Record<MethodId, string> = {
  heuristics: "#2f2f2f",
  plain_ppo: "#b84e00",
  fixed_bee: "#00805c",
  adaptive_bee: "#a23f9c",
  adaptive_a3_first_pass: "#b866b0",
};

/** Shades of the heuristic family (greys); each >= 4.5:1 on canvas. */
export const HEURISTIC_SHADES: Record<HeuristicRule, string> = {
  random_feasible: "#5f5f5f",
  earliest_window_end: "#1c1c1c",
  shortest_duration: "#6e6e6e",
  least_flexible: "#474747",
  weighted_composite_H4: "#2f2f2f",
};

export type MarkerShape = "square" | "circle" | "triangle" | "diamond" | "diamond-open";
export const METHOD_CUES: Record<MethodId, { shape: MarkerShape; dash: string; dashLabel: string }> = {
  heuristics: { shape: "square", dash: "2 3", dashLabel: "dotted" },
  plain_ppo: { shape: "circle", dash: "", dashLabel: "solid" },
  fixed_bee: { shape: "triangle", dash: "7 3", dashLabel: "long dash" },
  adaptive_bee: { shape: "diamond", dash: "7 3 2 3", dashLabel: "dash-dot" },
  adaptive_a3_first_pass: { shape: "diamond-open", dash: "3 3", dashLabel: "short dash" },
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
/** Text colour for a method (always >= 4.5:1 on light surfaces). */
export function seriesTextColor(method: MethodId): string {
  return method === "adaptive_a3_first_pass" ? METHOD_COLORS.adaptive_bee : METHOD_COLORS[method];
}

// ------------------------------------------------------------------ colour utilities
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}
function rgbToHex([r, g, b]: number[]): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
function luminance(hex: string): number {
  return hexToRgb(hex)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function rgbToHsl([r, g, b]: number[]): [number, number, number] {
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb([h, s, l]: number[]): number[] {
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)];
}

const SCENE_BACKDROP = "#dfe7f2";
const shadeCache = new Map<string, string>();
/**
 * Darker display shade of a mission colour (missions.json values are not changed): same hue,
 * lightness lowered until the shade has >= 3.2:1 contrast with the darkest scene/Gantt backdrop.
 * Used for bar outlines, beams and spacecraft trim.
 */
export function missionShade(hex: string, target = 3.2): string {
  const key = `${hex}|${target}`;
  if (shadeCache.has(key)) return shadeCache.get(key)!;
  const [h, s0, l0] = rgbToHsl(hexToRgb(hex));
  const s = Math.min(0.85, Math.max(0.45, s0));
  let l = Math.min(l0, 0.5);
  let out = rgbToHex(hslToRgb([h, s, l]));
  while (contrast(out, SCENE_BACKDROP) < target && l > 0.08) {
    l -= 0.02;
    out = rgbToHex(hslToRgb([h, s, l]));
  }
  shadeCache.set(key, out);
  return out;
}
