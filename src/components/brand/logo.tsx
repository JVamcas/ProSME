import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)} aria-label="SME Fund home">
      <span className="flex h-11 w-[172px] items-center justify-center overflow-hidden rounded bg-white px-1">
        <Image src="/brand/sme-fund-logo.svg" alt="SME Fund" width={164} height={33} priority />
      </span>
      <span className={cn("hidden border-l pl-3 text-[9px] font-bold uppercase leading-4 tracking-[.11em] sm:block", inverted ? "border-white/20 text-white/65" : "border-slate-200 text-navy/65")}>
        A ProSME<br />initiative
      </span>
    </Link>
  );
}
