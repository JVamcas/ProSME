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
    <Link href={href} className={cn("group inline-flex items-center", className)} aria-label="ProSME home">
      <Image
        src="/brand/ProSME-logo-with-tagline.svg"
        alt=""
        width={530}
        height={205}
        className={cn("h-auto", compact ? "w-32" : "w-36", inverted && "brightness-110")}
      />
    </Link>
  );
}
