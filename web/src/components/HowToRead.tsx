import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLab } from "../store/useLabStore";
import { EvidenceBadge } from "./EvidenceBadge";
import { METHOD_COLORS, HEURISTIC_SHADES } from "../config/theme";

const PAGE_NOTES: Record<string, string[]> = {
  "/mission-control": [
    "Pick a week, a method and seeds. The 3D view and the timeline show the same run.",
    "Beams link a DSN complex to a spacecraft while one of its requests is being served. Arrays (for example DSS-34_DSS-35) draw a single beam.",
    "Spacecraft positions are illustrative. Times, antennas, missions and which requests were scheduled are real data.",
    "Unscheduled requests are listed on the right; they never draw a beam.",
    "Compare mode shows two methods on the same week and seeds, and marks requests that only one of them scheduled.",
  ],
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
  const notes = PAGE_NOTES[pathname] ?? [];
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          id="how-to-read"
          aria-label="How to read this lab"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="fixed bottom-0 right-0 top-14 z-40 w-[360px] overflow-y-auto border-l border-space-600 bg-space-900/95 p-4 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">How to read this lab</h2>
            <button className="btn text-xs" onClick={() => set({ howToReadOpen: false })} aria-label="Close panel">
              Close
            </button>
          </div>
          {notes.length > 0 && (
            <section className="mt-4">
              <h3 className="panel-title">This page</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-ink-100">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="mt-5">
            <h3 className="panel-title">Reading the numbers</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-ink-100">
              <li>Every number comes from the team&apos;s result files through the export script. Missing data shows as pending.</li>
              <li>Averages are taken over evaluation seeds, then training seeds, then the five test weeks (folds).</li>
              <li>
                Differences are written as &ldquo;higher&rdquo; or &ldquo;lower by X&rdquo; and always shown next to a scale: the
                seed-to-seed spread on W50, or n = 5 folds.
              </li>
              <li>Under the shared 25,088-step budget, the three PPO-based methods are within seed spread of each other.</li>
              <li>Explanations for the results appear only under the label &ldquo;hypothesis, not tested&rdquo;.</li>
            </ul>
          </section>
          <section className="mt-5">
            <h3 className="panel-title">Evidence badges</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["cross_week", "recomputed", "supplementary", "heuristic", "screening", "shortlist", "confirmation", "pending", "illustrative", "needs_confirmation"] as const).map(
                (k) => (
                  <EvidenceBadge key={k} kind={k} />
                ),
              )}
            </div>
          </section>
          <section className="mt-5">
            <h3 className="panel-title">Method colours</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {[
                ["Heuristic schedulers", METHOD_COLORS.heuristics],
                ["Plain Maskable PPO", METHOD_COLORS.plain_ppo],
                ["Fixed-threshold BEE", METHOD_COLORS.fixed_bee],
                ["Adaptive-threshold BEE (A6)", METHOD_COLORS.adaptive_bee],
              ].map(([n, c]) => (
                <li key={n} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: c }} />
                  {n}
                </li>
              ))}
              <li className="flex items-center gap-1 pl-5 text-2xs text-ink-300">
                Heuristic rules use shades of one family:
                {Object.values(HEURISTIC_SHADES).map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                ))}
              </li>
            </ul>
          </section>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
