import { DeviceFrame, Divider } from "@/components/device-frame";
import { DevicePair } from "@/components/device-pair";
import { Footer } from "@/components/footer";
import { GenreSwatches } from "@/components/genre-swatches";
import { Hero } from "@/components/hero";
import { MeshBackground } from "@/components/mesh-background";
import { AppleIcon, Nav } from "@/components/nav";
import { SectionEyebrow } from "@/components/section-eyebrow";
import Image from "next/image";
import { Reveal } from "./reveal";

/* ═══════════════════════════════════════════════ structured data */

const TESTFLIGHT_URL = "https://testflight.apple.com/join/7eqjVY9X";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "cinefill",
      url: "https://cinefill.ovie.dev",
      description:
        "A quiet film & TV diary that stays local first. Log what you watched, save what's next, see your taste take shape.",
    },
    {
      "@type": "SoftwareApplication",
      name: "cinefill",
      description:
        "Track films and TV without an audience. Local-first diary, watchlist, online catalog search, and optional personal sync.",
      applicationCategory: "EntertainmentApplication",
      operatingSystem: "iOS",
      url: "https://cinefill.ovie.dev",
      featureList: [
        "Film and TV-season diary with half-star ratings and optional notes",
        "Watchlist with genre, decade, and media-type filters",
        "Taste profile — moods, genre lean, era, loyalty",
        "Online catalog discovery with watched / watchlist badges on every result",
        "Letterboxd diary import from a standard export zip",
        "Cinefill export zip with JSON and CSV files",
        "Local-first storage; no accounts, no analytics; optional personal sync",
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════ page */

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MeshBackground />
      <Nav />

      <main>
        {/* ────────────────────── Hero ────────────────────── */}
        <Hero />

        {/* ────────────────────── The loop ────────────────────── */}
        <section
          id="loop"
          className="relative border-y border-[var(--color-border)]/60 px-6 py-28 md:py-36 lg:px-10"
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <SectionEyebrow title="The loop" align="center" />
              <h2 className="mt-4 text-center font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.01em]">
                Log it. Save it. Watch your taste take shape.
              </h2>
            </Reveal>

            <div className="relative mt-20 grid gap-16 md:grid-cols-3 md:gap-8">
              {/* Connecting hairline (desktop) */}
              <div className="absolute top-7 left-[16.67%] right-[16.67%] hidden h-px bg-gradient-to-r from-[var(--color-accent)]/10 via-[var(--color-accent)]/25 to-[var(--color-accent)]/10 md:block" />

              {[
                {
                  step: "01",
                  title: "Log it",
                  body: "Half stars. Optional notes. Films and TV seasons, side by side.",
                },
                {
                  step: "02",
                  title: "Save it",
                  body: "Watchlist with the same filters as the diary. Genre and runtime on every row.",
                },
                {
                  step: "03",
                  title: "Watch it take shape",
                  body: "The You tab reads like a cover. Moods, era, the directors you stick with.",
                },
              ].map((item, i) => (
                <Reveal key={item.step} delay={i * 140} className="text-center">
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/[0.06]">
                    <span className="font-mono text-sm text-[var(--color-accent)]/70">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-xl">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {item.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ────────────────────── Feature 01 — The You tab ────────────────────── */}
        <section
          id="features"
          className="relative px-6 py-28 md:py-36 lg:px-10"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-14 md:flex-row md:gap-20">
            <Reveal className="w-full min-w-0 md:flex-1">
              <SectionEyebrow number="01" title="The you tab" />
              <h2 className="mt-5 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] tracking-[-0.01em]">
                Your taste, like a magazine&nbsp;cover.
              </h2>
              <p className="mt-5 max-w-lg leading-[1.75] text-[var(--color-text-muted)]">
                Moods. Genre lean. Era. Loyalty. Watch hours. Richer every time
                you log.
              </p>
              <div className="mt-7">
                <GenreSwatches />
              </div>
              <ul className="mt-7 space-y-3">
                {[
                  "Taste profile that names your moods and era",
                  "Top directors + top-rated films, tappable",
                  "Activity over time, ratings histogram, decade bars",
                  "Per-genre colour system shared app-wide",
                ].map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-[0.9375rem] text-[var(--color-text-soft)]"
                  >
                    <div className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]/70" />
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal
              className="flex w-full min-w-0 justify-center gap-4 md:flex-1 lg:gap-6"
              delay={180}
            >
              <DeviceFrame className="w-full max-w-[10rem] md:max-w-[13rem] lg:max-w-[15rem]">
                <Image
                  src="/promo/your-taste-iphone.png"
                  alt="The You tab — top genres donut and top directors"
                  width={1206}
                  height={2622}
                  className="block w-full"
                />
              </DeviceFrame>
              <DeviceFrame className="mt-10 w-full max-w-[10rem] md:max-w-[13rem] lg:max-w-[15rem]">
                <Image
                  src="/promo/you-iphone.png"
                  alt="The You tab — taste profile summary"
                  width={1290}
                  height={2796}
                  className="block w-full"
                />
              </DeviceFrame>
            </Reveal>
          </div>
        </section>

        <Divider />

        {/* ────────────────────── Feature 02 — Diary & Watchlist ────────────────────── */}
        <section className="relative px-6 py-28 md:py-36 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-14 md:flex-row-reverse md:gap-20">
            <Reveal className="w-full min-w-0 md:flex-1">
              <SectionEyebrow number="02" title="Diary & watchlist" />
              <h2 className="mt-5 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] tracking-[-0.01em]">
                A diary that respects how you&nbsp;watch.
              </h2>
              <p className="mt-5 max-w-lg leading-[1.75] text-[var(--color-text-muted)]">
                Films and full TV seasons. Filter by anything. Sort by anything.
                Headers adapt.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Half-star ratings, optional notes, the day you saw it",
                  "Films and TV-season entries side by side",
                  "Shared filter / sort across Diary and Watchlist",
                  "Export your diary, watchlist, and standout episodes",
                  "Genres and runtime visible on every watchlist row",
                ].map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-[0.9375rem] text-[var(--color-text-soft)]"
                  >
                    <div className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]/70" />
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="flex w-full min-w-0 justify-center md:flex-1" delay={180}>
              <DevicePair
                first={
                  <Image
                    src="/promo/diary-iphone.png"
                    alt="The Diary — filterable, sortable rows"
                    width={1206}
                    height={2622}
                    className="block w-full"
                  />
                }
                second={
                  <Image
                    src="/promo/watchlist-iphone.png"
                    alt="The Watchlist — genre + runtime on every row"
                    width={1206}
                    height={2622}
                    className="block w-full"
                  />
                }
              />
            </Reveal>
          </div>
        </section>

        <Divider />

        {/* ────────────────────── Feature 03 — Search ────────────────────── */}
        <section className="relative px-6 py-28 md:py-36 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-14 md:flex-row md:gap-20">
            <Reveal className="w-full min-w-0 md:flex-1">
              <SectionEyebrow number="03" title="Search & discover" />
              <h2 className="mt-5 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] tracking-[-0.01em]">
                Search that knows what you&rsquo;ve&nbsp;watched.
              </h2>
              <p className="mt-5 max-w-lg leading-[1.75] text-[var(--color-text-muted)]">
                Online catalog-backed. Every result tells you if it&rsquo;s
                already in your diary or watchlist.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Trending, popular, discover by genre + decade",
                  "Films, shows, and people in one query",
                  "Watched / Watching / Watchlist badges everywhere",
                  "TasteCard rows route here so you can keep exploring",
                ].map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-[0.9375rem] text-[var(--color-text-soft)]"
                  >
                    <div className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]/70" />
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="flex w-full min-w-0 justify-center md:flex-1" delay={180}>
              <DevicePair
                first={
                  <Image
                    src="/promo/search-iphone.png"
                    alt="Search results — films, shows, and people from the online catalog"
                    width={1206}
                    height={2622}
                    className="block w-full"
                  />
                }
                second={
                  <Image
                    src="/promo/movie-detail-iphone.png"
                    alt="Film detail — Watched / Watchlist badges in context"
                    width={1290}
                    height={2796}
                    className="block w-full"
                  />
                }
              />
            </Reveal>
          </div>
        </section>

        {/* ────────────────────── Import/export callout ────────────────────── */}
        <section className="relative px-6 py-20 lg:px-10">
          <Reveal className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-8 md:p-10">
              <SectionEyebrow prefix="Also" title="Import + export" />
              <h3 className="mt-4 font-display text-[clamp(1.25rem,2.2vw,1.75rem)] leading-[1.15]">
                Bring your history in. Take your data&nbsp;out.
              </h3>
              <p className="mt-3 max-w-xl leading-[1.7] text-[var(--color-text-muted)]">
                Coming from Letterboxd? Export your data there, then drop the
                zip into cinefill to bring over your diary entries, reviews, and
                watchlist &mdash; anything you&rsquo;ve already logged is
                skipped. When you want a copy back out, cinefill exports a zip
                with JSON and CSV files for your diary, watchlist, and standout
                episodes.
              </p>
              <a
                href="/faq"
                className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-strong)]"
              >
                Read import and export answers
              </a>
            </div>
          </Reveal>
        </section>

        {/* ────────────────────── Final CTA ────────────────────── */}
        <section
          id="testflight"
          className="relative flex min-h-[60vh] items-center justify-center px-6 py-32 lg:px-10"
        >
          <div
            className="absolute top-1/2 left-1/2 h-[40vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]/[0.06] blur-[120px]"
            aria-hidden="true"
          />

          <Reveal className="relative text-center">
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.01em]">
              A diary worth keeping.
            </h2>
            <p className="mt-2 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9] text-[var(--color-accent)] text-glow">
              Join the TestFlight.
            </p>
            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
              iPhone, iOS 17+. First access, direct line to the team, a say in
              what comes&nbsp;next.
            </p>
            <div className="mt-9 flex justify-center">
              <a
                href={TESTFLIGHT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative inline-flex h-14 items-center gap-3 rounded-2xl bg-[var(--color-accent)] px-8 text-[1.0625rem] font-semibold text-[var(--color-accent-on)]"
              >
                <span className="absolute inset-0 rounded-2xl bg-[var(--color-accent)]/30 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <AppleIcon className="relative h-5 w-5" />
                <span className="relative">Join the TestFlight</span>
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
