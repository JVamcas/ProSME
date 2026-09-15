import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  inverted?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
};

export function Logo({
  inverted = false,
  compact = false,
  className,
  href = "/",
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center", className)}
      aria-label="SME Fund home"
    >
      <Image
        src="/brand/sme-fund-logo-white.svg"
        alt=""
        width={1640}
        height={330}
        className={cn(
          "h-auto",
          compact ? "w-32" : "w-36",
          inverted && "brightness-0 invert",
        )}
      />
    </Link>
  );
}
