import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkflowTaskWorkspace } from "@/modules/work-queue/ui/WorkflowTaskWorkspace";

export const metadata: Metadata = { title: "Workflow task" };

export default async function WorkflowTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, permissionCodes.workflowTaskAssignedRead)) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  return <WorkflowTaskWorkspace taskId={id} />;
}
