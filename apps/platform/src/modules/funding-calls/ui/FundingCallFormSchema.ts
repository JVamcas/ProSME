import { z } from "zod";
import type { FieldPath, FieldValues } from "react-hook-form";
import { toInputDateTimeLocal } from "@/lib/dateUtils";
import {
  fundingCallDescriptionSchema,
  fundingCallEligibilitySummarySchema,
  type FundingCallCreationProgressValues,
} from "../api/FundingCallSchemas";
import type {
  FundingCallCreationProgressView,
  FundingCallView,
} from "../api/FundingCallTransport";
import type { FundingCallStepId } from "./FundingCallFormSteps";

const localMoneySchema = z
  .union([z.number().nonnegative(), z.string().trim().min(1)])
  .transform(String);
const localOptionalVersionId = z
  .union([z.literal(""), z.uuid()])
  .transform((value) => value || null);

export const localFormSchema = z.object({
  allowResubmissionAfterWithdrawal: z.boolean(),
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

export type LocalFormInput = z.input<typeof localFormSchema>;
export type LocalFormOutput = z.output<typeof localFormSchema>;

export const stepFields: Record<
  Exclude<FundingCallStepId, "review">,
  FieldPath<LocalFormInput>[]
> = {
  application: [
    "formVersionId",
    "applicationDuplicatePolicy",
    "allowResubmissionAfterWithdrawal",
  ],
  basics: ["title", "description", "fundingInstrument", "thematicArea"],
  eligibility: ["eligibilityRuleSetVersionId"],
  funding: ["totalBudgetEnvelope", "minimumGrantAmount", "maximumGrantAmount"],
  publicContent: [
    "eligibilitySummary",
    "publicContactName",
    "publicContactEmail",
    "publicContactPhone",
  ],
  schedule: ["opensAt", "closesAt"],
  workflow: ["workflowTemplateVersionId"],
};

export function defaults(
  call?: FundingCallView,
  creationProgress?: FundingCallCreationProgressView,
): LocalFormInput {
  if (!call && creationProgress) {
    return {
      ...creationProgress.values,
      allowResubmissionAfterWithdrawal:
        creationProgress.values.allowResubmissionAfterWithdrawal ?? false,
    };
  }

  return {
    allowResubmissionAfterWithdrawal:
      call?.allowResubmissionAfterWithdrawal ?? false,
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

export function draftValues(
  values: LocalFormInput,
): FundingCallCreationProgressValues {
  return {
    ...values,
    maximumGrantAmount: String(values.maximumGrantAmount),
    minimumGrantAmount: String(values.minimumGrantAmount),
    totalBudgetEnvelope: String(values.totalBudgetEnvelope),
  };
}

export function createPublicIdentifiers(title: string) {
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

export function firstInvalidStep(errors: FieldValues): FundingCallStepId {
  const invalidField = Object.keys(errors)[0];
  const entry = Object.entries(stepFields).find(([, fields]) =>
    fields.includes(invalidField as FieldPath<LocalFormInput>),
  );
  return (entry?.[0] as FundingCallStepId | undefined) ?? "basics";
}
