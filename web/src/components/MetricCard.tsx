import type { ReactNode } from "react";
import { fmtMain } from "../lib/format";

/**
 * A single metric with its comparison scale. Rates display as a percentage in the main view;
 * exact fractions stay available in Details/downloads. `large` is used for a page's headline cards.
 */
export function MetricCard({
  label,
  metricKey,
  value,
  scale,
  context,
  raw,
  badge,
  testId,
  accent,
  large,
}: {
  label: string;
  metricKey: string;
  value: number | null | undefined;
  scale?: ReactNode;
  context?: ReactNode;
  raw?: ReactNode;
  badge?: ReactNode;
  testId?: string;
  accent?: string;
  large?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-line bg-sunken ${large ? "px-4 py-3.5" : "px-3 py-2.5"}`} data-testid={testId}>
      <div className="flex items-start justify-between gap-2">
        <span className={`font-medium uppercase tracking-wider text-muted ${large ? "text-xs" : "text-xs"}`}>{label}</span>
        {badge}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span
          className={`num font-semibold text-fg ${large ? "text-3xl" : "text-xl"}`}
          style={accent ? { color: accent } : undefined}
          data-value={value ?? ""}
          data-metric={metricKey}
        >
          {fmtMain(metricKey, value)}
        </span>
        {context && <span className="text-xs text-muted">{context}</span>}
        {raw && <span className="sr-only">{raw}</span>}
      </div>
      {scale && <div className="mt-1 text-xs leading-snug text-muted">{scale}</div>}
    </div>
  );
}
