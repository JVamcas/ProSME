import { LifeBuoy } from "lucide-react";
import Link from "next/link";

import { userInitials } from "@/lib/user-initials";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";

export function PortalUserSummary({
  context,
  dark = false,
}: {
  context: PortalContext;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-3 border-y py-4 ${dark ? "border-white/15" : "border-brand-navy/15"}`}
    >
      <span className="grid size-10 place-items-center rounded-full bg-brand-navy text-sm font-bold text-brand-white">
        {userInitials(context.displayName) || "SF"}
      </span>
      <div className="min-w-0">
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

export function PortalHelpLink({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${dark ? "text-white/80 hover:bg-white/10 focus-visible:ring-white" : "text-brand-navy hover:bg-brand-navy/10 focus-visible:ring-brand-navy"} focus-visible:outline-none focus-visible:ring-2`}
      href="/contact"
    >
      <LifeBuoy
        aria-hidden="true"
        className={`size-4 ${dark ? "text-brand-orange" : "text-brand-navy"}`}
      />
      Help and support
    </Link>
  );
}
