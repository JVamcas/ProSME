import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getAdminApplicationDetail } from "@/modules/applications/ServerAdminApplicationDetailService";
import { ApplicationDetailView } from "@/modules/applications/ui/ApplicationDetailView";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";
import { listContextualApplicationRfis } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";
import { StaffApplicationRfiTimeline } from "@/modules/workflows/ui/rfi/WorkflowRfiPresentation";

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
  const detail = await getAdminApplicationDetail(
    user,
    applicationId,
    crypto.randomUUID(),
  ).catch((error: unknown) => {
    if (error instanceof ResourceNotFoundError) notFound();
    throw error;
  });

  const allWorkflowAccess = can(user, permissionCodes.workflowInstanceAllRead);
  const taskId = z.uuid().safeParse(query?.taskId);
  const assignedWorkflowAccess =
    taskId.success &&
    can(user, permissionCodes.workflowTaskAssignedRead) &&
    can(user, permissionCodes.workflowInstanceAssignedRead);
  const progressRead = allWorkflowAccess
    ? getWorkflowProgress(user, applicationId)
    : assignedWorkflowAccess
      ? getWorkflowProgress(user, applicationId, { taskId: taskId.data })
      : undefined;
  const [progress, requests] = await Promise.all([
    progressRead,
    listContextualApplicationRfis(user, applicationId),
  ]);

  return (
    <ApplicationDetailView
      model={detail.model}
      initialTab={
        query?.tab === "workflow-progress" ? "workflow-progress" : "overview"
      }
      requests={<StaffApplicationRfiTimeline requests={requests} />}
      workflowProgress={
        progress === undefined ? undefined : (
          <WorkflowProgressPanel progress={progress} />
        )
      }
    />
  );
}
