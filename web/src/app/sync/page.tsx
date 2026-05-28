import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SectionEyebrow } from "@/components/section-eyebrow";

export const metadata: Metadata = {
  title: "Sync Setup",
  description:
    "How to connect cinefill to a compatible personal sync server, including required endpoints, headers, and payload shape.",
  alternates: { canonical: "/sync" },
};

const codeClass =
  "mt-4 overflow-x-auto rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-elevated)]/45 p-4 text-[0.82rem] leading-relaxed text-[var(--color-text-soft)]";

export default function SyncPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24">
        <article className="mx-auto max-w-3xl px-6 lg:px-10">
          <SectionEyebrow title="Sync setup" />
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            Bring your own sync server.
          </h1>
          <p className="mt-5 max-w-2xl text-[var(--color-text-soft)] leading-[1.75]">
            This guide is for people comfortable running a web server. Sync is
            completely optional &mdash; if that&rsquo;s not you, cinefill works
            fully without it. cinefill stores data on your device first. When you
            turn sync on, you give the app a server URL and a personal token, and
            it mirrors your diary, watchlist, and standout episodes to that
            server.
          </p>

          <figure className="mt-10 overflow-hidden rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/35">
            <Image
              src="/content/sync-screenshot.png"
              alt="cinefill sync settings with server URL, token, connection check, and sync controls"
              width={1668}
              height={2388}
              priority
              className="block w-full"
            />
          </figure>

          <section className="mt-12">
            <h2 className="font-display text-2xl">What the app calls</h2>
            <p className="mt-3 text-[var(--color-text-muted)] leading-[1.7]">
              Enter the origin of your server in the app, for example{" "}
              <code className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-[0.85em]">
                https://media.example.com
              </code>
              . cinefill appends these paths:
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/35 p-5">
                <h3 className="font-display text-lg">Health check</h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  <code>GET /api/cinefill/v1/health</code> should return any 2xx
                  response when the bearer token is valid. The app uses this to
                  test your settings.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/35 p-5">
                <h3 className="font-display text-lg">Sync exchange</h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  <code>POST /api/cinefill/v1/sync</code> receives local changes
                  and returns server changes in one request. Use{" "}
                  <code>Authorization: Bearer YOUR_TOKEN</code> and{" "}
                  <code>Content-Type: application/json</code>.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Request shape</h2>
            <p className="mt-3 text-[var(--color-text-muted)] leading-[1.7]">
              The app sends a schema version, its device ID, the last cursor it
              received, and dirty local records grouped by collection.
            </p>
            <pre className={codeClass}>
              <code>{`{
  "schemaVersion": 1,
  "deviceId": "device:...",
  "cursor": "opaque-server-cursor-or-null",
  "changes": {
    "diaryEntries": [],
    "watchlistItems": [],
    "episodeStandouts": []
  }
}`}</code>
            </pre>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Response shape</h2>
            <p className="mt-3 text-[var(--color-text-muted)] leading-[1.7]">
              Return the records you accepted, the next cursor, and any remote
              changes the device has not seen yet. Cursors are opaque: choose a
              timestamp, sequence number, or durable change-log token that works
              for your server.
            </p>
            <pre className={codeClass}>
              <code>{`{
  "schemaVersion": 1,
  "serverTime": "2026-05-28T21:00:00.000Z",
  "nextCursor": "opaque-server-cursor",
  "accepted": {
    "diaryEntries": ["diary:..."],
    "watchlistItems": ["watchlist:movie:123"],
    "episodeStandouts": ["standout:123:1:4"]
  },
  "changes": {
    "diaryEntries": [],
    "watchlistItems": [],
    "episodeStandouts": []
  }
}`}</code>
            </pre>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Record shapes</h2>
            <p className="mt-3 text-[var(--color-text-muted)] leading-[1.7]">
              Each collection uses the same merge fields: <code>syncId</code>,{" "}
              <code>updatedAt</code>, <code>deletedAt</code>, and{" "}
              <code>lastModifiedDeviceId</code>. These examples show the fields
              your server should store and return.
            </p>

            <h3 className="mt-8 font-display text-lg">DiaryEntry</h3>
            <pre className={codeClass}>
              <code>{`{
  "syncId": "diary:lwm7c4x1:ab12cd34ef56gh78",
  "tmdbId": 123,
  "mediaType": "movie",
  "seasonNumber": null,
  "seasonName": null,
  "title": "Example Film",
  "year": "2026",
  "posterPath": "/poster.jpg",
  "watchedDate": "2026-05-28",
  "rating": 4.5,
  "note": "A private note.",
  "isPublic": false,
  "createdAt": 1779991200000,
  "updatedAt": 1779991200000,
  "deletedAt": null,
  "lastModifiedDeviceId": "device:..."
}`}</code>
            </pre>

            <h3 className="mt-8 font-display text-lg">WatchlistItem</h3>
            <pre className={codeClass}>
              <code>{`{
  "syncId": "watchlist:movie:123",
  "tmdbId": 123,
  "mediaType": "movie",
  "title": "Example Film",
  "year": "2026",
  "posterPath": "/poster.jpg",
  "isPublic": false,
  "addedAt": 1779991200000,
  "updatedAt": 1779991200000,
  "deletedAt": null,
  "lastModifiedDeviceId": "device:..."
}`}</code>
            </pre>

            <h3 className="mt-8 font-display text-lg">EpisodeStandout</h3>
            <pre className={codeClass}>
              <code>{`{
  "syncId": "standout:456:1:4",
  "tmdbId": 456,
  "seasonNumber": 1,
  "episodeNumber": 4,
  "episodeName": "Example Episode",
  "showTitle": "Example Show",
  "posterPath": "/season-poster.jpg",
  "markedAt": 1779991200000,
  "updatedAt": 1779991200000,
  "deletedAt": null,
  "lastModifiedDeviceId": "device:..."
}`}</code>
            </pre>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Server checklist</h2>
            <ul className="mt-5 space-y-4 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
              <li>
                Store records by <code>syncId</code>. Each record includes{" "}
                <code>updatedAt</code>, <code>deletedAt</code>, and{" "}
                <code>lastModifiedDeviceId</code> so clients can merge changes.
              </li>
              <li>
                Treat <code>deletedAt</code> records as tombstones. Keep them
                long enough for other devices to learn that something was
                removed.
              </li>
              <li>
                Return only records owned by the token holder. cinefill does not
                send accounts or passwords; your token is the boundary.
              </li>
              <li>
                Keep diary and watchlist records private unless{" "}
                <code>isPublic</code> is true. Public media pages should render
                only records the user explicitly marked public.
              </li>
              <li>
                Make the operation idempotent. If a device retries the same
                request, accepting the same <code>syncId</code> again should be
                harmless.
              </li>
            </ul>
          </section>

          <section className="mt-12 rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-elevated)]/40 p-6">
            <h2 className="font-display text-2xl">In the app</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Open the gear in the You tab, choose <em>Sync</em>, enter your
              server URL and token, then tap <em>Check connection</em>. Once the
              health check passes, enable sync and tap <em>Sync now</em>.
            </p>
            <p className="mt-4 text-[var(--color-text-soft)] leading-[1.7]">
              For privacy behavior and common questions, read the{" "}
              <Link
                href="/faq"
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                FAQ
              </Link>
              .
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
