"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useForm,
  type Resolver,
} from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import {
  FormInput,
  FormSelect,
} from "@/components/ui/form-fields";
import { ConditionBuilder } from "@/modules/conditions/ui/builder";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { eligibilityBuilderRuleSchema } from "../api/EligibilityRuleSetSchemas";
import type { EligibilityBuilderRule } from "../api/EligibilityRuleSetTransport";

type EligibilityRuleFormValues = Omit<EligibilityBuilderRule, "condition"> & {
  condition: unknown;
};

const ruleResolver = zodResolver(
  eligibilityBuilderRuleSchema as never,
) as unknown as Resolver<EligibilityRuleFormValues>;

function newRule(order: number): EligibilityBuilderRule {
  const id = crypto.randomUUID();
  return {
    applicantMessage: "",
    condition: {
      children: [],
      combinator: "AND",
      id,
      kind: "GROUP",
    },
    executionMode: "BOTH",
    failureType: "HARD_FAIL",
    id,
    order,
    reasonCode: "",
  };
}

export function EligibilityRuleDialog({
  initialRule,
  fields,
  nextOrder,
  onCancel,
  onSave,
  saving,
}: {
  fields: readonly ConditionFieldDefinition[];
  initialRule?: EligibilityBuilderRule;
  nextOrder: number;
  onCancel: () => void;
  onSave: (rule: EligibilityBuilderRule) => Promise<void>;
  saving: boolean;
}) {
  const form = useForm<EligibilityRuleFormValues>({
    defaultValues: initialRule ?? newRule(nextOrder),
    resolver: ruleResolver,
  });
  const submit = form.handleSubmit(async (values) => {
    const rule = eligibilityBuilderRuleSchema.parse(values);
    await onSave(rule as EligibilityBuilderRule);
  });

  return (
    <FormProvider {...form}>
      <form className="space-y-5" onSubmit={submit}>
        <input type="hidden" {...form.register("id")} />
        <input
          type="hidden"
          {...form.register("order", { valueAsNumber: true })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Reason code"
            name="reasonCode"
            placeholder="OWNERSHIP_REQUIRED"
            required
          />
          <FormSelect
            items={[
              { label: "Hard Fail", value: "HARD_FAIL" },
              { label: "Soft Fail", value: "SOFT_FAIL" },
              { label: "Warning", value: "WARNING" },
            ]}
            label="Failure type"
            name="failureType"
            required
          />
          <FormSelect
            containerClassName="md:col-span-2"
            items={[
              { label: "Self Check", value: "SELF_CHECK" },
              { label: "Screening", value: "SCREENING" },
              { label: "Both", value: "BOTH" },
            ]}
            label="Execution mode"
            name="executionMode"
            required
          />
        </div>
        <FormInput
          label="Applicant-facing message"
          name="applicantMessage"
          required
        />
        <Controller
          control={form.control}
          name="condition"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-brand-navy">
                Conditions
              </h3>
              <ConditionBuilder
                fields={fields}
                onChange={field.onChange}
                value={field.value as ConditionGroup}
              />
              {fieldState.error ? (
                <p className="text-sm text-red-700" role="alert">
                  {fieldState.error.message ??
                    "Resolve the condition errors before saving."}
                </p>
              ) : null}
            </div>
          )}
        />
        <div className="flex justify-end gap-3">
          <GeneralButton onClick={onCancel} type="button" variant="outline">
            Cancel
          </GeneralButton>
          <GeneralButton disabled={saving} type="submit">
            {saving ? "Saving…" : "Save rule"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
