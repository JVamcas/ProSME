import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { BusinessForm } from "@/components/applicant/businesses/BusinessForm";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Edit business" };

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, route] = await Promise.all([getCurrentUser(), params]);
  if (!user || !can(user, permissionCodes.businessOwnUpdate)) {
    redirect("/unauthorized");
  }

  return (
    <PageShell
      eyebrow="My businesses"
      title="Edit business"
      description="Update this enterprise's information."
    >
      <BusinessForm businessId={route.id} />
    </PageShell>
  );
}
