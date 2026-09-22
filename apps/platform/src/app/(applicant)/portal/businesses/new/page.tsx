import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { BusinessForm } from "@/components/applicant/businesses/BusinessForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Add business" };

export default async function NewBusinessPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.businessOwnUpdate)) {
    redirect("/unauthorized");
  }

  return (
    <section>
      <PageHeader
        eyebrow="My businesses"
        title="Add business"
        description="Enter the enterprise details used in funding applications."
      />
      <BusinessForm />
    </section>
  );
}
