import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { WorkflowEditorWorkspace } from "@/components/admin/workflows/WorkflowEditorWorkspace";

export const metadata: Metadata = { title: "Workflow editor" };
type PageProps = { params: Promise<{ id: string }> };

export default async function WorkflowEditorPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.workflowDefinitionRead))
    redirect("/unauthorized");
  const { id } = await params;
  return (
    <WorkflowEditorWorkspace
      definitionId={id}
      canUpdate={can(user, permissionCodes.workflowDefinitionUpdate)}
      canPublish={can(user, permissionCodes.workflowDefinitionPublish)}
      canRetire={can(user, permissionCodes.workflowDefinitionRetire)}
    />
  );
}
