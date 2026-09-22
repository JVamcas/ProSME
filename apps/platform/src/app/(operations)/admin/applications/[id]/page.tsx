import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ApplicationReview } from "@/components/admin/applications/ApplicationReview";
import { getAdminApplicationOverview } from "@/modules/applications/ServerAdminApplicationService";

export const metadata: Metadata = { title: "Application overview" };

type ApplicationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ApplicationPage({
  params,
}: ApplicationPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const canRead =
    can(user, permissionCodes.workflowTaskAssignedRead) ||
    can(user, permissionCodes.fundingApplicationAllRead);

  if (!canRead) {
    redirect("/unauthorized");
  }

  const applicationId = decodeURIComponent(id);
  if (!z.uuid().safeParse(applicationId).success) {
    notFound();
  }
  const application = await getAdminApplicationOverview(user, applicationId);

  if (!application) {
    notFound();
  }

  return <ApplicationReview application={application} />;
}
