import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SectionEyebrow } from "@/components/section-eyebrow";

const SUPPORT_EMAIL = "nerdbrainmatter@gmail.com";
const LAST_UPDATED = "May 12, 2026";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "cinefill is a local-first film and TV diary. No accounts. No analytics. No tracking. Your data never leaves your phone.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24">
        <article className="mx-auto max-w-2xl px-6 lg:px-10">
          <SectionEyebrow title="Privacy" />
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            What we do and don&rsquo;t&nbsp;collect.
          </h1>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Last updated: {LAST_UPDATED}
          </p>

          <p className="mt-8 text-[var(--color-text-soft)] leading-[1.75]">
            cinefill is a local-first film and TV diary. Everything you log,
            save, or set up lives on your iPhone, not on our servers.
            We don&rsquo;t have servers for your data. We don&rsquo;t have
            accounts. There&rsquo;s nothing for us to lose, sell, or hand over.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl">What we don&rsquo;t collect</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Nothing. No accounts. No email addresses (unless you write to us).
              No analytics. No crash reporting. No advertising identifiers. No
              location. No contacts. No photos. No microphone or camera. No
              behavioural profile.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">What stays on your device</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Your diary entries, watchlist, ratings, notes, standout episodes,
              and cached TMDB metadata are stored in an on-device SQLite
              database. They don&rsquo;t sync, they don&rsquo;t back up to us,
              and they don&rsquo;t leave the device unless you explicitly
              export or share them yourself.
            </p>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              If you delete cinefill or reset your phone, the data goes with
              it. We can&rsquo;t recover it as we never had a copy.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Third parties</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              cinefill talks to two third-party services and no others:
            </p>
            <ul className="mt-5 space-y-4 text-[var(--color-text-soft)] leading-[1.7]">
              <li>
                <strong className="text-[var(--color-text)]">TMDB</strong> (
                <a
                  href="https://www.themoviedb.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  themoviedb.org
                </a>
                ). When you search, browse trending, or open a film/TV detail
                page, cinefill sends a query to TMDB&rsquo;s API to fetch
                metadata. cinefill doesn&rsquo;t add user identifiers to those
                requests. TMDB sees only the query text and the IP
                address of the request. TMDB&rsquo;s privacy policy is at{" "}
                <a
                  href="https://www.themoviedb.org/privacy-policy"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  themoviedb.org/privacy-policy
                </a>
                .
              </li>
              <li>
                <strong className="text-[var(--color-text)]">Apple TestFlight</strong>{" "}
                (during the beta). If you&rsquo;re running the TestFlight
                build, Apple collects standard TestFlight crash and usage
                telemetry under their own privacy policy at{" "}
                <a
                  href="https://www.apple.com/legal/privacy/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  apple.com/legal/privacy
                </a>
                . This stops applying once cinefill is on the App Store.
              </li>
            </ul>
            <p className="mt-5 text-[var(--color-text-soft)] leading-[1.7]">
              cinefill doesn&rsquo;t talk to any analytics, advertising,
              attribution, or tracking service.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Letterboxd import</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              The Letterboxd import feature reads the{" "}
              <code className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-[0.85em]">
                .zip
              </code>{" "}
              export file you pick from your device storage. cinefill parses it
              entirely on-device and matches each film to TMDB. The zip itself
              isn&rsquo;t uploaded anywhere. Only the per-film search
              queries needed for TMDB matching leave your device, the same way
              regular search does.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Cookies + the website</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              This website (cinefill.app) doesn&rsquo;t set any cookies and
              doesn&rsquo;t run analytics. The app itself doesn&rsquo;t use
              cookies at all &mdash; it&rsquo;s a native iOS app.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Children</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              cinefill isn&rsquo;t directed at children under 13 and
              doesn&rsquo;t knowingly collect data from them. Since we
              don&rsquo;t collect data from anyone, this is automatically the
              case.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Changes</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              If this policy changes, the updated version lives at this URL.
              The &ldquo;last updated&rdquo; date at the top will reflect the
              change. Material changes like adding analytics or a new
              third-party service will also be called out in the
              app&rsquo;s release notes.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Contact</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Questions about privacy? Email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
