import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkflowDefinitionsWorkspace } from "@/components/admin/workflows/WorkflowDefinitionsWorkspace";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Workflow configuration" };

export default async function WorkflowsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.workflowDefinitionRead))
    redirect("/unauthorized");
  return (
    <section>
      <PageHeader
        description="Manage reusable workflow versions and configuration."
        eyebrow="Administration"
        title="Workflow Definitions"
      />
      <WorkflowDefinitionsWorkspace
        canCreate={can(user, capabilities.workflowDefinitionCreate)}
        canPublish={can(user, capabilities.workflowDefinitionPublish)}
        canRetire={can(user, capabilities.workflowDefinitionRetire)}
        canUpdate={can(user, capabilities.workflowDefinitionUpdate)}
      />
    </section>
  );
}
