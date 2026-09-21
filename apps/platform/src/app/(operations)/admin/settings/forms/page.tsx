import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { FormsWorkspace } from "@/components/admin/forms/FormsWorkspace";
import { PageHeader } from "@/components/ui/PageHeader";
import { Form } from "lucide-react";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.workflowFormRead)) {
    redirect("/unauthorized");
  }
  return (
    <section>
      <PageHeader
        description="Create reusable, versioned forms for applications and workflow tasks."
        eyebrow="Settings"
        title="Forms"
        icon={<Form />}
      />
      <FormsWorkspace
        canCreate={can(user, permissionCodes.workflowFormCreate)}
        canPublish={can(user, permissionCodes.workflowFormPublish)}
        canRetire={can(user, permissionCodes.workflowFormRetire)}
        canUpdate={can(user, permissionCodes.workflowFormUpdate)}
      />
    </section>
  );
}
