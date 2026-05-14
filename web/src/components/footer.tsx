import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--color-border)]/60 px-6 py-14 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center" aria-label="cinefill">
          <Image
            src="/hybridmark-light.png"
            alt="cinefill"
            width={1531}
            height={512}
            className="h-10 w-auto opacity-90"
          />
        </Link>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[0.8125rem] text-[var(--color-text-muted)]">
          <Link
            href="/support"
            className="transition-colors hover:text-[var(--color-text)]"
          >
            Support
          </Link>
          <Link
            href="/faq"
            className="transition-colors hover:text-[var(--color-text)]"
          >
            FAQ
          </Link>
          <Link
            href="/privacy"
            className="transition-colors hover:text-[var(--color-text)]"
          >
            Privacy
          </Link>
          <a
            href="https://letterboxd.com/settings/data"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-[var(--color-text)]"
          >
            Letterboxd export
          </a>
          <span className="text-[var(--color-text-muted)]/60">
            © {new Date().getFullYear()} cinefill
          </span>
        </div>
      </div>
    </footer>
  );
}
