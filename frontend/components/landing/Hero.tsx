import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative isolate flex h-full flex-1 items-center justify-center overflow-hidden">
      <Image
        src={brand.heroImageSrc}
        alt=""
        fill
        priority
        className="-z-20 scale-105 object-cover object-center animate-fade-in-slow"
      />
      <div className="hero-scrim absolute inset-0 -z-10" aria-hidden="true" />
      <div className="flex max-w-xl flex-col items-center gap-4 px-5 py-10 text-center text-on-media sm:px-8">
        <h1 className="animate-fade-up font-display text-3xl font-bold leading-tight tracking-tighter sm:text-4xl lg:text-5xl">
          Your court, when you need it
        </h1>
        <p className="max-w-md animate-fade-up-late text-base leading-relaxed text-on-media-muted">
          Reserve tennis and padel courts in a few{" "}
          <span className="sm:hidden">taps</span>
          <span className="hidden sm:inline">clicks</span>
        </p>
        <Link
          href="/sign-up"
          className="mt-1 inline-flex min-h-12 animate-fade-up-last items-center justify-center rounded-lg bg-accent px-7 py-3 text-base font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover"
        >
          Try now
        </Link>
      </div>
    </section>
  );
}
