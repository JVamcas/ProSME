"use client";

import { usePathname } from "next/navigation";
import { PortalPageSkeleton } from "@/shared/ui/portal/PortalPageSkeleton";
import { PageShell } from "@/shared/ui/PageShell";
import { usePortalContext } from "@/shared/ui/portal/capability-context";
import { DashboardSkeleton } from "./DashboardSkeleton";

export function DashboardLoadingPage({
  applicant = false,
}: {
  applicant?: boolean;
}) {
  const { displayName } = usePortalContext();
  const pathname = usePathname();
  if (pathname !== (applicant ? "/portal" : "/admin")) {
    return <PortalPageSkeleton />;
  }
  return (
    <PageShell
      title={applicant ? `Welcome back, ${displayName}` : "Dashboard"}
      description={
        applicant
          ? "Here's an overview of your SME Fund activity."
          : "Overview of submitted applications and active workflow work."
      }
      variant={applicant ? "contained" : undefined}
    >
      <DashboardSkeleton />
    </PageShell>
  );
}
