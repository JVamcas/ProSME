import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkQueueWorkspace } from "@/modules/work-queue/ui/WorkQueueWorkspace";

export const metadata: Metadata = { title: "My Work Queue" };

export default async function WorkQueuePage() {
  const user = await getCurrentUser();
  if (!can(user, permissionCodes.workflowTaskAssignedRead)) redirect("/unauthorized");
  return <WorkQueueWorkspace />;
}
