import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { ApplicantApplicationDetailWorkspace } from "@/modules/applications/ui/ApplicantApplicationDetailWorkspace";

export const metadata: Metadata = { title: "Application details" };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.fundingApplicationOwnRead)) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const canReadInformationRequests = can(
    user,
    permissionCodes.fundingApplicationInformationRequestOwnRead,
  );

  return (
    <ApplicantApplicationDetailWorkspace
      canDeleteDraft={can(
        user,
        permissionCodes.fundingApplicationDraftOwnDelete,
      )}
      canWithdraw={can(user, permissionCodes.fundingApplicationOwnWithdraw)}
      applicationId={id}
      canReadInformationRequests={canReadInformationRequests}
    />
  );
}
