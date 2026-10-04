import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { StaffApplicationDetailWorkspace } from "@/modules/applications/ui/StaffApplicationDetailWorkspace";

export const metadata: Metadata = { title: "Application overview" };

type ApplicationPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApplicationPage({
  params,
  searchParams,
}: ApplicationPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getAuthenticatedPageUser();
  const canRead =
    can(user, permissionCodes.workflowTaskAssignedRead) ||
    can(user, permissionCodes.fundingApplicationAllRead);

  if (!canRead) {
    redirect("/unauthorized");
  }

  const applicationId = decodeURIComponent(id);
  if (!z.uuid().safeParse(applicationId).success) {
    notFound();
  }
  const allWorkflowAccess = can(user, permissionCodes.workflowInstanceAllRead);
  const taskId = z.uuid().safeParse(query?.taskId);
  const assignedWorkflowAccess =
    taskId.success &&
    can(user, permissionCodes.workflowTaskAssignedRead) &&
    can(user, permissionCodes.workflowInstanceAssignedRead);
  return (
    <StaffApplicationDetailWorkspace
      applicationId={applicationId}
      canReadWorkflow={allWorkflowAccess || assignedWorkflowAccess}
      initialTab={
        query?.tab === "workflow-progress" ? "workflow-progress" : "overview"
      }
      taskId={
        allWorkflowAccess ? undefined : taskId.success ? taskId.data : undefined
      }
    />
  );
}
