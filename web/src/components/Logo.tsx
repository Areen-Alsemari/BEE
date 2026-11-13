const SRC = `${import.meta.env.BASE_URL}brand/bee-logo.png`;

const SIZES = { sm: "h-8", md: "h-12", lg: "h-36" } as const;

export function Logo({ size = "sm", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  return <img src={SRC} alt="BEE project logo" className={`${SIZES[size]} w-auto shrink-0 object-contain ${className}`} draggable={false} />;
}
