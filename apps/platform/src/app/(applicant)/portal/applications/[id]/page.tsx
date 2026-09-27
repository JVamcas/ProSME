import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getOwnApplicationReadView } from "@/modules/applications/ServerApplicationReadViewService";
import { ApplicantApplicationDetail } from "@/modules/applications/ui/ApplicantApplicationDetail";
import { listOwnedApplicationRfis } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

export const metadata: Metadata = { title: "Application details" };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingApplicationOwnRead)) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [data, requests] = await Promise.all([
    getOwnApplicationReadView(
      user,
      id,
      crypto.randomUUID(),
    ),
    listOwnedApplicationRfis(user, id),
  ]).catch((error: unknown) => {
      if (error instanceof ResourceNotFoundError) notFound();
      throw error;
    });
  return (
    <ApplicantApplicationDetail
      canDeleteDraft={can(user, permissionCodes.fundingApplicationDraftOwnDelete)}
      canWithdraw={can(user, permissionCodes.fundingApplicationOwnWithdraw)}
      data={data}
      requests={requests}
    />
  );
}
