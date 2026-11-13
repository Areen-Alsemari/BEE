import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { useLab } from "../store/useLabStore";

const LINKS = [
  { to: "/mission-control", label: "Explore a week" },
  { to: "/bee-lab", label: "How BEE works" },
  { to: "/ablation", label: "Variants" },
  { to: "/results", label: "Results" },
  { to: "/tour", label: "Tour" },
  { to: "/protocol", label: "Method" },
];

export function Nav() {
  const open = useLab((s) => s.howToReadOpen);
  const set = useLab((s) => s.set);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-surface/90 px-4 backdrop-blur">
      <NavLink to="/" className="flex items-center gap-2.5" aria-label="BEE Virtual Lab home">
        <Logo size="sm" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-wide text-brand">BEE Virtual Lab</span>
          <span className="block text-2xs text-muted">Antenna scheduling study</span>
        </span>
      </NavLink>
      <nav aria-label="Main" className="ml-4 flex items-center gap-1">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                isActive ? "bg-brand text-white" : "text-fg-2 hover:bg-hover hover:text-fg"
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
        Help
      </button>
    </header>
  );
}
