"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { formatMoneyValue } from "@/components/ui/money-field";

type ReviewValues = {
  applicationDuplicatePolicy: string;
  closesAt: string;
  eligibilityRuleSetVersionId: string | null;
  formVersionId: string | null;
  fundingInstrument: string;
  maximumGrantAmount: string;
  minimumGrantAmount: string;
  opensAt: string;
  publicContactEmail: string;
  publicContactName: string;
  thematicArea: string;
  title: string;
  totalBudgetEnvelope: string;
  workflowTemplateVersionId: string | null;
};

type VersionLabel = {
  id: string | null;
  label: string;
};

function displayDate(value: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat("en-NA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function ReviewItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border-b border-brand-navy/10 py-3 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-brand-navy">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function ReviewGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-5">
      <h3 className="text-base font-bold text-brand-navy">{title}</h3>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

function selectedLabel(selection: VersionLabel, id: string | null) {
  return selection.id === id ? selection.label : "Not selected";
}

export function FundingCallReviewStep({
  eligibility,
  formVersion,
  workflow,
}: {
  eligibility: VersionLabel;
  formVersion: VersionLabel;
  workflow: VersionLabel;
}) {
  const form = useFormContext<ReviewValues>();
  const values = useWatch({ control: form.control });
  const money = (value?: string) =>
    value ? `N$ ${formatMoneyValue(value)}` : "Not provided";

  return (
    <div className="md:col-span-2">
      <h2 className="text-2xl font-bold tracking-tight text-brand-navy">
        Review funding call
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-navy/65">
        Check the call and its exact configuration bindings before saving the Draft.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ReviewGroup title="Opportunity">
          <ReviewItem label="Title" value={values.title} />
          <ReviewItem label="Funding instrument" value={values.fundingInstrument} />
          <ReviewItem label="Thematic area" value={values.thematicArea} />
        </ReviewGroup>
        <ReviewGroup title="Funding">
          <ReviewItem label="Total envelope" value={money(values.totalBudgetEnvelope)} />
          <ReviewItem label="Minimum grant" value={money(values.minimumGrantAmount)} />
          <ReviewItem label="Maximum grant" value={money(values.maximumGrantAmount)} />
        </ReviewGroup>
        <ReviewGroup title="Schedule">
          <ReviewItem label="Opens" value={displayDate(values.opensAt ?? "")} />
          <ReviewItem label="Closes" value={displayDate(values.closesAt ?? "")} />
        </ReviewGroup>
        <ReviewGroup title="Exact version bindings">
          <ReviewItem
            label="Application form"
            value={selectedLabel(formVersion, values.formVersionId ?? null)}
          />
          <ReviewItem
            label="Eligibility ruleset"
            value={selectedLabel(
              eligibility,
              values.eligibilityRuleSetVersionId ?? null,
            )}
          />
          <ReviewItem
            label="Workflow template"
            value={selectedLabel(
              workflow,
              values.workflowTemplateVersionId ?? null,
            )}
          />
        </ReviewGroup>
        <ReviewGroup title="Public contact">
          <ReviewItem label="Name" value={values.publicContactName} />
          <ReviewItem label="Email" value={values.publicContactEmail} />
        </ReviewGroup>
        <ReviewGroup title="Application policy">
          <ReviewItem
            label="Application limit"
            value={values.applicationDuplicatePolicy?.replaceAll("_", " ")}
          />
          <ReviewItem
            label="Required documents"
            value="Owned by the selected Application Form Version"
          />
        </ReviewGroup>
      </div>
    </div>
  );
}
