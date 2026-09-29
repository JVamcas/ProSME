"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { StepProgress } from "@/components/ui/step-progress";
import { toInputDateTimeLocal } from "@/lib/dateUtils";
import {
  fundingCallCreateSchema,
  fundingCallDescriptionSchema,
  fundingCallEligibilitySummarySchema,
} from "../api/FundingCallSchemas";
import type { FundingCallCreateInput } from "../api/FundingCallSchemas";
import type { FundingCallCreationProgressValues } from "../api/FundingCallSchemas";
import type {
  FundingCallCreationProgressView,
  FundingCallView,
} from "../api/FundingCallTransport";
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
  fundingCallSteps,
  type FundingCallStepId,
  PublicContentStep,
  ScheduleStep,
  WorkflowStep,
} from "./FundingCallFormSteps";
import { FundingCallReviewStep } from "./FundingCallReviewStep";
import { FundingCallSaveStatus } from "./FundingCallSaveStatus";
import { useFundingCallCreationAutosave } from "./useFundingCallCreationAutosave";

const localMoneySchema = z
  .union([z.number().nonnegative(), z.string().trim().min(1)])
  .transform(String);
const localOptionalVersionId = z
  .union([z.literal(""), z.uuid()])
  .transform((value) => value || null);

const localFormSchema = z.object({
  applicationDuplicatePolicy: z.enum([
    "one_per_applicant",
    "one_per_business",
    "none",
  ]),
  closesAt: z.string().min(1, "Closing date is required."),
  description: fundingCallDescriptionSchema,
  eligibilitySummary: fundingCallEligibilitySummarySchema,
  eligibilityRuleSetVersionId: localOptionalVersionId,
  formVersionId: localOptionalVersionId,
  fundingInstrument: z.string().trim().max(160),
  maximumGrantAmount: localMoneySchema,
  minimumGrantAmount: localMoneySchema,
  opensAt: z.string().min(1, "Opening date is required."),
  publicContactEmail: z.union([z.literal(""), z.email().max(254)]),
  publicContactName: z.string().trim().max(160),
  publicContactPhone: z.string().trim().max(40),
  thematicArea: z.string().trim().max(160),
  title: z.string().trim().min(2).max(240),
  totalBudgetEnvelope: localMoneySchema,
  workflowTemplateVersionId: localOptionalVersionId,
});

type LocalFormInput = z.input<typeof localFormSchema>;
type LocalFormOutput = z.output<typeof localFormSchema>;

const stepFields: Record<
  Exclude<FundingCallStepId, "review">,
  FieldPath<LocalFormInput>[]
> = {
  application: ["formVersionId", "applicationDuplicatePolicy"],
  basics: ["title", "description", "fundingInstrument", "thematicArea"],
  eligibility: ["eligibilityRuleSetVersionId"],
  funding: [
    "totalBudgetEnvelope",
    "minimumGrantAmount",
    "maximumGrantAmount",
  ],
  publicContent: [
    "eligibilitySummary",
    "publicContactName",
    "publicContactEmail",
    "publicContactPhone",
  ],
  schedule: ["opensAt", "closesAt"],
  workflow: ["workflowTemplateVersionId"],
};

function defaults(
  call?: FundingCallView,
  creationProgress?: FundingCallCreationProgressView,
): LocalFormInput {
  if (!call && creationProgress) return creationProgress.values;

  return {
    applicationDuplicatePolicy:
      call?.applicationDuplicatePolicy ?? "one_per_business",
    closesAt: call ? toInputDateTimeLocal(call.closesAt) : "",
    description: call?.description ?? "",
    eligibilitySummary: call?.eligibilitySummary ?? "",
    eligibilityRuleSetVersionId: call?.eligibilityRuleSetVersionId ?? "",
    formVersionId: call?.formVersionId ?? "",
    fundingInstrument: call?.fundingInstrument ?? "",
    maximumGrantAmount: call?.maximumGrantAmount ?? "",
    minimumGrantAmount: call?.minimumGrantAmount ?? "",
    opensAt: call ? toInputDateTimeLocal(call.opensAt) : "",
    publicContactEmail: call?.publicContactEmail ?? "",
    publicContactName: call?.publicContactName ?? "",
    publicContactPhone: call?.publicContactPhone ?? "",
    thematicArea: call?.thematicArea ?? "",
    title: call?.title ?? "",
    totalBudgetEnvelope: call?.totalBudgetEnvelope ?? "",
    workflowTemplateVersionId: call?.workflowTemplateVersionId ?? "",
  };
}

function draftValues(values: LocalFormInput): FundingCallCreationProgressValues {
  return {
    ...values,
    maximumGrantAmount: String(values.maximumGrantAmount),
    minimumGrantAmount: String(values.minimumGrantAmount),
    totalBudgetEnvelope: String(values.totalBudgetEnvelope),
  };
}

function createPublicIdentifiers(title: string) {
  const titleSegment =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "funding-call";
  const uniqueSegment = crypto.randomUUID().slice(0, 8);
  return {
    reference: `${titleSegment.slice(0, 71).toUpperCase()}-${uniqueSegment.toUpperCase()}`,
    slug: `${titleSegment.slice(0, 111)}-${uniqueSegment}`,
  };
}

