import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { NewApplicationChooser } from "@/components/applicant/applications/NewApplicationChooser";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingApplicationCreate)) redirect("/unauthorized");
  return (
    <PageShell
      description="Select a funding opportunity to start or resume its application draft."
      eyebrow="Start an application"
      title="New application"
    >
      <NewApplicationChooser />
    </PageShell>
  );
}
