import Image from "next/image";
import { Reveal } from "@/app/reveal";
import { AppleIcon } from "@/components/nav";
import { DeviceFrame } from "@/components/device-frame";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/7eqjVY9X";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center px-6 pt-24 pb-16 lg:px-10">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 md:grid-cols-[1.2fr_1fr] md:gap-20">
        {/* Copy column */}
        <div className="text-center md:text-left">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.3em] text-[var(--color-accent)]/50">
            Local-first film & TV diary
          </p>
          <h1 className="mt-6 font-display font-bold text-[clamp(2.5rem,6vw,4.75rem)] leading-[1] tracking-[-0.015em]">
            A quiet film&nbsp;&amp; TV
          </h1>
          <p className="mt-1 font-display font-bold text-[clamp(2.5rem,6vw,4.75rem)] leading-[1] tracking-[-0.015em] text-[var(--color-accent)] text-glow">
            diary.
          </p>
          <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-[var(--color-text-muted)] md:mx-0 md:text-[1.0625rem]">
            Track films and TV without an audience. Local-first, no accounts,
            and optional personal sync only when you enable it.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4 md:justify-start">
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
            <a
              href="#loop"
              className="inline-flex h-14 items-center gap-2 rounded-2xl border border-[var(--color-border)] px-8 text-base text-[var(--color-text-muted)] transition-all hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              See what&rsquo;s inside
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Device column */}
        <Reveal className="flex justify-center md:justify-end" delay={200}>
          <DeviceFrame glow="hero" className="w-full max-w-[19rem] md:max-w-[22rem]">
            <Image
              src="/promo/your-taste-iphone.png"
              alt="cinefill's You tab — your taste, written like a magazine cover"
              width={1206}
              height={2622}
              priority
              className="block w-full"
            />
          </DeviceFrame>
        </Reveal>
      </div>
    </section>
  );
}
