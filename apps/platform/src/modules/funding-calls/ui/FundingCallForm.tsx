"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { FormDateTimeInput } from "@/components/ui/form-date-time-input";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { MoneyField } from "@/components/ui/money-field";
import { toInputDateTimeLocal } from "@/lib/dateUtils";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import {
  fundingCallCreateSchema,
  fundingCallDescriptionSchema,
} from "../api/FundingCallSchemas";
import type { FundingCallCreateInput } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import {
  useBindableApplicationFormVersions,
  useBindableEligibilityRuleSetVersions,
  useBindableWorkflowTemplateVersions,
} from "../FundingCallHooks";

const localMoneySchema = z
  .union([z.number().nonnegative(), z.string().trim().min(1)])
  .transform(String);

const localOptionalVersionId = z
  .union([z.literal(""), z.uuid()])
  .transform((value) => value || null);

const localFormSchema = z.object({
  closesAt: z.string().min(1, "Closing date is required."),
  description: fundingCallDescriptionSchema,
  eligibilitySummary: z.string().trim().max(2000),
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

function defaults(call?: FundingCallView): LocalFormInput {
  return {
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

export function FundingCallForm({
  call,
  disabled = false,
  onSubmit,
}: {
  call?: FundingCallView;
  disabled?: boolean;
  onSubmit: (input: FundingCallCreateInput) => Promise<void>;
}) {
  const eligibilityVersions = useBindableEligibilityRuleSetVersions();
  const formVersions = useBindableApplicationFormVersions();
  const workflowVersions = useBindableWorkflowTemplateVersions();
  const form = useForm<LocalFormInput, unknown, LocalFormOutput>({
    defaultValues: defaults(call),
    resolver: zodResolver(localFormSchema),
  });
  const opensAt = useWatch({ control: form.control, name: "opensAt" });
  const eligibilityVersionId = useWatch({
    control: form.control,
    name: "eligibilityRuleSetVersionId",
  });
  const selectedEligibility = eligibilityVersions.data?.find(
    (version) => version.versionId === eligibilityVersionId,
  );
  const submit = form.handleSubmit(async (values) => {
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
  });

  return (
    <FormProvider {...form}>
      <form className="w-full max-w-6xl space-y-6" onSubmit={submit}>
        <fieldset className="grid gap-4 md:grid-cols-2" disabled={disabled}>
          <FormInput
            containerClassName="md:col-span-2"
            label="Title"
            name="title"
            required
          />

          <FormRichTextField
            className="md:col-span-2"
            disabled={disabled}
            label="Description"
            name="description"
            required
          />

          <FormSelect
            key={
              workflowVersions.isPending
                ? "workflow-loading"
                : "workflow-ready"
            }
            containerClassName="md:col-span-2"
            disabled={disabled || workflowVersions.isPending}
            infoTooltip="The exact published workflow template version used when an application is submitted. Optional for drafts and required before publishing."
            items={(workflowVersions.data ?? []).map((version) => ({
              label: `${version.name} — version ${version.versionNumber}`,
              value: version.versionId,
            }))}
            label="Workflow template version"
            name="workflowTemplateVersionId"
            placeholder={
              workflowVersions.isPending
                ? "Loading published workflows…"
                : "Select a published workflow template version"
            }
          />

          <FormSelect
            key={formVersions.isPending ? "form-loading" : "form-ready"}
            containerClassName="md:col-span-2"
            disabled={disabled || formVersions.isPending}
            infoTooltip="Draft calls may bind draft or published forms for configuration and testing. The form must be published before the funding call can be published."
            items={(formVersions.data ?? []).map((version) => ({
              label: `${version.formName} — version ${version.versionNumber} · ${version.status ?? "PUBLISHED"}`,
              value: version.versionId,
            }))}
            label="Application form version"
            name="formVersionId"
            placeholder={
              formVersions.isPending
                ? "Loading form versions…"
                : "Select a form version"
            }
          />

          <FormSelect
            key={
              eligibilityVersions.isPending
                ? "eligibility-loading"
                : "eligibility-ready"
            }
            containerClassName="md:col-span-2"
            disabled={disabled || eligibilityVersions.isPending}
            infoTooltip="Draft calls may bind draft or published rulesets for configuration and testing. The ruleset must be published before the funding call can be published."
            items={(eligibilityVersions.data ?? []).map((version) => ({
              label: `${version.ruleSetName} — version ${version.versionNumber} · ${version.status}`,
              value: version.versionId,
            }))}
            label="Eligibility ruleset"
            name="eligibilityRuleSetVersionId"
            placeholder={
              eligibilityVersions.isPending
                ? "Loading eligibility rulesets…"
                : "Select an eligibility ruleset"
            }
          />

          {call && selectedEligibility
            && call.eligibilityRuleSetVersionId === selectedEligibility.versionId ? (
              <div className="md:col-span-2">
                <GeneralButtonLink
                  href={`/admin/settings/eligibility-rulesets/${selectedEligibility.ruleSetId}`}
                  variant="outlineOrange"
                >
                  Configure bound eligibility ruleset
                </GeneralButtonLink>
              </div>
            ) : null}

          <FormInput
            infoTooltip="The type of financial support offered, such as a grant, loan, or guarantee."
            label="Funding instrument"
            name="fundingInstrument"
          />

          <FormInput
            infoTooltip="The sector or priority area this funding call supports, such as agriculture, tourism, or digital innovation."
            label="Thematic area"
            name="thematicArea"
          />

          <MoneyField
            containerClassName="md:col-span-2"
            label="Total budget envelope"
            name="totalBudgetEnvelope"
            required
          />

          <MoneyField
            label="Minimum grant amount"
            name="minimumGrantAmount"
            required
          />

          <MoneyField
            label="Maximum grant amount"
            name="maximumGrantAmount"
            required
          />

          <FormDateTimeInput
            label="Opening date and time"
            name="opensAt"
            required
          />

          <FormDateTimeInput
            label="Closing date and time"
            minValue={opensAt}
            name="closesAt"
            required
          />

          <FormInput label="Public contact name" name="publicContactName" />

          <FormInput
            label="Public contact email"
            name="publicContactEmail"
            type="email"
          />

          <FormInput
            containerClassName="md:col-span-2"
            label="Public contact phone"
            name="publicContactPhone"
          />
        </fieldset>

        <div className="flex justify-end">
          <GeneralButton
            disabled={disabled || form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting ? "Saving…" : "Save"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
