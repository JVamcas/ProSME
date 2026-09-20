import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { PageHeader } from "@/components/ui/PageHeader";
import { EligibilityRuleSetTestScreen } from "@/modules/eligibility/ui/EligibilityRuleSetTestScreen";

export const metadata: Metadata = { title: "Test eligibility ruleset" };

export default async function EligibilityRuleSetTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.eligibilityRuleSetRead)) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  return (
    <section>
      <PageHeader
        description="Evaluate sample values without creating an authoritative outcome."
        eyebrow="Eligibility rulesets"
        icon={<FlaskConical />}
        title="Test eligibility ruleset"
      />
      <EligibilityRuleSetTestScreen id={id} />
    </section>
  );
}
