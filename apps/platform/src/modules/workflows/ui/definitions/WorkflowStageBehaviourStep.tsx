"use client";

import { CheckboxField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-fields";

type Props = {
  coiFormItems: readonly { label: string; value: string }[];
  coiGated: boolean;
  formsPending: boolean;
};

export function WorkflowStageBehaviourStep({
  coiFormItems,
  coiGated,
  formsPending,
}: Props) {
  return (
    <section aria-label="Stage behaviour" className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-brand-navy">
          Stage behaviour
        </h3>
        <p className="mt-1 text-sm text-brand-navy/60">
          Control availability, repetition, and conflict-of-interest review.
        </p>
      </div>
      <div className="grid gap-4 rounded-xl border border-brand-navy/10 p-4 sm:grid-cols-2">
        <CheckboxField
          description="Allow this stage to participate in the workflow."
          label="Enabled"
          name="enabled"
        />
        <CheckboxField
          description="Allow the workflow to continue without completing this stage."
          label="Optional"
          name="optional"
        />
        <CheckboxField
          description="Allow this stage to run more than once for an application."
          label="Repeatable"
          name="repeatable"
        />
        <CheckboxField
          description="Require reviewers to declare conflicts of interest."
          label="COI-gated"
          name="coiGated"
        />
        <CheckboxField
          description="Withdrawal ends the application and cancels outstanding work in every stage."
          label="Allow applicant to withdraw application at this stage"
          name="allowApplicantWithdrawal"
          containerClassName="sm:col-span-2"
        />
      </div>
      {coiGated ? (
        <FormSelect
          disabled={formsPending}
          items={coiFormItems}
          label="COI form version"
          name="coiFormVersionId"
          placeholder={
            formsPending
              ? "Loading published forms…"
              : "Select a published COI form version"
          }
          required
        />
      ) : null}
    </section>
  );
}
