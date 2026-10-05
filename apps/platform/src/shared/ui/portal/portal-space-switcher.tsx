"use client";

import Link from "next/link";
import { useNavigationData } from "./useNavigationData";

import type { WorkspaceSpace } from "@/auth/authorization/portal-access";
import { cn } from "@/lib/utils";

const spaceDetails: Record<WorkspaceSpace, { href: string; label: string }> = {
  applicant: {
    href: "/portal",
    label: "Applicant",
  },
  operations: {
    href: "/admin",
    label: "Operations",
  },
  cms: {
    href: "/cms",
    label: "CMS",
  },
};

const workspaceOrder: readonly WorkspaceSpace[] = [
  "applicant",
  "operations",
  "cms",
];

type PortalSpaceSwitcherProps = {
  availableSpaces: readonly WorkspaceSpace[];
  currentSpace: WorkspaceSpace;
  dark?: boolean;
};

export function PortalSpaceSwitcher({
  availableSpaces,
  currentSpace,
  dark = false,
}: PortalSpaceSwitcherProps) {
  const prepareData = useNavigationData();

  return (
    <nav aria-label="Switch portal space" className="font-sans">
      <p
        className={cn(
          "m-0 mb-2 text-[12px] font-bold uppercase leading-normal tracking-widest",
          dark ? "text-white/70" : "text-brand-navy/70",
        )}
      >
        Workspace
      </p>
      <div
        className={`grid grid-cols-3 gap-1 rounded-xl p-1 ${dark ? "bg-white/10" : "bg-brand-navy/10"}`}
      >
        {workspaceOrder.map((space) => {
          const details = spaceDetails[space];
          const active = space === currentSpace;
          const baseClassName =
            "box-border block min-w-0 truncate rounded-lg px-1 py-2 text-center text-[12px] font-bold leading-normal no-underline";
          if (!availableSpaces.includes(space)) {
            return (
              <span
                key={space}
                aria-disabled="true"
                className={cn(
                  baseClassName,
                  "cursor-not-allowed",
                  dark ? "text-white/40" : "text-brand-navy/40",
                )}
                title={`${details.label} is not available for your account`}
              >
                {details.label}
              </span>
            );
          }
          const activeClassName = dark
            ? "bg-brand-blue text-brand-navy"
            : "bg-brand-navy text-brand-white";
          const inactiveClassName = dark
            ? "text-white hover:bg-white/10"
            : "text-brand-navy hover:bg-brand-navy/10";

          return (
            <Link
              key={space}
              href={details.href}
              onNavigate={() => prepareData(details.href)}
              aria-current={active ? "page" : undefined}
              title={details.label}
              className={cn(
                baseClassName,
                dark
                  ? "focus-visible:ring-white"
                  : "focus-visible:ring-brand-navy",
                "focus-visible:outline-none focus-visible:ring-2",
                active ? activeClassName : inactiveClassName,
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
