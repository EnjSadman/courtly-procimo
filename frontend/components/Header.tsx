import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 animate-fade-in border-b border-border bg-header backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link
            href="/sign-in"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-ghost-hover"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
