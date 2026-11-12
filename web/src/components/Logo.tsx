/**
 * The team logo, used exactly as provided (web/public/brand/bee-logo.png).
 * The navy logo does not read on the dark theme, so it sits on a light rounded badge.
 * The image itself is never recoloured, cropped or redrawn.
 */
const SRC = `${import.meta.env.BASE_URL}brand/bee-logo.png`;

const SIZES = {
  sm: { pad: "p-1", h: "h-7", radius: "rounded-lg" },
  md: { pad: "p-2", h: "h-12", radius: "rounded-xl" },
  lg: { pad: "p-5", h: "h-32", radius: "rounded-3xl" },
} as const;

export function Logo({ size = "sm", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-ink-50 shadow-sm ${s.pad} ${s.radius} ${className}`}>
      <img src={SRC} alt="BEE project logo" className={`${s.h} w-auto object-contain`} draggable={false} />
    </span>
  );
}
