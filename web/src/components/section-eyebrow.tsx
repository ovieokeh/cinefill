/**
 * Magazine-style section header. Renders the same `NN ━━━━ TITLE` chrome
 * the RN app uses on the You-tab — visual continuity from app to site.
 *
 * Variants:
 *   <SectionEyebrow number="01" title="The you tab" />        (numbered)
 *   <SectionEyebrow title="Letterboxd import" prefix="Also" />  (Also-style)
 */
export function SectionEyebrow({
  number,
  prefix,
  title,
  align = "left",
}: {
  number?: string;
  prefix?: string;
  title: string;
  align?: "left" | "center";
}) {
  const lead = number ? (
    <span className="font-mono text-xs text-[var(--color-accent)]/40">{number}</span>
  ) : prefix ? (
    <span className="font-mono text-xs text-[var(--color-accent)]/40">{prefix}</span>
  ) : null;

  return (
    <div
      className={`flex items-center gap-3 ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      {lead}
      <span className="h-px w-6 bg-[var(--color-accent)]/20" />
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--color-accent)]/55">
        {title}
      </span>
    </div>
  );
}
