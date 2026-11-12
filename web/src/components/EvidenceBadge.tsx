export type EvidenceKind =
  | "screening"
  | "shortlist"
  | "confirmation"
  | "cross_week"
  | "recomputed"
  | "supplementary"
  | "pending"
  | "heuristic"
  | "illustrative"
  | "needs_confirmation"
  | "whatif"
  | "recorded"
  | "config";

const STYLE: Record<EvidenceKind, { label: string; cls: string; title: string }> = {
  screening: {
    label: "screening (1,024 steps)",
    cls: "border-amber-300 bg-amber-50 text-amber-900",
    title: "Configuration screening: 1,024 training steps, one training seed, W40 only. Supports shortlisting only.",
  },
  shortlist: {
    label: "shortlist (5,120)",
    cls: "border-yellow-300 bg-yellow-50 text-yellow-900",
    title: "Shortlist stage: 5,120 training steps, one training seed, W40 only.",
  },
  confirmation: {
    label: "confirmation (10,240)",
    cls: "border-sky-300 bg-sky-50 text-sky-900",
    title: "Confirmation stage: 10,240 training steps, three training seeds, W40 only.",
  },
  cross_week: {
    label: "full cross-week (25,088)",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
    title: "Five-fold cross-week evaluation with the full 25,088-step training budget.",
  },
  recomputed: {
    label: "recomputed from schedules",
    cls: "border-teal-300 bg-teal-50 text-teal-900",
    title:
      "Per-evaluation-seed values recomputed from the saved schedules with the shared_v2 validator and metric code; matched the reported seed-averaged values (max difference 1.1e-13).",
  },
  supplementary: {
    label: "supplementary",
    cls: "border-line-strong bg-sunken text-fg",
    title: "Extra runs outside the protocol comparison. Shown for context only.",
  },
  pending: {
    label: "pending data",
    cls: "border-line-strong border-dashed bg-transparent text-muted",
    title: "Data not yet available. See the Protocol page for the list of gaps.",
  },
  heuristic: {
    label: "heuristic (no training)",
    cls: "border-stone-300 bg-stone-50 text-stone-800",
    title: "Non-learning rule; evaluated on the five evaluation seeds of every week.",
  },
  illustrative: {
    label: "illustrative",
    cls: "border-violet-300 bg-violet-50 text-violet-900",
    title: "Visual placement only; not derived from data.",
  },
  whatif: {
    label: "what-if, computed from the equations",
    cls: "border-slate-400 bg-slate-50 text-slate-800 border-dashed",
    title: "Computed in your browser from the equations in the code, with inputs you choose. Not a result of the study.",
  },
  config: {
    label: "configuration record",
    cls: "border-indigo-300 bg-indigo-50 text-indigo-900",
    title: "Value from the exported configuration and protocol files, not a result.",
  },
  recorded: {
    label: "recorded trace value",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
    title: "Value exactly as recorded in the exported threshold trace of a cross-week run.",
  },
  needs_confirmation: {
    label: "awaiting owner confirmation",
    cls: "border-orange-300 bg-orange-50 text-orange-900",
    title: "Recorded in the source files but not yet confirmed by its owner.",
  },
};

export function evidenceFromStage(stage: string): EvidenceKind {
  if (stage.startsWith("screening")) return "screening";
  if (stage.startsWith("shortlist")) return "shortlist";
  if (stage.startsWith("confirmation")) return "confirmation";
  if (stage.startsWith("full cross-week")) return "cross_week";
  if (stage.startsWith("heuristic")) return "heuristic";
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

/** Small marker for items on the "needs confirmation by owner" list (N1-N3). */
export function ConfirmMarker({ id, text }: { id: string; text: string }) {
  return (
    <span
      title={`${id}: ${text}`}
      data-confirm={id}
      className="ml-1 inline-flex h-4 items-center rounded border border-orange-400 bg-orange-50 px-1 text-[11px] font-semibold text-orange-900"
    >
      {id}
    </span>
  );
}
