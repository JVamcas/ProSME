import { CircleDollarSign } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { PageHeader } from "@/components/ui/PageHeader";
import { FundingCallCreator } from "@/modules/funding-calls/ui/FundingCallCreator";

export const metadata: Metadata = { title: "Create funding call" };

export default async function NewFundingCallPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingCallCreate)) {
    redirect("/unauthorized");
  }

  return (
    <section>
      <PageHeader
        description="Enter the business details and application window for the new funding call."
        eyebrow="Programmes"
        icon={<CircleDollarSign />}
        title="Create funding call"
      />
      <FundingCallCreator />
    </section>
  );
}
