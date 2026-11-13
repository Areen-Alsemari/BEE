import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLab } from "../store/useLabStore";
import { EvidenceBadge } from "./EvidenceBadge";
import { HEURISTIC_RULES, METHOD_CUES } from "../config/theme";
import { MethodDash, MethodGlyph } from "./MethodGlyph";
import { methodLabel } from "../lib/format";

const PAGE_NOTES: Record<string, string> = {
  "/mission-control": "Pick a week and a method. The globe and timeline show the same schedule.",
  "/bee-lab": "BEE gives the learner extra information about each request. It never changes which requests are allowed.",
  "/ablation": "We tried six versions of the adaptive rule on one week, then kept one.",
  "/results": "See how every method did across five real weeks.",
  "/protocol": "How the study was run and how to rebuild this site.",
};

export function HowToRead() {
  const open = useLab((s) => s.howToReadOpen);
  const set = useLab((s) => s.set);
  const { pathname } = useLocation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && set({ howToReadOpen: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);
  const note = PAGE_NOTES[pathname];
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          id="how-to-read"
          aria-label="Help"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="fixed bottom-0 right-0 top-14 z-40 w-[360px] overflow-y-auto border-l border-line bg-surface p-4 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Help</h2>
            <button className="btn text-xs" onClick={() => set({ howToReadOpen: false })} aria-label="Close panel">
              Close
            </button>
          </div>
          {note && (
            <section className="mt-4">
              <h3 className="panel-title">This page</h3>
              <p className="mt-2 text-sm text-fg">{note}</p>
            </section>
          )}
          <section className="mt-5">
            <h3 className="panel-title">Reading the numbers</h3>
            <p className="mt-2 text-sm text-fg">Numbers come from this study's result files. Only five test weeks, so treat small gaps as hints.</p>
          </section>
          <section className="mt-5">
            <h3 className="panel-title">Badges</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["screening", "shortlist", "confirmation", "supplementary", "pending", "whatif", "config", "recorded"] as const).map((k) => (
                <EvidenceBadge key={k} kind={k} />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Hover a badge to see exactly what it means.</p>
          </section>
          <section className="mt-5">
            <h3 className="panel-title">Method colours</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {(["heuristics", "plain_ppo", "fixed_bee", "adaptive_bee"] as const).map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <MethodGlyph method={m} />
                  <MethodDash method={m} />
                  <span>{methodLabel(m)}</span>
                  <span className="text-xs text-muted">
                    ({METHOD_CUES[m].shape}, {METHOD_CUES[m].dashLabel})
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-1 pl-5 text-xs text-muted">
                Simple rules use shades of one family:
                {HEURISTIC_RULES.map((r) => (
                  <MethodGlyph key={r} method="heuristics" rule={r} size={10} />
                ))}
              </li>
            </ul>
          </section>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
