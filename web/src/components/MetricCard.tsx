import type { ReactNode } from "react";
import { fmtMetric } from "../lib/format";

/**
 * A single metric with its comparison scale. Every card must say what the number can be
 * compared against (seed spread, number of folds), so no value is shown without context.
 */
export function MetricCard({
  label,
  metricKey,
  value,
  scale,
  context,
  badge,
  testId,
  accent,
}: {
  label: string;
  metricKey: string;
  value: number | null | undefined;
  scale: ReactNode;
  context?: ReactNode;
  badge?: ReactNode;
  testId?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-space-600/70 bg-space-850/80 px-3 py-2" data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs uppercase tracking-wider text-ink-300">{label}</span>
        {badge}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span
          className="num text-xl font-semibold"
          style={accent ? { color: accent } : undefined}
          data-value={value ?? ""}
          data-metric={metricKey}
        >
          {fmtMetric(metricKey, value)}
        </span>
        {context && <span className="text-2xs text-ink-300">{context}</span>}
      </div>
      <div className="mt-1 text-2xs leading-snug text-ink-400">{scale}</div>
    </div>
  );
}
