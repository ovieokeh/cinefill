/**
 * A small horizontal row of name + colour-dot chips. Echoes the per-genre
 * palette the app uses on detail-page pills, watchlist meta, and the genre
 * donut. Mirror of the `colors.genre` map in `cinefill/theme/tokens.ts`.
 */

const SWATCHES: { name: string; color: string }[] = [
  { name: "Drama", color: "#B25A6E" },
  { name: "Thriller", color: "#A07238" },
  { name: "Comedy", color: "#E0B354" },
  { name: "Sci-Fi", color: "#4D9CC8" },
  { name: "Animation", color: "#5DBED1" },
  { name: "Horror", color: "#8C2A24" },
  { name: "Fantasy", color: "#A073C9" },
  { name: "Romance", color: "#E8889B" },
  { name: "Documentary", color: "#7A8FA8" },
  { name: "Western", color: "#C39657" },
];

export function GenreSwatches() {
  return (
    <div className="scrollbar-hide -mx-2 flex gap-2 overflow-x-auto px-2 py-1">
      {SWATCHES.map((s) => (
        <div
          key={s.name}
          className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[0.75rem] tracking-tight"
          style={{
            backgroundColor: "var(--color-elevated)",
            borderColor: s.color,
            color: s.color,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: s.color }}
            aria-hidden="true"
          />
          {s.name}
        </div>
      ))}
    </div>
  );
}
