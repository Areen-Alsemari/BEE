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

/** Plain labels per docs/COPY_DECK.md section 1.4. The tooltip carries the exact stage; raw stage
 * names never need to appear in the main view. */
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
  cross_week: {
    label: "full test",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
    title: "All five test weeks, 25,088 training steps per model.",
  },
  recomputed: {
    label: "rebuilt from schedules",
    cls: "border-teal-300 bg-teal-50 text-teal-900",
    title: "Rebuilt from the saved schedules with the shared scoring code. Matches the team's own totals to within 1.1e-13.",
  },
  supplementary: {
    label: "extra runs",
    cls: "border-line-strong bg-sunken text-fg",
    title: "Runs outside the main comparison, shown for context only.",
  },
  pending: {
    label: "not available yet",
    cls: "border-line-strong border-dashed bg-transparent text-muted",
    title: "This value is missing from the data. See the Method page.",
  },
  heuristic: {
    label: "simple rule",
    cls: "border-stone-300 bg-stone-50 text-stone-800",
    title: "A fixed rule with no training, run on the same five test weeks.",
  },
  illustrative: {
    label: "illustrative",
    cls: "border-violet-300 bg-violet-50 text-violet-900",
    title: "Placement for the picture only. Not from the data.",
  },
  whatif: {
    label: "try it",
    cls: "border-slate-400 bg-slate-50 text-slate-800 border-dashed",
    title: "Computed in your browser from the code's formulas, with inputs you choose. Not a result.",
  },
  config: {
    label: "settings",
    cls: "border-indigo-300 bg-indigo-50 text-indigo-900",
    title: "Taken from the team's settings files, not a result.",
  },
  recorded: {
    label: "recorded",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
    title: "Value as saved during a test run.",
  },
  needs_confirmation: {
    label: "open question",
    cls: "border-orange-300 bg-orange-50 text-orange-900",
    title: "Recorded in the team's files but not yet confirmed. See the Method page.",
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

/**
 * Plain link for an item on the "awaiting owner confirmation" list (N1-N4). Shows "Open question";
 * the raw id and the full text are in the tooltip only, per docs/COPY_DECK.md section 1.5.
 * Links to the Method (Protocol) page's open-questions section.
 */
export function ConfirmMarker({ id, text }: { id: string; text: string }) {
  return (
    <a
      href="#/protocol"
      title={`${id}: ${text}`}
      data-confirm={id}
      className="ml-1 inline-flex items-center rounded border border-orange-400 bg-orange-50 px-1.5 py-[1px] text-[11px] font-medium text-orange-900 underline-offset-2 hover:underline"
    >
      Open question
    </a>
  );
}
