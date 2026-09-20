import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { EligibilityRuleSetEditor } from "@/modules/eligibility/ui/EligibilityRuleSetEditor";

export const metadata: Metadata = { title: "Eligibility ruleset builder" };

export default async function EligibilityRuleSetBuilderPage({
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
    <EligibilityRuleSetEditor
      canPublish={can(user, permissionCodes.eligibilityRuleSetPublish)}
      canRetire={can(user, permissionCodes.eligibilityRuleSetRetire)}
      canUpdate={can(user, permissionCodes.eligibilityRuleSetUpdate)}
      id={id}
    />
  );
}
