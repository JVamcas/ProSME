import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { WorkQueueWorkspace } from "@/components/admin/work-queue/WorkQueueWorkspace";

export const metadata: Metadata = { title: "My Work Queue" };

export default async function WorkQueuePage() {
  const user = await getCurrentUser();
  if (!can(user, permissionCodes.workflowTaskPoolRead)) redirect("/unauthorized");
  return <WorkQueueWorkspace />;
}
