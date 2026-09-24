import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { getEligibilityRuleSetBuilder } from "@/modules/eligibility/application/ServerEligibilityBuilderService";
import { EligibilityRuleSetEditor } from "@/modules/eligibility/ui/EligibilityRuleSetEditor";
import { EligibilityRuleSetHeaderActions } from "@/modules/eligibility/ui/EligibilityRuleSetHeaderActions";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Eligibility ruleset builder" };

export default async function EligibilityRuleSetBuilderPage({
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
  const editor = await getEligibilityRuleSetBuilder(user, id, versionId);
  return (
    <PageShell
      actions={(
        <EligibilityRuleSetHeaderActions
          canPublish={can(user, permissionCodes.eligibilityRuleSetPublish)}
          canRetire={can(user, permissionCodes.eligibilityRuleSetRetire)}
          canUpdate={can(user, permissionCodes.eligibilityRuleSetUpdate)}
          id={id}
          initialName={editor.definition.name}
          initialStatus={editor.version.status}
          initialVersionNumber={editor.version.versionNumber}
          versionId={versionId}
        />
      )}
      description={editor.definition.description}
      eyebrow={`Eligibility Ruleset`}
      title={`editor.definition.name - v${editor.version.versionNumber}`}
    >
      <EligibilityRuleSetEditor
        canUpdate={can(user, permissionCodes.eligibilityRuleSetUpdate)}
        id={id}
        versionId={versionId}
      />
    </PageShell>
  );
}
