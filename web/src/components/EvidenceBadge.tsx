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
  | "needs_confirmation";

const STYLE: Record<EvidenceKind, { label: string; cls: string; title: string }> = {
  screening: {
    label: "screening (1,024 steps)",
    cls: "border-amber-400/50 bg-amber-400/10 text-amber-200",
    title: "Configuration screening: 1,024 training steps, one training seed, W40 only. Supports shortlisting only.",
  },
  shortlist: {
    label: "shortlist (5,120)",
    cls: "border-yellow-300/50 bg-yellow-300/10 text-yellow-100",
    title: "Shortlist stage: 5,120 training steps, one training seed, W40 only.",
  },
  confirmation: {
    label: "confirmation (10,240)",
    cls: "border-sky-300/50 bg-sky-300/10 text-sky-100",
    title: "Confirmation stage: 10,240 training steps, three training seeds, W40 only.",
  },
  cross_week: {
    label: "full cross-week (25,088)",
    cls: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100",
    title: "Five-fold cross-week evaluation with the full 25,088-step training budget.",
  },
  recomputed: {
    label: "recomputed from schedules",
    cls: "border-teal-300/50 bg-teal-300/10 text-teal-100",
    title:
      "Per-evaluation-seed values recomputed from the saved schedules with the shared_v2 validator and metric code; matched the reported seed-averaged values (max difference 1.1e-13).",
  },
  supplementary: {
    label: "supplementary",
    cls: "border-ink-300/50 bg-ink-300/10 text-ink-100",
    title: "Extra runs outside the protocol comparison. Shown for context only.",
  },
  pending: {
    label: "pending data",
    cls: "border-ink-400/60 border-dashed bg-transparent text-ink-300",
    title: "Data not yet available. See the Protocol page for the list of gaps.",
  },
  heuristic: {
    label: "heuristic (no training)",
    cls: "border-stone-300/50 bg-stone-300/10 text-stone-100",
    title: "Non-learning rule; evaluated on the five evaluation seeds of every week.",
  },
  illustrative: {
    label: "illustrative",
    cls: "border-violet-300/50 bg-violet-300/10 text-violet-100",
    title: "Visual placement only; not derived from data.",
  },
  needs_confirmation: {
    label: "awaiting owner confirmation",
    cls: "border-orange-300/60 bg-orange-300/10 text-orange-100",
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
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-[1px] text-2xs font-medium ${s.cls} ${className}`}
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
      className="ml-1 inline-flex h-4 items-center rounded border border-orange-300/60 bg-orange-300/10 px-1 text-[10px] font-semibold text-orange-100"
    >
      {id}
    </span>
  );
}
