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
  const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return <Link aria-current={active ? "page" : undefined} className={cn(className, active && "text-brand-navy underline decoration-2 underline-offset-4")} href={href}>{label}</Link>;
}
