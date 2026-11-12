import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { useLab } from "../store/useLabStore";

const LINKS = [
  { to: "/mission-control", label: "Mission Control" },
  { to: "/bee-lab", label: "BEE Mechanism" },
  { to: "/ablation", label: "Ablation" },
  { to: "/results", label: "Results" },
  { to: "/tour", label: "Guided Tour" },
  { to: "/protocol", label: "Protocol" },
];

export function Nav() {
  const open = useLab((s) => s.howToReadOpen);
  const set = useLab((s) => s.set);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-space-600/60 bg-space-950/85 px-4 backdrop-blur">
      <NavLink to="/" className="flex items-center gap-2.5" aria-label="BEE Virtual Lab home">
        <Logo size="sm" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-wide">BEE Virtual Lab</span>
          <span className="block text-2xs text-ink-300">Ground-station scheduling study</span>
        </span>
      </NavLink>
      <nav aria-label="Main" className="ml-4 flex items-center gap-1">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                isActive ? "bg-brand-navy/70 text-ink-50" : "text-ink-200 hover:bg-space-800 hover:text-ink-50"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className={`btn ml-auto ${open ? "btn-on" : ""}`}
        aria-expanded={open}
        aria-controls="how-to-read"
        onClick={() => set({ howToReadOpen: !open })}
      >
        How to read this
      </button>
    </header>
  );
}
