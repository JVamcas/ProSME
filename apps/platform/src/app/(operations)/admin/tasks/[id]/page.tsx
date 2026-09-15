import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkflowTaskWorkspace } from "@/components/admin/work-queue/WorkflowTaskWorkspace";

export const metadata: Metadata = { title: "Workflow task" };

export default async function WorkflowTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, capabilities.workflowTaskRead)) redirect("/unauthorized");
  const { id } = await params;
  return <WorkflowTaskWorkspace taskId={id} />;
}
