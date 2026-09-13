import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { BusinessesTable } from "@/components/applicant/businesses/BusinessesTable";
import { ProfilePageHeader } from "@/components/applicant/profile/ProfilePageHeader";

export const metadata: Metadata = { title: "My businesses" };

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.businessReadOwn)) {
    redirect("/unauthorized");
  }

  return (
    <section>
      <ProfilePageHeader
        eyebrow="Enterprise details"
        title="My businesses"
        description="Add and manage the businesses connected to your account."
      />
      <BusinessesTable
        canUpdate={can(user, capabilities.businessUpdateOwn)}
      />
    </section>
  );
}
