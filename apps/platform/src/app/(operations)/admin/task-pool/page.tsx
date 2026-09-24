import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { SelfAssignmentPoolWorkspace } from "@/modules/work-queue/ui/SelfAssignmentPoolWorkspace";

export const metadata: Metadata = { title: "Available Tasks" };

export default async function TaskPoolPage() {
  const user = await getCurrentUser();
  if (!can(user, permissionCodes.workflowTaskPoolRead)) {
    redirect("/unauthorized");
  }
  return <SelfAssignmentPoolWorkspace />;
}
