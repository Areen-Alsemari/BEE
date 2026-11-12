/**
 * BEE feature equations, transcribed from the code (see docs/BEE_MECHANISM_NOTES.md).
 * Parameters always come from bee_params.json; nothing numeric is typed in here.
 *
 * Adaptive stream (notebooks/04_adaptive_bee/src/bee_*_environment.py):
 *   stimulus   = clip(w_s*scarcity + w_c*contention + w_u*unmet, 0, 1)
 *   increase   = max(contention - initial_contention, 0)
 *   rel_unmet  = max(unmet - mean_mission_unmet, 0)
 *   count      = [scarcity >= L_s] + [increase >= L_c] + [rel_unmet >= L_u]
 *   enabled    = !selective || count >= min_indicators
 *   threshold  = enabled ? clip(base - a_s*scarcity - a_c*increase - a_u*rel_unmet, min, max) : base
 *   activation = clip(stimulus^k / (stimulus^k + threshold^k + 1e-8), 0, 1)
 * Fixed stream, F2 (notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb, cells 27 and 41):
 *   stimulus   = w_s*scarcity + w_c*contention + w_u*unmet   (no clip in the formula)
 *   threshold  = constant
 *   activation = stimulus^k / (stimulus^k + threshold^k)     (no epsilon, no clip)
 * The definitions of scarcity and contention also differ between the streams (N4).
 */

type Ref = { file: string; line?: number; cell?: number; text: string };
type V<T> = { value: T; source: Ref };

export interface BeeMethodParams {
  id: string;
  label: string;
  stream: string;
  stimulus_weights: { scarcity: number; contention: number; unmet: number };
  stimulus: { formula: string; clip: [number, number] | null };
  threshold:
    | { kind: "fixed"; value: V<number> }
    | {
        kind: "adaptive";
        base_threshold: V<number>;
        scarcity_strength: V<number>;
        contention_strength: V<number>;
        unmet_strength: V<number>;
        minimum_threshold: V<number>;
        maximum_threshold: V<number>;
        formula: string;
      };
  gate: null | {
    selective_mode: V<boolean>;
    scarcity_indicator_limit: V<number>;
    contention_indicator_limit: V<number>;
    unmet_indicator_limit: V<number>;
    minimum_pressure_indicators: V<number>;
  };
  activation: { formula: string; sensitivity_k: V<number>; epsilon: number; clip: [number, number] | null };
  definitions: Record<string, { words: string; normalisation?: string; source: Ref }>;
}
export interface BeeParamsFile {
  statement: string;
  mask: Record<string, Ref & { lines?: [number, number] }>;
  methods: Record<"fixed_F2" | "adaptive_A6" | "adaptive_A3", BeeMethodParams>;
  differences_note: string;
}

const clip = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

export function stimulus(p: BeeMethodParams, scarcity: number, contention: number, unmet: number): number {
  const w = p.stimulus_weights;
  const s = w.scarcity * scarcity + w.contention * contention + w.unmet * unmet;
  return p.stimulus.clip ? clip(s, p.stimulus.clip[0], p.stimulus.clip[1]) : s;
}

export interface GateResult {
  increase: number;
  relativeUnmet: number;
  flags: [boolean, boolean, boolean];
  count: number;
  enabled: boolean;
}

export function gate(p: BeeMethodParams, scarcity: number, contentionIncrease: number, relativeUnmet: number): GateResult {
  if (!p.gate) return { increase: contentionIncrease, relativeUnmet, flags: [false, false, false], count: 0, enabled: false };
  const g = p.gate;
  const flags: [boolean, boolean, boolean] = [
    scarcity >= g.scarcity_indicator_limit.value,
    contentionIncrease >= g.contention_indicator_limit.value,
    relativeUnmet >= g.unmet_indicator_limit.value,
  ];
  const count = flags.filter(Boolean).length;
  return { increase: contentionIncrease, relativeUnmet, flags, count, enabled: !g.selective_mode.value || count >= g.minimum_pressure_indicators.value };
}

export function threshold(p: BeeMethodParams, scarcity: number, contentionIncrease: number, relativeUnmet: number): { theta: number; gate: GateResult } {
  const t = p.threshold;
  const gr = gate(p, scarcity, contentionIncrease, relativeUnmet);
  if (t.kind === "fixed") return { theta: t.value.value, gate: gr };
  if (!gr.enabled) return { theta: t.base_threshold.value, gate: gr };
  const raw =
    t.base_threshold.value - t.scarcity_strength.value * scarcity - t.contention_strength.value * contentionIncrease - t.unmet_strength.value * relativeUnmet;
  return { theta: clip(raw, t.minimum_threshold.value, t.maximum_threshold.value), gate: gr };
}

export function activation(p: BeeMethodParams, s: number, theta: number): number {
  const k = p.activation.sensitivity_k.value;
  const num = s ** k;
  const a = num / (num + theta ** k + p.activation.epsilon);
  return p.activation.clip ? clip(a, p.activation.clip[0], p.activation.clip[1]) : a;
}

/** Recompute a recorded adaptive trace row from its recorded pressure terms. */
export function recomputeTraceRow(
  p: BeeMethodParams,
  r: { placement_scarcity: number; resource_contention: number; mission_unmet_ratio: number; initial_contention: number; mean_mission_unmet: number },
) {
  const s = stimulus(p, r.placement_scarcity, r.resource_contention, r.mission_unmet_ratio);
  const increase = Math.max(r.resource_contention - r.initial_contention, 0);
  const relativeUnmet = Math.max(r.mission_unmet_ratio - r.mean_mission_unmet, 0);
  const { theta, gate: g } = threshold(p, r.placement_scarcity, increase, relativeUnmet);
  return {
    stimulus: s,
    contention_increase: increase,
    relative_unmet_pressure: relativeUnmet,
    pressure_count: g.count,
    adaptation_enabled: g.enabled,
    threshold: theta,
    activation: activation(p, s, theta),
  };
}
