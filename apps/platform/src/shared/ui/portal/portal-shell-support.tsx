import { LifeBuoy } from "lucide-react";
import Link from "next/link";

import { userInitials } from "@/lib/user-initials";
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
    <div
      className={`flex shrink-0 items-center border-y py-4 ${collapsed ? "justify-center" : "gap-3"} ${dark ? "border-white/15" : "border-brand-navy/15"}`}
      title={
        collapsed ? `${context.displayName} (${context.email})` : undefined
      }
    >
      <span className="grid size-10 place-items-center rounded-full bg-brand-navy text-sm font-bold text-brand-white">
        {userInitials(context.displayName) || "SF"}
      </span>
      <div className={collapsed ? "sr-only" : "min-w-0"}>
        <p
          className={`truncate text-sm font-bold ${dark ? "text-white" : "text-brand-slate-50"}`}
        >
          {context.displayName}
        </p>
        <p
          className={`truncate text-xs ${dark ? "text-white/55" : "text-brand-navy/65"}`}
        >
          {context.email}
        </p>
      </div>
    </div>
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
