import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { EligibilityRuleSetList } from "@/modules/eligibility/ui/EligibilityRuleSetList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Eligibility rulesets" };

export default async function EligibilityRuleSetsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.eligibilityRuleSetRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Manage eligibility rulesets for funding calls."
      eyebrow="Administration"
      icon={<Scale />}
      title="Eligibility rulesets"
    >
      <EligibilityRuleSetList
        canCreate={can(user, permissionCodes.eligibilityRuleSetCreate)}
        canPublish={can(user, permissionCodes.eligibilityRuleSetPublish)}
        canUpdate={can(user, permissionCodes.eligibilityRuleSetUpdate)}
      />
    </PageShell>
  );
}
