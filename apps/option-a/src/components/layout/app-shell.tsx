"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInternal = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");

  if (isInternal) return <main>{children}</main>;

  return <><SiteHeader /><main>{children}</main><SiteFooter /></>;
}
