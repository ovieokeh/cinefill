import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SectionEyebrow } from "@/components/section-eyebrow";

const SUPPORT_EMAIL = "nerdbrainmatter@gmail.com";
const LAST_UPDATED = "May 13, 2026";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "cinefill is a local-first film and TV diary. No accounts, analytics, or tracking. Optional sync sends only selected library data to a server you choose.",
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
            cinefill is a local-first film and TV diary. By default, everything
            you log, save, or set up lives on your iPhone. There are no
            accounts, no analytics, no advertising SDKs, and no tracking.
            Remote sync is optional and only runs after you enter a compatible
            server URL and personal token.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl">What we don&rsquo;t collect</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              We don&rsquo;t collect accounts, email addresses (unless you write
              to us), analytics, crash reports, advertising identifiers,
              location, contacts, photos, microphone or camera data, or a
              behavioural profile. If you enable remote sync to a server we
              operate, we collect only the sync records needed to provide that
              feature, described below.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">What stays on your device</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Your diary entries, watchlist, ratings, notes, standout episodes,
              and cached TMDB metadata are stored in an on-device SQLite
              database. With sync off, they don&rsquo;t back up to us and they
              don&rsquo;t leave the device unless you explicitly export or share
              them yourself.
            </p>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              If you delete cinefill or reset your phone before syncing or
              exporting, the data goes with it. We can&rsquo;t recover data we
              never received.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Optional remote sync</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Sync is off until you turn it on. When enabled, cinefill sends
              diary entries, watchlist items, TV episode standouts, deletion
              markers, sync timestamps, and a random app-generated device ID to
              the server URL you configure. Diary records may include titles,
              TMDB IDs, watched dates, ratings, notes, year, poster path, and TV
              season details.
            </p>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Your personal token is stored on-device using the platform secure
              store and is sent only as an authorization header when talking to
              your configured sync server. cinefill does not sync the local
              media cache, raw TMDB responses, contacts, photos, location, or
              analytics data.
            </p>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              If you use your own server, that server&rsquo;s operator controls
              how synced data is stored. If you use a server operated by us,
              synced data is used only for app functionality: keeping your
              diary, watchlist, and standout episodes mirrored between your
              devices. We do not sell it, use it for advertising, or share it
              with data brokers.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Third parties</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Depending on the features you use, cinefill may talk to these
              external services:
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
                <strong className="text-[var(--color-text)]">Your sync server</strong>
                . If you enable sync, cinefill sends the limited sync data
                described above to the compatible server URL you enter. Sync is
                not required to use the app.
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
            <h2 className="font-display text-2xl">Export data</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              The export feature creates a local zip file with JSON and CSV
              copies of your diary entries, watchlist items, and TV episode
              standouts. It does not include the derived TMDB cache. cinefill
              then hands that zip to the system share sheet so you choose where
              it goes, such as Files, AirDrop, Mail, or another app.
            </p>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Exporting does not send data to us. If you share the zip with a
              third-party app or cloud service, that destination handles it
              under its own privacy policy.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Cookies + the website</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              This website doesn&rsquo;t set any cookies and doesn&rsquo;t run
              analytics. The app itself doesn&rsquo;t use cookies at all &mdash;
              it&rsquo;s a native iOS app.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Children</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              cinefill isn&rsquo;t directed at children under 13 and
              doesn&rsquo;t knowingly collect data from them. Please don&rsquo;t
              enable sync for a child&rsquo;s data or send us child data in a
              support request.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Changes</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              If this policy changes, the updated version lives at this URL.
              The &ldquo;last updated&rdquo; date at the top will reflect the
              change. Material changes like adding analytics, changing sync
              behavior, or adding a new third-party service will also be called
              out in the app&rsquo;s release notes.
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
              If you used a sync server operated by us and want synced data
              deleted, include that in the email.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
