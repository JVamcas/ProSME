"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { FundingCallView } from "../api/FundingCallTransport";
import {
  useBindableApplicationFormVersions,
  useBindableEligibilityRuleSetVersions,
  useBindableWorkflowTemplateVersions,
} from "../FundingCallHooks";
import {
  ApplicationStep,
  BasicsStep,
  EligibilityStep,
  FundingStep,
  type FundingCallStepId,
  PublicContentStep,
  ScheduleStep,
  WorkflowStep,
} from "./FundingCallFormSteps";
import { FundingCallReviewStep } from "./FundingCallReviewStep";
import type { LocalFormInput } from "./FundingCallFormSchema";

export function FundingCallFormSection({
  call,
  currentStep,
  disabled,
}: {
  call?: FundingCallView;
  currentStep: FundingCallStepId;
  disabled: boolean;
}) {
  const form = useFormContext<LocalFormInput>();
  const eligibilityVersions = useBindableEligibilityRuleSetVersions();
  const formVersions = useBindableApplicationFormVersions();
  const workflowVersions = useBindableWorkflowTemplateVersions();
  const opensAt = useWatch({ control: form.control, name: "opensAt" });
  const eligibilityVersionId = useWatch({
    control: form.control,
    name: "eligibilityRuleSetVersionId",
  });
  const formVersionId = useWatch({
    control: form.control,
    name: "formVersionId",
  });
  const workflowVersionId = useWatch({
    control: form.control,
    name: "workflowTemplateVersionId",
  });
  const selectedEligibility = eligibilityVersions.data?.find(
    (version) => version.versionId === eligibilityVersionId,
  );
  const selectedForm = formVersions.data?.find(
    (version) => version.versionId === formVersionId,
  );
  const selectedWorkflow = workflowVersions.data?.find(
    (version) => version.versionId === workflowVersionId,
  );

  if (currentStep === "basics") return <BasicsStep disabled={disabled} />;
  if (currentStep === "funding") return <FundingStep />;
  if (currentStep === "schedule") return <ScheduleStep opensAt={opensAt} />;
  if (currentStep === "application") {
    return (
      <ApplicationStep
        disabled={disabled}
        loading={formVersions.isPending}
        options={(formVersions.data ?? []).map((version) => ({
          label: `${version.formName} — version ${version.versionNumber} · ${version.status ?? "PUBLISHED"}`,
          value: version.versionId,
        }))}
      />
    );
  }
  if (currentStep === "eligibility") {
    return (
      <EligibilityStep
        configureHref={
          call &&
          selectedEligibility &&
          call.eligibilityRuleSetVersionId === selectedEligibility.versionId
            ? `/admin/settings/eligibility-rulesets/${selectedEligibility.ruleSetId}`
            : undefined
        }
        disabled={disabled}
        loading={eligibilityVersions.isPending}
        options={(eligibilityVersions.data ?? []).map((version) => ({
          label: `${version.ruleSetName} — version ${version.versionNumber} · ${version.status}`,
          value: version.versionId,
        }))}
      />
    );
  }
  if (currentStep === "workflow") {
    return (
      <WorkflowStep
        disabled={disabled}
        loading={workflowVersions.isPending}
        options={(workflowVersions.data ?? []).map((version) => ({
          label: `${version.name} — version ${version.versionNumber} · ${version.status}`,
          value: version.versionId,
        }))}
      />
    );
  }
  if (currentStep === "publicContent") {
    return <PublicContentStep call={call} disabled={disabled} />;
  }
  return (
    <FundingCallReviewStep
      eligibility={{
        id: selectedEligibility?.versionId ?? null,
        label: selectedEligibility
          ? `${selectedEligibility.ruleSetName} — version ${selectedEligibility.versionNumber} · ${selectedEligibility.status}`
          : "Not selected",
      }}
      formVersion={{
        id: selectedForm?.versionId ?? null,
        label: selectedForm
          ? `${selectedForm.formName} — version ${selectedForm.versionNumber} · ${selectedForm.status ?? "PUBLISHED"}`
          : "Not selected",
      }}
      workflow={{
        id: selectedWorkflow?.versionId ?? null,
        label: selectedWorkflow
          ? `${selectedWorkflow.name} — version ${selectedWorkflow.versionNumber} · ${selectedWorkflow.status}`
          : "Not selected",
      }}
    />
  );
}
