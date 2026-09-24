import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { BusinessesTable } from "@/components/applicant/businesses/BusinessesTable";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "My businesses" };

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.businessOwnRead)) {
    redirect("/unauthorized");
  }

  return (
    <PageShell
      title="My businesses"
      description="Add and manage the businesses connected to your account."
    >
      <BusinessesTable
        canUpdate={can(user, permissionCodes.businessOwnUpdate)}
      />
    </PageShell>
  );
}
