import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SectionEyebrow } from "@/components/section-eyebrow";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "cinefill sync FAQ: what sync does, how to set it up, privacy controls, public sharing, and troubleshooting.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    question: "What is sync?",
    answer: (
      <>
        Sync is an optional way to mirror your cinefill data to a compatible
        server so another device can pull it down. The app still writes locally
        first; logging, editing, deleting, and toggling privacy never wait on
        the network.
      </>
    ),
  },
  {
    question: "What data is synced?",
    answer: (
      <>
        cinefill syncs user-owned records: diary entries, watchlist items, TV
        episode standouts, deletion markers, timestamps, and a random
        app-generated device ID. It does not sync the derived TMDB media cache,
        raw TMDB responses, analytics, contacts, photos, or location.
      </>
    ),
  },
  {
    question: "How do I set it up?",
    answer: (
      <>
        Open the gear in the You tab, choose <em>Sync</em>, enter your server
        URL and personal token, turn on <em>Enable sync</em>, then tap{" "}
        <em>Sync now</em>. The server must expose cinefill&rsquo;s sync API at{" "}
        <code className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-[0.85em]">
          /api/cinefill/v1
        </code>
        .
      </>
    ),
  },
  {
    question: "What is the personal token?",
    answer: (
      <>
        The token is a shared secret between your app and your sync server.
        cinefill stores it in the platform secure store on your device and sends
        it only as an authorization header when talking to the server URL you
        entered.
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
        imported a large Letterboxd history.
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
        With sync enabled, deletes become tombstones so other devices can learn
        that a record was removed. Resetting all data while sync is enabled is
        therefore a cross-device destructive action.
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

export default function FAQPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24">
        <article className="mx-auto max-w-2xl px-6 lg:px-10">
          <SectionEyebrow title="FAQ" />
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            Sync without surprises.
          </h1>
          <p className="mt-5 text-[var(--color-text-soft)] leading-[1.75]">
            cinefill is local-first. Sync is there when you want backup,
            multiple devices, or a personal public media page, and every public
            record is opt-in.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Sync basics</h2>
            <div className="mt-6 space-y-8">
              {faqs.map((item) => (
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
              The short version: save your server URL and token, run Sync Now,
              then check the status message. If the server rejects the request,
              verify that the token matches your server&rsquo;s configured
              sync token.
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
