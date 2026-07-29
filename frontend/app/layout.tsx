import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Courtly — Book tennis & padel courts",
  description:
    "Reserve tennis and padel courts in a few taps. Clear times, fair prices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${figtree.variable} min-h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-background font-body text-foreground">
        {children}
      </body>
    </html>
  );
}
