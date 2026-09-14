import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ApplicationEditor } from "@/components/applicant/applications/ApplicationEditor";

export const metadata: Metadata = { title: "Edit application draft" };

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.applicationReadOwn)) redirect("/unauthorized");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <ApplicationEditor applicationId={id} />;
}
