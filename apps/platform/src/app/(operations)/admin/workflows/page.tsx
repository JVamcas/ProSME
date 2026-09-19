import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowTemplateAdminWorkspace } from "@/modules/workflows/ui/definitions/WorkflowTemplateAdminWorkspace";

export const metadata: Metadata = { title: "Workflow templates" };

export default async function WorkflowsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.workflowDefinitionRead))
    redirect("/unauthorized");
  return (
    <section>
      <PageHeader
        description="Manage workflow templates."
        eyebrow="Administration"
        title="Workflow Templates"
      />
      <WorkflowTemplateAdminWorkspace
        canCreate={can(user, permissionCodes.workflowDefinitionCreate)}
        canUpdate={can(user, permissionCodes.workflowDefinitionUpdate)}
      />
    </section>
  );
}
