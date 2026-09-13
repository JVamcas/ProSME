import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { BusinessForm } from "@/components/businesses/business-form";
import { ProfilePageHeader } from "@/components/profile/profile-page-header";

export const metadata: Metadata = { title: "Edit business" };

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, route] = await Promise.all([getCurrentUser(), params]);
  if (!user || !can(user, capabilities.businessUpdateOwn)) {
    redirect("/unauthorized");
  }

  return (
    <section>
      <ProfilePageHeader
        eyebrow="My businesses"
        title="Edit business"
        description="Update this enterprise's information."
      />
      <BusinessForm businessId={route.id} />
    </section>
  );
}
