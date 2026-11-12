import { useEffect, useRef } from "react";
import { useLab } from "../../store/useLabStore";
import { fmtTime } from "../../lib/format";

const SPEEDS = [
  { v: 600, label: "10 min/s" },
  { v: 3600, label: "1 h/s" },
  { v: 4 * 3600, label: "4 h/s" },
  { v: 12 * 3600, label: "12 h/s" },
];

/** Play/pause, speed and scrubber for the selected week. Drives currentTime with requestAnimationFrame. */
export function Playback({ span }: { span: [number, number] }) {
  const t = useLab((s) => s.currentTime) ?? span[0];
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const set = useLab((s) => s.set);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = null;
    const step = (now: number) => {
      const prev = last.current ?? now;
      last.current = now;
      const s = useLab.getState();
      const next = (s.currentTime ?? span[0]) + ((now - prev) / 1000) * s.speed;
      if (next >= span[1]) {
        set({ currentTime: span[1], playing: false });
        return;
      }
      set({ currentTime: next });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, span, set]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      const s = useLab.getState();
      if (e.code === "Space") {
        e.preventDefault();
        set({ playing: !s.playing });
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const cur = s.currentTime ?? span[0];
        set({ currentTime: Math.min(span[1], Math.max(span[0], cur + dir * (e.shiftKey ? 6 : 1) * 3600)) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, span]);

  return (
    <div className="flex items-center gap-2 px-1 py-1.5">
      <button
        type="button"
        className="btn w-[74px] justify-center"
        onClick={() => set({ playing: !playing, currentTime: t >= span[1] ? span[0] : t })}
        aria-label={playing ? "Pause" : "Play"}
        data-testid="play-toggle"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <label className="flex items-center gap-1 text-2xs text-muted">
        Speed
        <select className="ctl py-0.5 text-xs" value={speed} onChange={(e) => set({ speed: Number(e.target.value) })} aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <input
        type="range"
        className="mx-2 min-w-0 flex-1"
        min={span[0]}
        max={span[1]}
        step={60}
        value={t}
        onChange={(e) => set({ currentTime: Number(e.target.value), playing: false })}
        aria-label="Scrub through the week"
        data-testid="scrubber"
      />
      <span className="num w-[170px] text-right text-xs text-fg" data-testid="current-time">
        {fmtTime(t)}
      </span>
      <span className="hidden text-2xs text-muted xl:inline">wheel: zoom · shift+drag: pan · space: play</span>
    </div>
  );
}
