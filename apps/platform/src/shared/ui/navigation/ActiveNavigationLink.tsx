"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  href: string;
  label: string;
};

export function ActiveNavigationLink({ className, href, label }: Props) {
  const pathname = usePathname();
  const active = href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative border-b-2 border-transparent text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:border-brand-orange focus-visible:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange",
        className,
        active && "border-brand-orange text-brand-orange",
      )}
      href={href}
    >
      {label}
    </Link>
  );
}
