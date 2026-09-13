import type { ComponentProps } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ArrowLinkProps = ComponentProps<typeof Link> & {
  iconClassName?: string;
};

export function ArrowLink({ children, className, iconClassName, ...props }: ArrowLinkProps) {
  return (
    <Link
      className={cn("inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand-navy", className)}
      {...props}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className={cn("size-4 underline", iconClassName)} />
    </Link>
  );
}
