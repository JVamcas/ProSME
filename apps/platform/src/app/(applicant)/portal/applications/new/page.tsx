import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { NewApplicationChooser } from "@/components/applicant/applications/NewApplicationChooser";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingApplicationCreate)) redirect("/unauthorized");
  return (
    <section>
      <PageHeader
        description="Select a funding opportunity to start or resume its application draft."
        eyebrow="Start an application"
        title="New application"
      />
      <NewApplicationChooser />
    </section>
  );
}
