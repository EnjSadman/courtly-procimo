"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="relative sticky top-0 z-40 animate-fade-in border-b border-border bg-header backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo />
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
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
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-ghost-hover"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/40 md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full z-50 border-b border-border bg-header backdrop-blur-md md:hidden"
          >
            <nav
              className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-4 sm:px-8"
              aria-label="Account"
            >
              <Link
                href="/sign-in"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-ghost-hover"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover"
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