function firstInvalidStep(errors: FieldValues): FundingCallStepId {
  const invalidField = Object.keys(errors)[0];
  const entry = Object.entries(stepFields).find(([, fields]) =>
    fields.includes(invalidField as FieldPath<LocalFormInput>),
  );
  return (entry?.[0] as FundingCallStepId | undefined) ?? "basics";
}

export function FundingCallForm({
  call,
  creationProgress,
  disabled = false,
  onSubmit,
}: {
  call?: FundingCallView;
  creationProgress?: FundingCallCreationProgressView;
  disabled?: boolean;
  onSubmit: (input: FundingCallCreateInput) => Promise<void>;
}) {
  const creationAutosaveEnabled = !call;
  const [currentStep, setCurrentStep] = useState<FundingCallStepId>(
    creationProgress?.currentStep ?? "basics",
  );
  const [completedSteps, setCompletedSteps] = useState<FundingCallStepId[]>([]);
  const eligibilityVersions = useBindableEligibilityRuleSetVersions();
  const formVersions = useBindableApplicationFormVersions();
  const workflowVersions = useBindableWorkflowTemplateVersions();
  const form = useForm<LocalFormInput, unknown, LocalFormOutput>({
    defaultValues: defaults(call, creationProgress),
    resolver: zodResolver(localFormSchema),
  });
  const watchedValues = useWatch({ control: form.control }) as LocalFormInput;
  const autosave = useFundingCallCreationAutosave({
    currentStep,
    enabled: creationAutosaveEnabled,
    initialProgress: creationProgress,
    values: draftValues(watchedValues),
  });
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

  const submit = form.handleSubmit(
    async (values) => {
      if (creationAutosaveEnabled && autosave.status !== "saved") {
        toast.error("Wait for the latest changes to finish saving.");
        return;
      }
      try {
        const identifiers = call
          ? { reference: call.reference, slug: call.slug }
          : createPublicIdentifiers(values.title);
        const input = fundingCallCreateSchema.parse({
          ...values,
          closesAt: new Date(values.closesAt).toISOString(),
          ...identifiers,
          opensAt: new Date(values.opensAt).toISOString(),
        });
        await onSubmit(input);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save the funding call.",
        );
      }
    },
    (errors) => {
      setCurrentStep(firstInvalidStep(errors));
      toast.error("Review the highlighted fields before saving the Draft.");
    },
  );
  const currentIndex = fundingCallSteps.findIndex(
    (step) => step.id === currentStep,
  );

  async function continueToNextStep() {
    if (currentStep === "review") return;
    const valid = await form.trigger(stepFields[currentStep], {
      shouldFocus: true,
    });
    if (!valid) return;
    setCompletedSteps((current) =>
      current.includes(currentStep) ? current : [...current, currentStep],
    );
    setCurrentStep(fundingCallSteps[currentIndex + 1].id);
  }

  function renderStep() {
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
            call && selectedEligibility
              && call.eligibilityRuleSetVersionId === selectedEligibility.versionId
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
    if (currentStep === "publicContent") return <PublicContentStep />;
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

  return (
    <FormProvider {...form}>
      <form className="w-full" onSubmit={submit}>
        <div className="overflow-hidden rounded-t-2xl border border-brand-navy/15 bg-white shadow-sm">
          <StepProgress
            ariaLabel="Funding call sections"
            className="border-b border-brand-navy/10 px-5 py-5"
            completedStepIds={completedSteps}
            currentStepId={currentStep}
            disabled={form.formState.isSubmitting}
            hideLabelsOnMobile
            onStepChange={setCurrentStep}
            steps={fundingCallSteps}
          />
          <fieldset
            className="grid min-h-96 gap-4 p-5 sm:p-8 md:grid-cols-2"
            disabled={disabled}
          >
            {renderStep()}
          </fieldset>
          <div className="flex items-center justify-between border-t border-brand-navy/10 px-5 py-4 sm:px-8">
            <div className="flex flex-wrap items-center gap-4">
              <GeneralButton
                disabled={currentIndex === 0 || form.formState.isSubmitting}
                onClick={() => setCurrentStep(fundingCallSteps[currentIndex - 1].id)}
                type="button"
                variant="outline"
              >
                Back
              </GeneralButton>
              <FundingCallSaveStatus
                enabled={creationAutosaveEnabled}
                error={autosave.error}
                onRetry={autosave.retry}
                status={autosave.status}
              />
            </div>
            {currentStep === "review" ? (
              <GeneralButton
                disabled={
                  disabled
                  || form.formState.isSubmitting
                  || (creationAutosaveEnabled && autosave.status !== "saved")
                }
                type="submit"
              >
                {form.formState.isSubmitting ? "Saving…" : "Save Draft"}
              </GeneralButton>
            ) : (
              <GeneralButton
                disabled={form.formState.isSubmitting}
                onClick={() => void continueToNextStep()}
                type="button"
              >
                Continue
              </GeneralButton>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
