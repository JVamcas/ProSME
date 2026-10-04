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

function attachedVersionOptions(
  options: { label: string; value: string }[],
  selectedId: string | null | undefined,
  locked: boolean,
) {
  if (!locked || !selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }
  return [{ label: "Current attached version (locked)", value: selectedId }, ...options];
}

function attachedVersionLabel(id: string | null | undefined, locked: boolean) {
  return id && locked ? "Current attached version (locked)" : "Not selected";
}

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
  const attachmentsLocked = Boolean(call?.attachmentsLockedAt);
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
        attachmentsLocked={attachmentsLocked}
        disabled={disabled}
        loading={formVersions.isPending}
        options={attachedVersionOptions(
          (formVersions.data ?? []).map((version) => ({
            label: `${version.formName} — version ${version.versionNumber} · ${version.status ?? "PUBLISHED"}`,
            value: version.versionId,
          })),
          formVersionId,
          attachmentsLocked,
        )}
      />
    );
  }
  if (currentStep === "eligibility") {
    return (
      <EligibilityStep
        attachmentsLocked={attachmentsLocked}
        configureHref={
          call &&
          selectedEligibility &&
          call.eligibilityRuleSetVersionId === selectedEligibility.versionId
            ? `/admin/settings/eligibility-rulesets/${selectedEligibility.ruleSetId}`
            : undefined
        }
        disabled={disabled}
        loading={eligibilityVersions.isPending}
        options={attachedVersionOptions(
          (eligibilityVersions.data ?? []).map((version) => ({
            label: `${version.ruleSetName} — version ${version.versionNumber} · ${version.status}`,
            value: version.versionId,
          })),
          eligibilityVersionId,
          attachmentsLocked,
        )}
      />
    );
  }
  if (currentStep === "workflow") {
    return (
      <WorkflowStep
        attachmentsLocked={attachmentsLocked}
        disabled={disabled}
        loading={workflowVersions.isPending}
        options={attachedVersionOptions(
          (workflowVersions.data ?? []).map((version) => ({
            label: `${version.name} — version ${version.versionNumber} · ${version.status}`,
            value: version.versionId,
          })),
          workflowVersionId,
          attachmentsLocked,
        )}
      />
    );
  }
  if (currentStep === "publicContent") {
    return <PublicContentStep call={call} disabled={disabled} />;
  }
  return (
    <FundingCallReviewStep
      eligibility={{
        id: selectedEligibility?.versionId ?? eligibilityVersionId ?? null,
        label: selectedEligibility
          ? `${selectedEligibility.ruleSetName} — version ${selectedEligibility.versionNumber} · ${selectedEligibility.status}`
          : attachedVersionLabel(eligibilityVersionId, attachmentsLocked),
      }}
      formVersion={{
        id: selectedForm?.versionId ?? formVersionId ?? null,
        label: selectedForm
          ? `${selectedForm.formName} — version ${selectedForm.versionNumber} · ${selectedForm.status ?? "PUBLISHED"}`
          : attachedVersionLabel(formVersionId, attachmentsLocked),
      }}
      workflow={{
        id: selectedWorkflow?.versionId ?? workflowVersionId ?? null,
        label: selectedWorkflow
          ? `${selectedWorkflow.name} — version ${selectedWorkflow.versionNumber} · ${selectedWorkflow.status}`
          : attachedVersionLabel(workflowVersionId, attachmentsLocked),
      }}
    />
  );
}
