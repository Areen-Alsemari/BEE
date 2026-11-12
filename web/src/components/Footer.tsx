import { PROJECT_TITLE, TEAM } from "../config/team";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="flex items-center gap-3 border-t border-space-600/60 px-4 py-3 text-2xs text-ink-300">
      <Logo size="sm" />
      <div>
        <div className="text-ink-100">{PROJECT_TITLE}</div>
        <div>
          {TEAM.members.map((m) => m.name).join(" · ")} · {TEAM.affiliation}
          {TEAM.placeholder && <span className="ml-2 text-orange-200">(team details placeholder)</span>}
        </div>
      </div>
    </footer>
  );
}
