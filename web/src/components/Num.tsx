export function Num({ v, trace, format, className = "" }: { v: number; trace: string; format: (x: number) => string; className?: string }) {
  return (
    <span className={`num ${className}`} data-trace={trace} data-value={String(v)}>
      {format(v)}
    </span>
  );
}

export const f4 = (x: number) => x.toFixed(4);
export const f6 = (x: number) => x.toFixed(6);
export const f2 = (x: number) => x.toFixed(2);
export const signedWords = (digits = 4) => (x: number) => (x > 0 ? `higher by ${x.toFixed(digits)}` : x < 0 ? `lower by ${Math.abs(x).toFixed(digits)}` : "equal");
