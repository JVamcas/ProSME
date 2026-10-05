import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { WorkflowTaskWorkspace } from "@/modules/work-queue/ui/WorkflowTaskWorkspace";

export const metadata: Metadata = { title: "Workflow task" };

export default async function WorkflowTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getAuthenticatedPageUser();
  if (
    !can(user, permissionCodes.workflowTaskAssignedRead) &&
    !can(user, permissionCodes.workflowTaskAllRead)
  ) {
    redirect("/unauthorized");
  }
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestId = z.uuid().safeParse(query?.requestId);
  return (
    <WorkflowTaskWorkspace
      canReadAllTasks={can(user, permissionCodes.workflowTaskAllRead)}
      canReadAssignedTasks={can(user, permissionCodes.workflowTaskAssignedRead)}
      canFollowUpRfi={can(
        user,
        permissionCodes.fundingApplicationInformationRequestCreate,
      )}
      canCloseRfi={can(
        user,
        permissionCodes.fundingApplicationInformationRequestAssignedClose,
      )}
      initialRequestId={requestId.success ? requestId.data : undefined}
      canReadWorkflowProgress={
        can(user, permissionCodes.workflowInstanceAssignedRead) ||
        can(user, permissionCodes.workflowInstanceAllRead)
      }
      taskId={id}
    />
  );
}
