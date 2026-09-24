import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { EligibilityRuleSetTestScreen } from "@/modules/eligibility/ui/EligibilityRuleSetTestScreen";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Test eligibility ruleset" };

export default async function EligibilityRuleSetTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versionId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.eligibilityRuleSetRead)) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  const { versionId } = await searchParams;
  return (
    <PageShell
      description="Evaluate sample values without creating an authoritative outcome."
      eyebrow="Eligibility rulesets"
      icon={<FlaskConical />}
      title="Test eligibility ruleset"
    >
      <EligibilityRuleSetTestScreen id={id} versionId={versionId} />
    </PageShell>
  );
}
