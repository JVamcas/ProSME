import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { WorkQueueWorkspace } from "@/modules/work-queue/ui/WorkQueueWorkspace";

export const metadata: Metadata = { title: "Assigned tasks | Process Monitor" };

export default async function AssignedTasksMonitorPage() {
  const user = await getAuthenticatedPageUser();
  if (!can(user, permissionCodes.workflowTaskAllRead)) {
    redirect("/unauthorized");
  }
  return <WorkQueueWorkspace assignmentScope="all" />;
}
