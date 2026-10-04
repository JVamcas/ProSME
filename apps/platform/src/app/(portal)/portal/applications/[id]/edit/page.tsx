import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { ApplicationFormEditor } from "@/modules/applications/ui/ApplicationFormEditor";

export const metadata: Metadata = { title: "Edit application draft" };

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.fundingApplicationOwnRead))
    redirect("/unauthorized");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <ApplicationFormEditor applicationId={id} />;
}
