/**
 * Three slow-floating gold blobs behind the page. Lower opacity than a typical
 * marketing site mesh — the brand is "quiet" so the ambience never overpowers
 * the editorial copy. Driven by float-1/2/3 keyframes in globals.css.
 */
export function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-[28%] -left-[18%] h-[70vh] w-[70vh] rounded-full bg-[#4A3915] opacity-40 blur-[150px] animate-float-1" />
      <div className="absolute top-[28%] -right-[14%] h-[55vh] w-[55vh] rounded-full bg-[#3A2D12] opacity-30 blur-[130px] animate-float-2" />
      <div className="absolute -bottom-[22%] left-[18%] h-[60vh] w-[60vh] rounded-full bg-[#5B440F] opacity-35 blur-[140px] animate-float-3" />
    </div>
  );
}
