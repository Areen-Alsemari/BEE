import type { ReactNode } from "react";
import { DataError } from "../data/validate";
import type { Loadable } from "../data/loaders";
import { EvidenceBadge } from "./EvidenceBadge";

export function Loading({ what = "data" }: { what?: string }) {
  return (
    <div role="status" className="flex h-full min-h-[80px] items-center justify-center gap-2 text-sm text-ink-300">
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-light" />
      Loading {what}
    </div>
  );
}

export function ErrorState({ error }: { error: Error }) {
  const isData = error instanceof DataError;
  return (
    <div role="alert" className="m-2 rounded-lg border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-100">
      <div className="font-semibold">{isData ? "Data file problem" : "Something went wrong"}</div>
      <div className="mt-1 font-mono text-xs">{error.message}</div>
      <div className="mt-1 text-xs text-red-200/80">Re-run scripts/export_data.py and reload. Nothing is shown in place of the missing data.</div>
    </div>
  );
}

export function Pending({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-ink-400/50 p-3 text-sm text-ink-300">
      <EvidenceBadge kind="pending" />
      <div>{children}</div>
    </div>
  );
}

/** Render children only when every loadable is ready; otherwise loading or error. */
export function Ready<T extends unknown[]>({
  items,
  what,
  children,
}: {
  items: { [K in keyof T]: Loadable<T[K]> };
  what?: string;
  children: (...data: T) => ReactNode;
}) {
  for (const it of items as Loadable<unknown>[]) if (it.status === "error") return <ErrorState error={it.error} />;
  for (const it of items as Loadable<unknown>[]) if (it.status === "loading") return <Loading what={what} />;
  return <>{children(...((items as Loadable<unknown>[]).map((i) => (i as { data: unknown }).data) as T))}</>;
}
