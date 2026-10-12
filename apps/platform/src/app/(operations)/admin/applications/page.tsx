import { adminApplicationListSchema } from "@/modules/applications/api/AdminApplicationSchemas";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { StaffApplicationsTable } from "@/modules/applications/ui/staff/StaffApplicationsTable";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function StaffApplicationsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = adminApplicationListSchema.safeParse(await searchParams);
  const initialFilters = parsed.success ? parsed.data : { limit: 25, status: "all" as const };
  const user = await getAuthenticatedPageUser();
  const canRead =
    can(user, permissionCodes.workflowTaskAssignedRead) ||
    can(user, permissionCodes.fundingApplicationAllRead);

  if (!canRead) {
    redirect("/unauthorized");
  }

  return (
    <PageShell
      title="Applications"
      description="Manage and track submitted funding applications."
      variant="contained"
      align="left"
      headerClassName="px-5 py-5 sm:px-6 sm:py-6"
    >
      <StaffApplicationsTable
        key={JSON.stringify(initialFilters)}
        initialFilters={initialFilters}
      />
    </PageShell>
  );
}
