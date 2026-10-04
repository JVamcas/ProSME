import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { WorkQueueWorkspace } from "@/modules/work-queue/ui/WorkQueueWorkspace";

export const metadata: Metadata = { title: "Assigned tasks" };

export default async function WorkQueuePage() {
  const user = await getAuthenticatedPageUser();
  if (!can(user, permissionCodes.workflowTaskAssignedRead))
    redirect("/unauthorized");
  return <WorkQueueWorkspace />;
}
