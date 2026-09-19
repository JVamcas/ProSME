import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { FormsWorkspace } from "@/components/admin/forms/FormsWorkspace";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.formRead)) {
    redirect("/unauthorized");
  }
  return (
    <section>
      <PageHeader
        description="Create reusable, versioned forms for operational tasks."
        eyebrow="Settings"
        title="Forms"
        icon={<Users />}
      />
      <FormsWorkspace
        canCreate={can(user, capabilities.formCreate)}
        canUpdate={can(user, capabilities.formUpdate)}
      />
    </section>
  );
}
