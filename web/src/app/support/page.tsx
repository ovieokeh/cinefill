import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SectionEyebrow } from "@/components/section-eyebrow";

const SUPPORT_EMAIL = "nerdbrainmatter@gmail.com";

export const metadata: Metadata = {
  title: "Support",
  description:
    "How to get help with cinefill — contact, common issues, bug reports, and App Store support.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-24">
        <article className="mx-auto max-w-2xl px-6 lg:px-10">
          <SectionEyebrow title="Support" />
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            Need a hand?
          </h1>
          <p className="mt-5 text-[var(--color-text-soft)] leading-[1.75]">
            cinefill is a one-person project. I read every message and reply
            quickly. Tell me what you were doing and the iPhone model + iOS
            version helps a lot.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Contact</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              . That&rsquo;s it.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Common questions</h2>
            <div className="mt-6 space-y-8">
              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  My Letterboxd import skipped some films
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  TMDB matching isn&rsquo;t perfect. When a film&rsquo;s title
                  in your Letterboxd export doesn&rsquo;t map cleanly to any
                  TMDB record, cinefill flags it as unmatched rather than
                  guessing. The import wizard lists them at the end so you can
                  add the missing ones by hand.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  The wrong film got matched
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  Open the entry from your diary, delete it, and search again
                  by title in the Search tab. TMDB usually has the right
                  record &mdash; the import just picked the wrong one.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  My data is gone
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  cinefill stores everything locally first. If sync was enabled
                  and had completed, install cinefill again, enter the same
                  server URL and token, then tap Sync now. If sync was never
                  configured, or the data never reached your server, deleting
                  the app or wiping the phone removes the only copy.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  What does sync upload?
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  Sync is optional. When enabled, cinefill mirrors diary
                  entries, watchlist items, standout episodes, a record of
                  anything you deleted, sync timestamps, and a random device ID
                  to the server URL you enter. Diary and watchlist items are
                  private by default, and only items you mark public should
                  appear on a public site. Cached TMDB metadata stays local. The
                  privacy page has the full list.
                </p>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  The{" "}
                  <Link
                    href="/faq"
                    className="text-[var(--color-accent)] underline-offset-4 hover:underline"
                  >
                    FAQ
                  </Link>{" "}
                  explains setup, tokens, and public visibility controls.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  How do I export my data?
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  Open the gear in the You tab and tap <em>Export data</em>.
                  cinefill creates a zip with JSON and CSV files for your
                  diary, watchlist, and standout episodes, then opens the iOS
                  share sheet so you can save or send it wherever you want.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  I want to start over
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  Tap the gear in the You tab &rarr; <em>Reset all data</em>.
                  Wipes diary, watchlist, and standout episodes in one go. If
                  sync is enabled, those deletions can sync to other devices
                  using the same server.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg text-[var(--color-text)]">
                  A film I want to log isn&rsquo;t in TMDB
                </h3>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-[var(--color-text-muted)]">
                  cinefill can only render films that{" "}
                  <a
                    href="https://www.themoviedb.org"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[var(--color-accent)] underline-offset-4 hover:underline"
                  >
                    TMDB
                  </a>{" "}
                  knows about. If the film is missing there, you can submit it
                  to TMDB &mdash; it usually shows up in cinefill the next time
                  you search.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">Bug reports + feature requests</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Email is the way in. Screenshots help. So does a short note about
              what you expected to happen vs what did. If it&rsquo;s a crash,
              the iPhone model + iOS version is gold.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">App Store notes</h2>
            <p className="mt-3 text-[var(--color-text-soft)] leading-[1.7]">
              Install updates from the App Store when they appear. If something
              feels off after an update, email me with the app version and what
              changed.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
