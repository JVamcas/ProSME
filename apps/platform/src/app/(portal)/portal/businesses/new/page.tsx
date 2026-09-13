import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { BusinessForm } from "@/components/businesses/business-form";
import { ProfilePageHeader } from "@/components/profile/profile-page-header";

export const metadata: Metadata = { title: "Add business" };

export default async function NewBusinessPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.businessUpdateOwn)) {
    redirect("/unauthorized");
  }

  return (
    <section>
      <ProfilePageHeader
        eyebrow="My businesses"
        title="Add business"
        description="Enter the enterprise details used in funding applications."
      />
      <BusinessForm />
    </section>
  );
}
