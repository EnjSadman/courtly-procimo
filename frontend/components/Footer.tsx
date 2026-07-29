import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-10 sm:px-8">
        <Logo textClassName="text-lg" />
        <p className="max-w-xs text-sm leading-normal text-muted sm:text-base">
          Book tennis and padel courts in minutes.
        </p>
        <p className="mt-2 text-xs text-muted/70">
          © {new Date().getFullYear()} Courtly
        </p>
      </div>
    </footer>
  );
}
