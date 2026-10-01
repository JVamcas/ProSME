"use client";

import { usePublishedFormRuntime } from "@/modules/forms/FormHooks";
import type { WorkflowEligibilityFormPreview } from "../../api/WorkflowEligibilityFormPreview";
import { useWorkflowEligibilityForms } from "./useWorkflowEligibilityForms";
import { WorkflowTaskFormPreview } from "./WorkflowTaskFormPreview";
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";

export { workflowTaskInheritsEligibilityForm } from "../../domain/definitions/WorkflowEligibilityForm";

function FundingCallEligibilityPreview({ preview }: {
  preview: WorkflowEligibilityFormPreview;
}) {
  const form = usePublishedFormRuntime(preview.formVersionId);
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold">
        {preview.fundingCallTitle}
        {preview.formName ? ` — ${preview.formName}` : ""}
      </p>
      {preview.formVersionId ? (
        <WorkflowTaskFormPreview form={form} />
      ) : (
        <p className="text-sm text-slate-600">
          This funding call has no published eligibility verification form.
          Attach a published eligibility ruleset with a verification form.
        </p>
      )}
    </section>
  );
}

export function WorkflowTaskEligibilityPreview({ definitionId, versionId }: {
  definitionId: string;
  versionId: string;
}) {
  const previews = useWorkflowEligibilityForms(definitionId, versionId);
  if (previews.isPending) {
    return <PortalLoadingState title="" description="Just a moment..." />;
  }
  if (previews.isError) {
    return (
      <PortalErrorState
        title={previews.error?.message}
        description={previews.error?.message}
      />
    );
  }
  if (!previews.data?.length) {
    return (
      <p className="text-sm text-slate-600">
        This workflow version is not attached to a funding call. Its eligibility
        verification form comes from the eligibility ruleset attached to each funding call.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {previews.data.map((preview) => (
        <FundingCallEligibilityPreview key={preview.fundingCallId} preview={preview} />
      ))}
    </div>
  );
}
