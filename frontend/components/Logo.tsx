import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

type LogoProps = {
  className?: string;
  textClassName?: string;
};

export function Logo({ className = "", textClassName = "" }: LogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center text-inherit no-underline ${className}`.trim()}
      aria-label={brand.name}
    >
      {brand.logoSrc ? (
        <Image
          src={brand.logoSrc}
          alt={brand.name}
          width={140}
          height={36}
          className="h-8 w-auto"
          priority
        />
      ) : (
        <span
          className={`font-display text-xl font-bold leading-none tracking-tight ${textClassName}`.trim()}
        >
          {brand.name}
        </span>
      )}
    </Link>
  );
}
