import { CircleDollarSign } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { FundingCallList } from "@/modules/funding-calls/ui/FundingCallList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Funding calls" };

export default async function FundingCallsPage({
  searchParams,
}: {
  searchParams: Promise<{ fundingCallId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingCallRead)) {
    redirect("/unauthorized");
  }
  const requestedFundingCallId = (await searchParams).fundingCallId;
  const fundingCallId = z.uuid().safeParse(requestedFundingCallId);

  return (
    <PageShell
      description="Create and maintain SME Fund business funding calls."
      eyebrow="Programmes"
      icon={<CircleDollarSign />}
      title="Funding calls"
    >
      <FundingCallList
        canCreate={can(user, permissionCodes.fundingCallCreate)}
        canDelete={can(user, permissionCodes.fundingCallDelete)}
        fundingCallId={fundingCallId.success ? fundingCallId.data : undefined}
      />
    </PageShell>
  );
}
