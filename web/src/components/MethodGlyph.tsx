import { METHOD_CUES, seriesColor, type HeuristicRule, type MethodId } from "../config/theme";

/** Marker shape for a method: the non-colour cue that goes with every method colour. */
export function MethodGlyph({ method, rule, size = 12 }: { method: MethodId; rule?: HeuristicRule; size?: number }) {
  const c = seriesColor(method, rule);
  const { shape } = METHOD_CUES[method];
  const s = size;
  const h = s / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden className="shrink-0" data-shape={shape}>
      {shape === "square" && <rect x={1} y={1} width={s - 2} height={s - 2} fill={c} />}
      {shape === "circle" && <circle cx={h} cy={h} r={h - 1} fill={c} />}
      {shape === "triangle" && <path d={`M${h},1 L${s - 1},${s - 1} L1,${s - 1} Z`} fill={c} />}
      {shape === "diamond" && <path d={`M${h},0.5 L${s - 0.5},${h} L${h},${s - 0.5} L0.5,${h} Z`} fill={c} />}
      {shape === "diamond-open" && <path d={`M${h},1.5 L${s - 1.5},${h} L${h},${s - 1.5} L1.5,${h} Z`} fill="none" stroke={c} strokeWidth={1.6} />}
    </svg>
  );
}

/** Short line sample in the method's dash pattern (legend use). */
export function MethodDash({ method, rule, width = 26 }: { method: MethodId; rule?: HeuristicRule; width?: number }) {
  return (
    <svg width={width} height={8} aria-hidden className="shrink-0">
      <line x1={1} x2={width - 1} y1={4} y2={4} stroke={seriesColor(method, rule)} strokeWidth={2.5} strokeDasharray={METHOD_CUES[method].dash || undefined} />
    </svg>
  );
}
