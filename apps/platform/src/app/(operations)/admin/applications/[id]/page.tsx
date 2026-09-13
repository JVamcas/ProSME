import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ApplicationReview } from "@/components/admin/application-review";
import { getApplication } from "@/modules/applications/application.service";

export const metadata: Metadata = { title: "Application review" };

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
    can(user, capabilities.applicationReadAssigned) ||
    can(user, capabilities.applicationReadAll);

  if (!canRead) {
    redirect("/unauthorized");
  }

  const application = await getApplication(user, decodeURIComponent(id));

  if (!application) {
    notFound();
  }

  return <ApplicationReview application={application} />;
}
