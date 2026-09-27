import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkflowCoiReviewWorkspace } from "@/modules/workflows/ui/runtime/WorkflowCoiReviewWorkspace";

export const metadata: Metadata = { title: "Conflict reviews" };

export default async function ConflictReviewsPage() {
  const user = await getCurrentUser();
  if (!can(user, permissionCodes.workflowCoiAllReview)) {
    redirect("/unauthorized");
  }
  return <WorkflowCoiReviewWorkspace />;
}
