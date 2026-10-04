import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { WorkflowCoiReviewWorkspace } from "@/modules/workflows/ui/runtime/WorkflowCoiReviewWorkspace";

export const metadata: Metadata = { title: "Conflict reviews" };

export default async function ConflictReviewsPage() {
  const user = await getAuthenticatedPageUser();
  if (!can(user, permissionCodes.workflowCoiAllReview)) {
    redirect("/unauthorized");
  }
  return <WorkflowCoiReviewWorkspace />;
}
