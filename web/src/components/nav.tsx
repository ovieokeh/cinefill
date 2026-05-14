import Image from "next/image";
import Link from "next/link";

export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

export function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[var(--color-border)]/60 bg-[var(--color-bg)]/60 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center" aria-label="cinefill">
          <Image
            src="/wordmark-light.png"
            alt="cinefill"
            width={945}
            height={207}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/#loop"
            className="text-[0.8125rem] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            How it works
          </Link>
          <Link
            href="/#features"
            className="text-[0.8125rem] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            Features
          </Link>
          <Link
            href="/faq"
            className="text-[0.8125rem] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            FAQ
          </Link>
          <Link
            href="/#testflight"
            className="group relative inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 text-[0.8125rem] font-semibold text-[var(--color-accent-on)]"
          >
            <span className="absolute inset-0 rounded-xl bg-[var(--color-accent)]/30 opacity-0 blur-lg transition-opacity group-hover:opacity-100" />
            <AppleIcon className="relative h-4 w-4" />
            <span className="relative">TestFlight</span>
          </Link>
        </div>
        <Link
          href="/#testflight"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-[var(--color-accent-on)] md:hidden"
        >
          <AppleIcon className="h-4 w-4" />
          TestFlight
        </Link>
      </div>
    </nav>
  );
}
