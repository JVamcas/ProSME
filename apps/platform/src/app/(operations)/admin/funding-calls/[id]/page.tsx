import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { FundingCallEditor } from "@/modules/funding-calls/ui/FundingCallEditor";

export const metadata: Metadata = { title: "Edit funding call" };

export default async function FundingCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.fundingCallRead)) {
    redirect("/unauthorized");
  }
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) {
    redirect("/admin/funding-calls");
  }

  return (
    <FundingCallEditor
      canApprove={can(user, permissionCodes.fundingCallApproveAll)}
      canArchive={can(user, permissionCodes.fundingCallArchive)}
      canPublish={can(user, permissionCodes.fundingCallPublish)}
      canReturn={can(user, permissionCodes.fundingCallApproveAll)}
      canResume={can(user, permissionCodes.fundingCallResume)}
      canSubmit={
        can(user, permissionCodes.fundingCallCreate)
        || can(user, permissionCodes.fundingCallEditDraft)
      }
      canSuspend={can(user, permissionCodes.fundingCallSuspend)}
      canUpdate={can(user, permissionCodes.fundingCallEditDraft)}
      canWithdraw={can(user, permissionCodes.fundingCallWithdraw)}
      canWithdrawOwnRequest={can(
        user,
        permissionCodes.fundingCallApprovalRequestOwnWithdraw,
      )}
      id={id.data}
    />
  );
}
