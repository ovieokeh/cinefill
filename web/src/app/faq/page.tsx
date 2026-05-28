import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SectionEyebrow } from "@/components/section-eyebrow";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "cinefill FAQ: importing your diary, exporting your data, optional sync, privacy controls, and troubleshooting.",
  alternates: { canonical: "/faq" },
};

const importFaqs = [
  {
    question: "Can I import my Letterboxd diary?",
    answer: (
      <>
        Yes. cinefill reads the export zip Letterboxd gives you &mdash; diary
        entries, ratings, reviews, and watchlist. The import runs on your
        device, skips anything you&rsquo;ve already logged, and keeps your
        original watched dates where possible.
      </>
    ),
  },
  {
    question: "How do I get my Letterboxd export?",
    answer: (
      <>
        Sign in on the Letterboxd website (this isn&rsquo;t in their app), open{" "}
        <em>Settings → Import &amp; Export</em>, and choose{" "}
        <em>Export Your Data</em>. That downloads a zip. Save it to your iPhone
        &mdash; the Files app is easiest &mdash; then import it in cinefill.
        Leave the zip as-is; cinefill expects the files inside to keep their
        original names and folders.
      </>
    ),
  },
  {
    question: "Where do I start the import in cinefill?",
    answer: (
      <>
        Open the gear (settings) icon in the You tab, choose <em>Import</em>,
        then pick the Letterboxd zip from Files.
      </>
    ),
  },
  {
    question: "What happens if something cannot be matched?",
    answer: (
      <>
        cinefill imports the entries it can match cleanly and leaves unmatched
        items out rather than guessing. You can still add those films or shows
        manually from Search afterward.
      </>
    ),
  },
  {
    question: "Does importing upload my data?",
    answer: (
      <>
        No. Importing reads the file you choose on-device and writes the matched
        entries into your local diary and watchlist. It does not create an
        account or upload your diary to cinefill.
      </>
    ),
  },
  {
    question: "Can I export instead of syncing?",
    answer: (
      <>
        Yes. Export data creates a local zip with JSON and CSV files for your
        diary, watchlist, and TV episode standouts. Exporting does not send data
        to cinefill or to a sync server.
      </>
    ),
  },
];

const syncFaqs = [
  {
    question: "What is sync?",
    answer: (
      <>
        Sync is an advanced, optional feature for people who can run (or already
        have) their own server. If that&rsquo;s not you, you can safely skip it
        &mdash; cinefill works fully without it. When it&rsquo;s on, sync mirrors
        your data to your server so another device can pull it down. The app
        still saves on your device first, so logging, editing, deleting, and
        changing privacy never wait on the network.
      </>
    ),
  },
  {
    question: "What data is synced?",
    answer: (
      <>
        cinefill syncs the things you create: diary entries, watchlist items, TV
        episode standouts (episodes you&rsquo;ve flagged as favorites), a record
        of anything you deleted (so your other devices stay in step), sync
        timestamps, and a random ID the app generates to identify your device.
        It does not sync cached film and TV data from TMDB, analytics, contacts,
        photos, or location.
      </>
    ),
  },
  {
    question: "How do I set it up?",
    answer: (
      <>
        Open the gear (settings) icon in the You tab, choose <em>Sync</em>, and
        enter your server URL and personal token. Tap <em>Check connection</em>{" "}
        to confirm the details work, turn on <em>Enable sync</em>, then tap{" "}
        <em>Sync now</em>. Your server needs to speak cinefill&rsquo;s sync
        format at{" "}
        <Link
          href="/sync"
          className="text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          <code className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-[0.85em]">
            /api/cinefill/v1
          </code>
        </Link>
        .
      </>
    ),
  },
  {
    question: "What is the personal token?",
    answer: (
      <>
        Think of the token as a password that only your app and your server
        know. cinefill keeps it in your device&rsquo;s secure storage (the same
        protected area apps use for passwords) and sends it only to the server
        URL you entered, to prove the request is really you.
      </>
    ),
  },
  {
    question: "What happens on the first sync?",
    answer: (
      <>
        Existing diary entries, watchlist items, and standout episodes are
        uploaded as private records. Other devices using the same server and
        token can then pull them down. The first sync can take a moment if you
        imported a large history.
      </>
    ),
  },
  {
    question: "Is synced data public?",
    answer: (
      <>
        No. Synced diary and watchlist records are private by default. They
        should not appear on a public website unless you explicitly turn on the{" "}
        <em>Make public</em> control for that specific log or watchlist item.
        TV episode standouts sync for your devices but are not public-facing in
        this version.
      </>
    ),
  },
  {
    question: "Where are the public controls?",
    answer: (
      <>
        Public controls only appear after sync is configured. For diary logs,
        use the toggle in the log form or the log action sheet. For watchlist
        items, open the movie or show action sheet and use{" "}
        <em>Make watchlist public</em>.
      </>
    ),
  },
  {
    question: "If I disable sync, does it delete server data?",
    answer: (
      <>
        No. Turning off sync stops future syncing from that device. It does not
        delete records already stored on your server. To remove server-side
        records, delete/reset data while sync is enabled, or manage the data on
        your server directly.
      </>
    ),
  },
  {
    question: "What do deletes do?",
    answer: (
      <>
        With sync on, deleting something leaves behind a small &ldquo;this was
        removed&rdquo; marker so your other devices know to remove it too. That
        means resetting all data while sync is on erases it everywhere, not just
        on the device in your hand.
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24">
        <article className="mx-auto max-w-2xl px-6 lg:px-10">
          <SectionEyebrow title="FAQ" />
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            Import, export, and sync without surprises.
          </h1>
          <p className="mt-5 text-[var(--color-text-soft)] leading-[1.75]">
            cinefill is local-first. Bring a diary in, take a copy back out, and
            enable sync only when you want backup, multiple devices, or a
            personal public media page.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Import + export</h2>
            <div className="mt-6 space-y-8">
              {importFaqs.map((item) => (
                <div key={item.question}>
                  <h3 className="font-display text-lg text-[var(--color-text)]">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Sync basics</h2>
            <div className="mt-6 space-y-8">
              {syncFaqs.map((item) => (
                <div key={item.question}>
                  <h3 className="font-display text-lg text-[var(--color-text)]">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-elevated)]/40 p-6">
            <h2 className="font-display text-2xl">Still stuck?</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              The short version: save your server URL and token, tap Sync now,
              then check the status message. If the server rejects the request,
              verify that the token matches your server&rsquo;s configured
              sync token. If you&rsquo;re running your own server, start with the{" "}
              <Link
                href="/sync"
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                sync setup guide
              </Link>
              .
            </p>
            <p className="mt-4 text-[var(--color-text-soft)] leading-[1.7]">
              For privacy details, read the{" "}
              <Link
                href="/privacy"
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                privacy policy
              </Link>
              . For help, email from the{" "}
              <Link
                href="/support"
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                support page
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
