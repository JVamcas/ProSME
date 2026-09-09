import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationReview } from "@/components/admin/application-review";
import { getAdminApplication } from "@/data/admin-applications";

export const metadata: Metadata = { title: "Application review" };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = getAdminApplication(decodeURIComponent(id));
  if (!application) notFound();
  return <ApplicationReview application={application}/>;
}
