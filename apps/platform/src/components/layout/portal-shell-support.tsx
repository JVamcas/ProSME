import { LifeBuoy } from "lucide-react";
import Link from "next/link";

import { userInitials } from "@/lib/user-initials";
import type { PortalContext } from "@/modules/profiles/profile.types";

export function PortalUserSummary({ context }: { context: PortalContext }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-y border-brand-navy/15 py-4">
      <span className="grid size-10 place-items-center rounded-full bg-brand-navy text-sm font-bold text-brand-white">
        {userInitials(context.displayName) || "SF"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-brand-navy">
          {context.displayName}
        </p>
        <p className="truncate text-xs text-brand-navy/65">
          {context.email}
        </p>
      </div>
    </div>
  );
}

export function PortalHelpLink() {
  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
      href="/contact"
    >
      <LifeBuoy aria-hidden="true" className="size-4 text-brand-navy" />
      Help and support
    </Link>
  );
}
