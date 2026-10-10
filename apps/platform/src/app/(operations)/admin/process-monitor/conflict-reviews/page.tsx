import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { WorkflowCoiReviewWorkspace } from "@/modules/workflows/ui/runtime/WorkflowCoiReviewWorkspace";

export const metadata: Metadata = { title: "Conflict reviews | Process Monitor" };

export default async function ConflictReviewsMonitorPage() {
  const user = await getAuthenticatedPageUser();
  if (!can(user, permissionCodes.workflowCoiAllReview)) {
    redirect("/unauthorized");
  }
  return <WorkflowCoiReviewWorkspace eyebrow="Process Monitor" />;
}
