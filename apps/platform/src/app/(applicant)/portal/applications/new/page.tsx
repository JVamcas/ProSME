import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { NewApplicationChooser } from "@/modules/applications/ui/NewApplicationChooser";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ fundingOpportunityId?: string }>;
}) {
  const { fundingOpportunityId } = await searchParams;
  const user = await getAuthenticatedPageUser();
  if (!can(user, permissionCodes.fundingApplicationCreate)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description={fundingOpportunityId
        ? "Select the business you represent to start or resume your application."
        : "Select a funding opportunity to start or resume its application draft."}
      eyebrow="Start an application"
      title="New application"
    >
      <NewApplicationChooser fundingOpportunityId={fundingOpportunityId} />
    </PageShell>
  );
}
