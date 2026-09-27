import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
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
};

export default async function ApplicationPage({
  params,
}: ApplicationPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
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

  const [progress, requests] = await Promise.all([
    can(user, permissionCodes.workflowInstanceAllRead)
      ? getWorkflowProgress(user, applicationId)
      : undefined,
    listContextualApplicationRfis(user, applicationId),
  ]);

  return (
    <ApplicationDetailView
      model={detail.model}
      requests={<StaffApplicationRfiTimeline requests={requests} />}
      workflowProgress={progress === undefined
        ? undefined
        : <WorkflowProgressPanel progress={progress} />}
    />
  );
}
