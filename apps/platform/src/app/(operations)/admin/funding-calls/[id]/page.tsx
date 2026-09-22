import { CircleDollarSign } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { PageHeader } from "@/components/ui/PageHeader";
import { FundingCallEditor } from "@/modules/funding-calls/ui/FundingCallEditor";

export const metadata: Metadata = { title: "Edit funding call" };

export default async function FundingCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingCallRead)) {
    redirect("/unauthorized");
  }
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) {
    redirect("/admin/funding-calls");
  }

  return (
    <section>
      <PageHeader
        description="Manage funding call"
        eyebrow="Funding calls"
        icon={<CircleDollarSign />}
        title="Edit funding call"
      />
      <FundingCallEditor
        canApprove={can(user, permissionCodes.fundingCallApproveAll)}
        canPublish={can(user, permissionCodes.fundingCallPublish)}
        canReturn={can(user, permissionCodes.fundingCallReturnAll)}
        canSubmit={can(user, permissionCodes.fundingCallSubmitAll)}
        canUpdate={can(user, permissionCodes.fundingCallUpdate)}
        canWithdrawOwnRequest={can(
          user,
          permissionCodes.fundingCallApprovalRequestOwnWithdraw,
        )}
        id={id.data}
      />
    </section>
  );
}
