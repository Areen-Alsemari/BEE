import type { ReactNode } from "react";

export function PageIntro({ children, tryThis }: { children: ReactNode; tryThis?: string }) {
  return (
    <header>
      <p className="max-w-2xl text-fg-2" data-testid="page-intro">
        {children}
      </p>
      {tryThis && (
        <p className="mt-1 text-sm text-brand-2">
          <span className="font-medium">Try this:</span> {tryThis}
        </p>
      )}
    </header>
  );
}

export function Caveat({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-muted">{children}</p>;
}

export function Details({ summary, children, testId }: { summary: string; children: ReactNode; testId?: string }) {
  return (
    <details className="mt-2 text-sm" data-testid={testId}>
      <summary className="cursor-pointer font-medium text-brand-2">{summary}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

export function SpreadNote({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-muted ${className}`}
      title="How much results move when only the random seed changes, measured on week 50. Gaps inside the band are within that variation."
    >
      <span className="inline-block h-2.5 w-4 rounded-sm bg-brand/15" /> typical seed-to-seed variation
    </span>
  );
}
