import { PROJECT_TITLE, TEAM } from "../config/team";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="flex items-center gap-3 border-t border-line px-4 py-3 text-2xs text-muted">
      <Logo size="sm" />
      <div>
        <div className="text-fg">{PROJECT_TITLE}</div>
        <div>
          {TEAM.members.map((m) => m.name).join(" · ")} · {TEAM.affiliation}
          {TEAM.placeholder && <span className="ml-2 text-warn-fg">(team details placeholder)</span>}
        </div>
      </div>
    </footer>
  );
}
