import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  inverted?: boolean;
  compact?: boolean;
  className?: string;
  href?: string;
};

export function Logo({ inverted = false, compact = false, className, href = "/" }: LogoProps) {
  return (
    <Link href={href} className={cn("group inline-flex shrink-0 flex-col items-start", className)} aria-label="SME Fund — Catalysing SME Growth">
      <Image
        src="/brand/sme-fund-logo.svg"
        alt="SME Fund"
        width={1640}
        height={330}
        priority
        className={cn("h-auto object-contain", compact ? "w-28" : "w-36", inverted && "brightness-0 invert")}
      />
      <span
        className={cn(
          "mt-1 whitespace-nowrap font-medium leading-none tracking-[.08em]",
          compact ? "text-[6px]" : "text-[8px]",
          inverted ? "text-white/80" : "text-slate-600",
        )}
      >
        Catalysing SME Growth
      </span>
    </Link>
  );
}
