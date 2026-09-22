"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { EligibilityRuleSetVersion } from "../domain/EligibilityRuleSet";
import type { EligibilityEvaluationResult } from "../domain/EligibilityEvaluation";
import {
  eligibilityTestSchema,
} from "../api/EligibilityTestSchemas";
import {
  useEligibilityRuleSetBuilder,
  useEligibilityRuleSetTest,
} from "../EligibilityRuleSetHooks";

const booleanItems = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const numberRegistration = { valueAsNumber: true };

const booleanRegistration = {
  setValueAs: (value: string) => value === "true",
};

function applicationKey(field: ConditionFieldDefinition) {
  return field.key.slice("application.".length);
}

function sampleValue(field: ConditionFieldDefinition) {
  if (field.type === "BOOLEAN") return false;
  if (field.type === "NUMBER") return 0;
  if (field.type === "DATE") return "2026-01-01";
  return "Sample value";
}

function SampleField({ field }: { field: ConditionFieldDefinition }) {
  const name = `values.application.${applicationKey(field)}`;
  if (field.type === "BOOLEAN") {
    return (
      <FormSelect
        items={booleanItems}
        label={field.label}
        name={name}
        registrationOptions={booleanRegistration}
        required
      />
    );
  }
  return (
    <FormInput
      label={field.label}
      name={name}
      registrationOptions={field.type === "NUMBER"
        ? numberRegistration
        : undefined}
      required
      step={field.type === "NUMBER" ? "any" : undefined}
      type={field.type.toLowerCase()}
    />
  );
}

function TestResult({ result }: { result: EligibilityEvaluationResult }) {
  return (
    <section className="space-y-4" aria-live="polite">
      <div className="rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-navy">Test result</h2>
            <p className="text-sm text-brand-navy/65">
              Ruleset version {result.ruleSetVersionNumber} · {result.mode === "SELF_CHECK"
                ? "Self Check"
                : "Screening"}
            </p>
          </div>
          <span className={result.eligible
            ? "rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800"
            : "rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800"}
          >
            {result.eligible ? "Eligible" : "Not eligible"}
          </span>
        </div>
        {result.manualScreeningRequired ? (
          <p className="mt-3 text-sm font-semibold text-amber-800">
            Manual screening is required because a Soft Fail rule failed.
          </p>
        ) : null}
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-red-50 p-3">
            <dt className="text-xs font-semibold uppercase text-red-700">
              Hard failures
            </dt>
            <dd className="mt-1 text-xl font-bold text-red-800">
              {result.hardFailures.length}
            </dd>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <dt className="text-xs font-semibold uppercase text-amber-700">
              Soft failures
            </dt>
            <dd className="mt-1 text-xl font-bold text-amber-800">
              {result.softFailures.length}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-blue/10 p-3">
            <dt className="text-xs font-semibold uppercase text-brand-navy/70">
              Warnings
            </dt>
            <dd className="mt-1 text-xl font-bold text-brand-navy">
              {result.warnings.length}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        {result.ruleOutcomes.length ? result.ruleOutcomes.map((outcome) => (
          <article
            className="rounded-xl border border-brand-navy/15 bg-white p-4"
            key={outcome.ruleId}
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-brand-navy">{outcome.reasonCode}</strong>
              <span className={outcome.passed
                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
                : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"}
              >
                {outcome.passed ? "Passed" : "Failed"}
              </span>
              <span className="text-xs font-semibold text-brand-navy/60">
                {outcome.failureType.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm text-brand-navy/75">
              {outcome.applicantMessage}
            </p>
          </article>
        )) : (
          <p className="rounded-xl border border-dashed border-brand-navy/20 p-5 text-sm text-brand-navy/65">
            No rules apply to this execution mode.
          </p>
        )}
      </div>
      <p className="text-sm font-semibold text-brand-navy/65">
        This test is advisory and did not create an authoritative eligibility outcome.
      </p>
    </section>
  );
}

function EligibilityTestForm({
  fields,
  fundingCalls,
  ruleSetId,
  version,
}: {
  fields: ConditionFieldDefinition[];
  fundingCalls: Array<{ id: string; title: string }>;
  ruleSetId: string;
  version: EligibilityRuleSetVersion;
}) {
  const test = useEligibilityRuleSetTest(ruleSetId);
  type TestFormValues = {
    fundingCallId: string;
    mode: "SELF_CHECK" | "SCREENING";
    values: { application: Record<string, boolean | number | string> };
    versionId: string;
  };
  const form = useForm<TestFormValues>({
    defaultValues: {
      fundingCallId: fundingCalls[0].id,
      mode: "SELF_CHECK",
      values: {
        application: Object.fromEntries(
          fields.map((field) => [applicationKey(field), sampleValue(field)]),
        ),
      },
      versionId: version.id,
    },
    resolver: zodResolver(eligibilityTestSchema) as Resolver<TestFormValues>,
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await test.mutateAsync(eligibilityTestSchema.parse(values));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to test the ruleset.",
      );
    }
  });

  return (
    <div className="space-y-6">
      <FormProvider {...form}>
        <form
          className="space-y-6 rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm"
          onSubmit={submit}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect
              items={fundingCalls.map((call) => ({
                label: call.title,
                value: call.id,
              }))}
              label="Funding call context"
              name="fundingCallId"
              required
            />
            <FormSelect
              items={[
                { label: "Self Check", value: "SELF_CHECK" },
                { label: "Screening", value: "SCREENING" },
              ]}
              label="Execution mode"
              name="mode"
              required
            />
          </div>

          <fieldset className="space-y-4">
            <legend className="text-lg font-bold text-brand-navy">
              Sample application values
            </legend>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <SampleField field={field} key={field.key} />
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end">
            <GeneralButton disabled={test.isPending} type="submit">
              {test.isPending ? "Running test…" : "Run eligibility test"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
      {test.data ? <TestResult result={test.data} /> : null}
    </div>
  );
}

export function EligibilityRuleSetTestScreen({
  id,
  versionId,
}: {
  id: string;
  versionId?: string;
}) {
  const query = useEligibilityRuleSetBuilder(id, versionId);
  if (query.isPending) return <p>Loading eligibility ruleset…</p>;
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Eligibility ruleset unavailable."}
      </p>
    );
  }
  const applicationFields = query.data.conditionFields.filter(
    (field) => field.key.startsWith("application."),
  );
  if (!query.data.context.fundingCalls.length) {
    return (
      <p>
        Bind this ruleset version to a funding call before testing it.
      </p>
    );
  }
  return (
    <EligibilityTestForm
      fields={applicationFields}
      fundingCalls={query.data.context.fundingCalls}
      ruleSetId={id}
      version={query.data.version}
    />
  );
}
