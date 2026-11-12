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
    <div className="rounded-lg border border-line bg-sunken px-3 py-2.5" data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        {badge}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span
          className="num text-xl font-semibold text-fg"
          style={accent ? { color: accent } : undefined}
          data-value={value ?? ""}
          data-metric={metricKey}
        >
          {fmtMetric(metricKey, value)}
        </span>
        {context && <span className="text-xs text-muted">{context}</span>}
      </div>
      <div className="mt-1 text-xs leading-snug text-muted">{scale}</div>
    </div>
  );
}
