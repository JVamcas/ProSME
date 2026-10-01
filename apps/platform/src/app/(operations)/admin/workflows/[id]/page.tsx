import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { WorkflowEditorWorkspace } from "@/modules/workflows/ui/definitions/WorkflowEditorWorkspace";

export const metadata: Metadata = { title: "Workflow editor" };
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versionId?: string }>;
};

export default async function WorkflowEditorPage({
  params,
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.workflowDefinitionRead)) {
    redirect("/unauthorized");
  }
  const [{ id }, { versionId }] = await Promise.all([params, searchParams]);
  return (
    <WorkflowEditorWorkspace
      definitionId={id}
      versionId={versionId}
      canUpdate={can(user, permissionCodes.workflowDefinitionUpdate)}
      canPublish={can(user, permissionCodes.workflowDefinitionPublish)}
      canRetire={can(user, permissionCodes.workflowDefinitionRetire)}
    />
  );
}
