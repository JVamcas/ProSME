import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { EligibilitySettingsTabs } from "@/modules/eligibility/ui/EligibilitySettingsTabs";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Eligibility rulesets" };

export default async function EligibilityRuleSetsPage() {
  const user = await getCurrentUser();
  const canReadRuleSets = Boolean(
    user && can(user, permissionCodes.eligibilityRuleSetRead),
  );
  const canReadQuestions = Boolean(
    user && can(user, permissionCodes.eligibilityQuestionRead),
  );
  if (!user || (!canReadRuleSets && !canReadQuestions)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Manage reusable eligibility questions and funding-call rulesets."
      eyebrow="Administration"
      icon={<Scale />}
      title="Eligibility configuration"
    >
      <EligibilitySettingsTabs
        canCreateQuestion={can(user, permissionCodes.eligibilityQuestionCreate)}
        canCreateRuleSet={can(user, permissionCodes.eligibilityRuleSetCreate)}
        canPublishRuleSet={can(user, permissionCodes.eligibilityRuleSetPublish)}
        canReadQuestions={canReadQuestions}
        canReadRuleSets={canReadRuleSets}
        canUpdateQuestion={can(user, permissionCodes.eligibilityQuestionUpdate)}
        canUpdateRuleSet={can(user, permissionCodes.eligibilityRuleSetUpdate)}
      />
    </PageShell>
  );
}
