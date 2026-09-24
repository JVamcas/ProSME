import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { WorkflowTemplateAdminWorkspace } from "@/modules/workflows/ui/definitions/WorkflowTemplateAdminWorkspace";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Workflow templates" };

export default async function WorkflowsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.workflowDefinitionRead))
    redirect("/unauthorized");
  return (
    <PageShell
      description="Manage workflow templates."
      eyebrow="Administration"
      title="Workflow Templates"
    >
      <WorkflowTemplateAdminWorkspace
        canCreate={can(user, permissionCodes.workflowDefinitionCreate)}
        canPublish={can(user, permissionCodes.workflowDefinitionPublish)}
        canUpdate={can(user, permissionCodes.workflowDefinitionUpdate)}
      />
    </PageShell>
  );
}
