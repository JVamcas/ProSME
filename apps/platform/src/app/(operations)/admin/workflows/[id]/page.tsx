import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkflowEditorWorkspace } from "@/components/admin/workflows/WorkflowEditorWorkspace";

export const metadata: Metadata = { title: "Workflow editor" };
type PageProps = { params: Promise<{ id: string }> };

export default async function WorkflowEditorPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.workflowDefinitionRead))
    redirect("/unauthorized");
  const { id } = await params;
  return (
    <WorkflowEditorWorkspace
      definitionId={id}
      canUpdate={can(user, capabilities.workflowDefinitionUpdate)}
      canPublish={can(user, capabilities.workflowDefinitionPublish)}
      canRetire={can(user, capabilities.workflowDefinitionRetire)}
    />
  );
}
