import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ApplicationsTable } from "@/components/admin/applications/ApplicationsTable";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  const canRead =
    can(user, permissionCodes.workflowTaskAssignedRead) ||
    can(user, permissionCodes.fundingApplicationAllRead);

  if (!canRead) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description="Manage and track submitted funding applications."
        variant="contained"
        align="left"
        className="px-5 py-5 sm:px-6 sm:py-6"
      />
      <ApplicationsTable />
    </div>
  );
}
