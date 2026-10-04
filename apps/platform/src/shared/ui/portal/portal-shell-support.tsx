import { LifeBuoy } from "lucide-react";
import Link from "next/link";

import { SidebarUserSummary } from "../navigation/SidebarUserSummary";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";

export function PortalUserSummary({
  collapsed = false,
  context,
  dark = false,
}: {
  collapsed?: boolean;
  context: PortalContext;
  dark?: boolean;
}) {
  return (
    <SidebarUserSummary
      collapsed={collapsed}
      dark={dark}
      displayName={context.displayName}
      email={context.email}
    />
  );
}

export function PortalHelpLink({
  collapsed = false,
  dark = false,
}: {
  collapsed?: boolean;
  dark?: boolean;
}) {
  return (
    <Link
      className={`flex min-h-11 items-center rounded-xl text-sm font-semibold ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${dark ? "text-white/80 hover:bg-white/10 focus-visible:ring-white" : "text-brand-navy hover:bg-brand-navy/10 focus-visible:ring-brand-navy"} focus-visible:outline-none focus-visible:ring-2`}
      href="/contact"
      title={collapsed ? "Help and support" : undefined}
    >
      <LifeBuoy
        aria-hidden="true"
        className={`size-4 ${dark ? "text-brand-orange" : "text-brand-navy"}`}
      />
      <span className={collapsed ? "sr-only" : undefined}>
        Help and support
      </span>
    </Link>
  );
}
