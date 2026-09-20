"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { EligibilityRuleSetVersion } from "../domain/EligibilityRuleSet";
import type { EligibilityEvaluationResult } from "../domain/EligibilityEvaluation";
import {
  eligibilityTestSchema,
  type EligibilityTestInput,
} from "../api/EligibilityTestSchemas";
import {
  useEligibilityRuleSetBuilder,
  useEligibilityRuleSetTest,
} from "../EligibilityRuleSetHooks";

const booleanItems = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const booleanRegistration = {
  setValueAs: (value: string) => value === "true",
};

const numberRegistration = { valueAsNumber: true };

const defaultValues: EligibilityTestInput["values"] = {
  application: {
    annual_turnover: 0,
    business: {
      bank_account_active: false,
      employee_count: 0,
      operating_months: 0,
      ownership_percentage: 0,
      registered: false,
      statutory_good_standing: false,
    },
    requested_amount: 0,
  },
  fundingCall: { maximum_grant_amount: 0 },
};

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
  ruleSetId,
  versions,
}: {
  ruleSetId: string;
  versions: EligibilityRuleSetVersion[];
}) {
  const test = useEligibilityRuleSetTest(ruleSetId);
  const form = useForm<EligibilityTestInput>({
    defaultValues: {
      mode: "SELF_CHECK",
      values: defaultValues,
      versionId: versions[0].id,
    },
    resolver: zodResolver(eligibilityTestSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      await test.mutateAsync(input);
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
              items={versions.map((version) => ({
                label: `Version ${version.versionNumber} · ${version.status}`,
                value: version.id,
              }))}
              label="Ruleset version"
              name="versionId"
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
              <FormInput
                label="Requested amount"
                min="0"
                name="values.application.requested_amount"
                registrationOptions={numberRegistration}
                required
                step="0.01"
                type="number"
              />
              <FormInput
                label="Annual turnover"
                min="0"
                name="values.application.annual_turnover"
                registrationOptions={numberRegistration}
                required
                step="0.01"
                type="number"
              />
              <FormInput
                label="Employee count"
                min="0"
                name="values.application.business.employee_count"
                registrationOptions={numberRegistration}
                required
                step="1"
                type="number"
              />
              <FormInput
                label="Namibian ownership percentage"
                max="100"
                min="0"
                name="values.application.business.ownership_percentage"
                registrationOptions={numberRegistration}
                required
                step="0.01"
                type="number"
              />
              <FormInput
                label="Months in operation"
                min="0"
                name="values.application.business.operating_months"
                registrationOptions={numberRegistration}
                required
                step="1"
                type="number"
              />
              <FormInput
                label="Funding Call maximum grant amount"
                min="0"
                name="values.fundingCall.maximum_grant_amount"
                registrationOptions={numberRegistration}
                required
                step="0.01"
                type="number"
              />
              <FormSelect
                items={booleanItems}
                label="Business is registered"
                name="values.application.business.registered"
                registrationOptions={booleanRegistration}
                required
              />
              <FormSelect
                items={booleanItems}
                label="Statutory good standing"
                name="values.application.business.statutory_good_standing"
                registrationOptions={booleanRegistration}
                required
              />
              <FormSelect
                items={booleanItems}
                label="Active business bank account"
                name="values.application.business.bank_account_active"
                registrationOptions={booleanRegistration}
                required
              />
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

export function EligibilityRuleSetTestScreen({ id }: { id: string }) {
  const query = useEligibilityRuleSetBuilder(id);
  if (query.isPending) return <p>Loading eligibility ruleset…</p>;
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Eligibility ruleset unavailable."}
      </p>
    );
  }
  const versions = query.data.versions
    .filter((version) => version.status !== "RETIRED")
    .sort((left, right) => right.versionNumber - left.versionNumber);
  if (!versions.length) {
    return <p>No Draft or Published version is available to test.</p>;
  }
  return <EligibilityTestForm ruleSetId={id} versions={versions} />;
}
