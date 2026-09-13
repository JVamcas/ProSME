"use client";

import Link from "next/link";

import type { PortalSpace } from "@/auth/authorization/portal-access";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";
import { cn } from "@/lib/utils";

const spaceDetails: Record<
  PortalSpace,
  { href: string; label: string }
> = {
  applicant: {
    href: "/portal",
    label: "Applicant",
  },
  operations: {
    href: "/admin",
    label: "Operations",
  },
};

type PortalSpaceSwitcherProps = {
  availableSpaces: PortalContext["availableSpaces"];
  currentSpace: PortalSpace;
};

export function PortalSpaceSwitcher({
  availableSpaces,
  currentSpace,
}: PortalSpaceSwitcherProps) {
  if (availableSpaces.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Switch portal space">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-navy/70">
        Workspace
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-brand-navy/10 p-1">
        {availableSpaces.map((space) => {
          const details = spaceDetails[space];
          const active = space === currentSpace;

          return (
            <Link
              key={space}
              href={details.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-2 py-2 text-center text-xs font-bold text-brand-navy",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy",
                active && "bg-brand-navy text-brand-white",
              )}
            >
              {details.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
