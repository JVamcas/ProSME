import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ApplicationsList } from "@/components/applicant/applications/ApplicationsList";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingApplicationOwnRead)) redirect("/unauthorized");
  return (
    <section>
      <PageHeader
        description="Create, save, and resume your funding application drafts."
        eyebrow="Funding applications"
        title="My applications"
      />
      <ApplicationsList canCreate={can(user, permissionCodes.fundingApplicationCreate)} />
    </section>
  );
}
