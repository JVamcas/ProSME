"use client";

import { GeneralButtonLink } from "@/components/ui/button";
import { FormDateTimeInput } from "@/components/ui/form-date-time-input";
import {
  FormInput,
  FormSelect,
} from "@/components/ui/form-fields";
import { MoneyField } from "@/components/ui/money-field";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import type { FundingCallView } from "../api/FundingCallTransport";
import { FundingCallThumbnailField } from "./FundingCallThumbnailField";

export type FundingCallStepId =
  | "basics"
  | "funding"
  | "schedule"
  | "application"
  | "eligibility"
  | "workflow"
  | "publicContent"
  | "review";

export const fundingCallSteps = [
  { id: "basics", label: "Basics" },
  { id: "funding", label: "Funding" },
  { id: "schedule", label: "Schedule" },
  { id: "application", label: "Application" },
  { id: "eligibility", label: "Eligibility" },
  { id: "workflow", label: "Workflow" },
  { id: "publicContent", label: "Public content" },
  { id: "review", label: "Review" },
] as const;

type VersionOption = {
  label: string;
  value: string;
};

function StepIntroduction({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
  return (
    <div className="md:col-span-2">
      <h2 className="text-2xl font-bold tracking-tight text-brand-navy">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-navy/65">
        {children}
      </p>
    </div>
  );
}

export function BasicsStep({ disabled }: { disabled: boolean }) {
  return (
    <>
      <StepIntroduction title="Basic information">
        Describe the opportunity applicants will see and how it is classified.
      </StepIntroduction>
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
    </>
  );
}

export function FundingStep() {
  return (
    <>
      <StepIntroduction title="Funding details">
        Set the available envelope and grant range. All amounts are in Namibian dollars.
      </StepIntroduction>
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
    </>
  );
}

export function ScheduleStep({ opensAt }: { opensAt: string }) {
  return (
    <>
      <StepIntroduction title="Schedule">
        Times are managed using the configured Namibia business timezone. Submissions close at the stated closing time.
      </StepIntroduction>
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
      <div className="md:col-span-2 rounded-xl border border-brand-navy/10 bg-brand-blue/10 p-4 text-sm leading-6 text-brand-navy/70">
        Once scheduled, the call is shown as Upcoming. It becomes Live at the opening time and Closed at the closing time.
      </div>
    </>
  );
}

export function ApplicationStep({
  disabled,
  loading,
  options,
}: {
  disabled: boolean;
  loading: boolean;
  options: VersionOption[];
}) {
  return (
    <>
      <StepIntroduction title="Application form">
        Bind the exact application form version applicants will complete.
      </StepIntroduction>
      <FormSelect
        key={loading ? "form-loading" : "form-ready"}
        containerClassName="md:col-span-2"
        disabled={disabled || loading}
        infoTooltip="Draft calls may bind draft or published forms for configuration and testing. The form must be published before the funding call can be published."
        items={options}
        label="Application form version"
        name="formVersionId"
        placeholder={loading ? "Loading form versions…" : "Select a form version"}
      />
      <div className="md:col-span-2 rounded-xl border border-brand-navy/10 bg-brand-cream/60 p-4 text-sm leading-6 text-brand-navy/70">
        Applicant declarations and required document uploads are defined by this Application Form Version. They are not configured again on the Funding Call.
      </div>
      <FormSelect
        containerClassName="md:col-span-2"
        infoTooltip="Controls whether this call accepts one application per applicant, one per represented business, or multiple applications."
        items={[
          { label: "One per represented business", value: "one_per_business" },
          { label: "One per applicant", value: "one_per_applicant" },
          { label: "Multiple applications allowed", value: "none" },
        ]}
        label="Application limit"
        name="applicationDuplicatePolicy"
      />
    </>
  );
}

export function EligibilityStep({
  configureHref,
  disabled,
  loading,
  options,
}: {
  configureHref?: string;
  disabled: boolean;
  loading: boolean;
  options: VersionOption[];
}) {
  return (
    <>
      <StepIntroduction title="Eligibility">
        Bind the ruleset used by the public self-check and authoritative screening.
      </StepIntroduction>
      <FormSelect
        key={loading ? "eligibility-loading" : "eligibility-ready"}
        containerClassName="md:col-span-2"
        disabled={disabled || loading}
        infoTooltip="Draft calls may bind draft or published rulesets for configuration and testing. The ruleset must be published before the funding call can be published."
        items={options}
        label="Eligibility ruleset"
        name="eligibilityRuleSetVersionId"
        placeholder={loading ? "Loading eligibility rulesets…" : "Select an eligibility ruleset"}
      />
      {configureHref ? (
        <div className="md:col-span-2">
          <GeneralButtonLink
            href={configureHref}
            size="compact"
            variant="outlineOrange"
          >
            Configure eligibility ruleset
          </GeneralButtonLink>
        </div>
      ) : null}
    </>
  );
}

export function WorkflowStep({
  disabled,
  loading,
  options,
}: {
  disabled: boolean;
  loading: boolean;
  options: VersionOption[];
}) {
  return (
    <>
      <StepIntroduction title="Assessment workflow">
        Bind the exact workflow version that will process every application under this call.
      </StepIntroduction>
      <FormSelect
        key={loading ? "workflow-loading" : "workflow-ready"}
        containerClassName="md:col-span-2"
        disabled={disabled || loading}
        infoTooltip="Draft calls may bind draft or published workflows for configuration and testing. The workflow must be published before the funding call can be published."
        items={options}
        label="Workflow template version"
        name="workflowTemplateVersionId"
        placeholder={loading ? "Loading workflow versions…" : "Select a workflow template version"}
      />
      <div className="md:col-span-2 rounded-xl border border-brand-navy/10 bg-brand-cream/60 p-4 text-sm leading-6 text-brand-navy/70">
        Stages, scoring, responsibilities and conflict-of-interest controls are owned by the selected Workflow Template Version and are not configured again here.
      </div>
    </>
  );
}

export function PublicContentStep({
  call,
  disabled,
}: {
  call?: FundingCallView;
  disabled: boolean;
}) {
  return (
    <>
      <StepIntroduction title="Public content">
        Provide the public eligibility summary and contact details for applicant enquiries.
      </StepIntroduction>
      <FormRichTextField
        className="md:col-span-2"
        label="Public eligibility summary"
        name="eligibilitySummary"
      />
      <FundingCallThumbnailField call={call} disabled={disabled} />
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
    </>
  );
}
