export type EvidenceKind = "screening" | "shortlist" | "confirmation" | "supplementary" | "pending" | "whatif" | "recorded" | "config";

const STYLE: Record<EvidenceKind, { label: string; cls: string; title: string }> = {
  screening: {
    label: "short trial",
    cls: "border-amber-300 bg-amber-50 text-amber-900",
    title: "Trial on week 40 only, 1,024 training steps, one training run. Good for shortlisting, not for conclusions.",
  },
  shortlist: {
    label: "longer trial",
    cls: "border-yellow-300 bg-yellow-50 text-yellow-900",
    title: "Trial on week 40 only, 5,120 training steps, one training run.",
  },
  confirmation: {
    label: "final trial",
    cls: "border-sky-300 bg-sky-50 text-sky-900",
    title: "Trial on week 40 only, 10,240 training steps, three training runs.",
  },
  supplementary: {
    label: "extra runs",
    cls: "border-line-strong bg-sunken text-fg",
    title: "Runs outside the main comparison, shown for context only.",
  },
  pending: {
    label: "not available yet",
    cls: "border-line-strong border-dashed bg-transparent text-muted",
    title: "This value is missing from the data.",
  },
  whatif: {
    label: "try it",
    cls: "border-slate-400 bg-slate-50 text-slate-800 border-dashed",
    title: "Computed in your browser from the same formulas, with inputs you choose. Not a result.",
  },
  config: {
    label: "settings",
    cls: "border-indigo-300 bg-indigo-50 text-indigo-900",
    title: "Taken from the settings files, not a result.",
  },
  recorded: {
    label: "recorded",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
    title: "Value as saved during a test run.",
  },
};

export function evidenceFromStage(stage: string): EvidenceKind | null {
  if (stage.startsWith("screening")) return "screening";
  if (stage.startsWith("shortlist")) return "shortlist";
  if (stage.startsWith("confirmation")) return "confirmation";
  if (stage.startsWith("full cross-week")) return null;
  if (stage.startsWith("heuristic")) return null;
  return "pending";
}

export function EvidenceBadge({ kind, label, className = "" }: { kind: EvidenceKind; label?: string; className?: string }) {
  const s = STYLE[kind];
  return (
    <span
      title={s.title}
      data-evidence={kind}
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-[1px] text-xs font-medium ${s.cls} ${className}`}
    >
      {label ?? s.label}
    </span>
  );
}
