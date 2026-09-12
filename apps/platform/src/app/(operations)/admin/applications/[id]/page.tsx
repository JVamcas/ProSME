import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
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
  const application = await getApplication(user, decodeURIComponent(id));

  if (!application) {
    notFound();
  }

  return <ApplicationReview application={application} />;
}
