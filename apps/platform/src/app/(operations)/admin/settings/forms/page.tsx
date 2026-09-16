import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { FormsWorkspace } from "@/components/admin/forms/FormsWorkspace";
import { ProfilePageHeader } from "@/components/applicant/profile/ProfilePageHeader";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.formRead)) {
    redirect("/unauthorized");
  }
  return (
    <section>
      <ProfilePageHeader
        description="Create reusable, versioned forms for operational tasks."
        eyebrow="Settings"
        title="Forms"
      />
      <FormsWorkspace
        canCreate={can(user, capabilities.formCreate)}
        canUpdate={can(user, capabilities.formUpdate)}
      />
    </section>
  );
}
