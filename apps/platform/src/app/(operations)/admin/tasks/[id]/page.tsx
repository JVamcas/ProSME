import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { WorkflowTaskWorkspace } from "@/modules/work-queue/ui/WorkflowTaskWorkspace";

export const metadata: Metadata = { title: "Workflow task" };

export default async function WorkflowTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  if (
    !can(user, permissionCodes.workflowTaskAssignedRead) &&
    !can(user, permissionCodes.workflowTaskAllRead)
  ) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  return (
    <WorkflowTaskWorkspace
      canReadAllTasks={can(user, permissionCodes.workflowTaskAllRead)}
      canReadAssignedTasks={can(user, permissionCodes.workflowTaskAssignedRead)}
      canReadWorkflowProgress={
        can(user, permissionCodes.workflowInstanceAssignedRead) ||
        can(user, permissionCodes.workflowInstanceAllRead)
      }
      taskId={id}
    />
  );
}
