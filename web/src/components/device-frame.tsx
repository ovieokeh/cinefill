/**
 * Phone-bezel mockup. Wraps a screenshot in a dark rounded shell with a soft
 * top-edge highlight and a contextual gold ambient blur behind. Sized for
 * iPhone screenshots (1242×2688 source assets).
 *
 * `glow="hero"` is the strongest variant — use behind the hero device. The
 * default works for inline feature blocks.
 */
export function DeviceFrame({
  children,
  className = "",
  glow = "default",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "default" | "hero" | "subtle" | "none";
}) {
  const glowClass = {
    default: "-inset-8 bg-[var(--color-accent)]/[0.06] blur-[55px]",
    hero: "-inset-14 bg-[var(--color-accent)]/[0.12] blur-[95px]",
    subtle: "-inset-5 bg-[var(--color-accent)]/[0.04] blur-[35px]",
    none: "hidden",
  }[glow];

  return (
    <div className={`relative ${className}`}>
      <div className={`absolute rounded-[3rem] ${glowClass}`} aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0A0C10] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
        <div className="overflow-hidden rounded-[1.5rem]">{children}</div>
      </div>
    </div>
  );
}

export function Divider() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/[0.18] to-transparent" />
    </div>
  );
}
