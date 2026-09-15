"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";

import { capabilities } from "@/auth/authorization/capabilities";
import type { PortalSpace } from "@/auth/authorization/portal-access";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";
import { PortalUserMenu } from "./portal-user-menu";

type PortalTopbarProps = {
  context: PortalContext;
  space: PortalSpace;
};

function NotificationEntry({ enabled }: { enabled: boolean }) {
  const styles =
    "grid size-11 place-items-center rounded-full hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy";

  if (enabled) {
    return (
      <Link
        aria-label="Notifications"
        className={styles}
        href="/portal/notifications"
      >
        <Bell aria-hidden="true" className="size-5 text-brand-orange" />
      </Link>
    );
  }

  return (
    <span
      aria-label="Notifications unavailable"
      className={`${styles} cursor-not-allowed opacity-50`}
      role="img"
      title="Notifications are not available yet"
    >
      <Bell aria-hidden="true" className="size-5 text-brand-orange" />
    </span>
  );
}

export function PortalTopbar({ context, space }: PortalTopbarProps) {
  const applicantSpace = space === "applicant";
  const searchHref = applicantSpace
    ? "/portal/funding-opportunities"
    : "/admin/applications";
  const searchLabel = applicantSpace
    ? "Search funding opportunities"
    : "Search applications, users, documents...";
  const canViewNotifications = context.capabilityCodes.includes(
    capabilities.notificationReadOwn,
  );

  return (
    <header className="hidden h-20 items-center justify-between gap-8 border-b border-brand-navy/10 bg-brand-white px-8 lg:flex">
      <Link
        className="flex min-h-11 w-full max-w-sm items-center gap-3 rounded-xl border border-brand-navy/20 bg-brand-white px-4 text-sm text-brand-navy/70 hover:border-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
        href={searchHref}
      >
        <Search aria-hidden="true" className="size-4 text-brand-orange" />
        {searchLabel}
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        <NotificationEntry enabled={canViewNotifications} />
        <PortalUserMenu context={context} />
      </div>
    </header>
  );
}
