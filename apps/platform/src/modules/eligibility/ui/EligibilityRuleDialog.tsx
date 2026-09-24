"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import {
  FormInput,
  FormSelect,
} from "@/components/ui/form-fields";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { ConditionBuilder } from "@/modules/conditions/ui/builder";
import { eligibilityBuilderRuleSchema } from "../api/EligibilityRuleSetSchemas";
import type {
  EligibilityBuilderRule,
  EligibilityQuestionOption,
} from "../api/EligibilityRuleSetTransport";
import type {
  EligibilityFieldDescriptor,
} from "../domain/EligibilityFieldRegistry";
import { questionConditionType } from "../domain/EligibilityQuestion";
import { eligibilityBuilderFieldPresentations } from "./EligibilityBuilderFieldPresentation";

type EligibilityRuleFormValues = Omit<EligibilityBuilderRule, "condition"> & {
  condition: unknown;
};

function questionFieldKey(question: EligibilityQuestionOption) {
  return `eligibility.${question.code}`;
}

function replaceQuestionFields(
  group: ConditionGroup,
  questionKeys: ReadonlySet<string>,
  nextKey: string,
): ConditionGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (child.kind === "GROUP") {
        return replaceQuestionFields(child, questionKeys, nextKey);
      }
      if (
        child.leftOperand.kind !== "FIELD"
        || !questionKeys.has(child.leftOperand.key)
      ) {
        return child;
      }
      return {
        ...child,
        leftOperand: { key: nextKey, kind: "FIELD" as const },
      };
    }),
  };
}

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
    questionId: "",
    reasonCode: "",
  };
}

export function EligibilityRuleDialog({
  initialRule,
  fields,
  nextOrder,
  onCancel,
  onSave,
  questions,
  saving,
}: {
  fields: readonly EligibilityFieldDescriptor[];
  initialRule?: EligibilityBuilderRule;
  nextOrder: number;
  onCancel: () => void;
  onSave: (rule: EligibilityBuilderRule) => Promise<void>;
  questions: readonly EligibilityQuestionOption[];
  saving: boolean;
}) {
  const form = useForm<EligibilityRuleFormValues>({
    defaultValues: initialRule ?? newRule(nextOrder),
    resolver: ruleResolver,
  });
  const executionMode = useWatch({
    control: form.control,
    name: "executionMode",
  });
  const questionId = useWatch({
    control: form.control,
    name: "questionId",
  });
  const selectedQuestion = questions.find((question) =>
    question.id === questionId
  );
  const questionKeys = new Set(questions.map(questionFieldKey));
  const fieldPresentations = eligibilityBuilderFieldPresentations(
    fields,
    executionMode,
  );
  const selectedQuestionKey = selectedQuestion
    ? questionFieldKey(selectedQuestion)
    : "";
  const selectedField = fieldPresentations.find((field) =>
    field.key === selectedQuestionKey
  )?.builderField ?? (selectedQuestion
    ? {
        key: selectedQuestionKey,
        label: `${selectedQuestion.reviewerLabel} [Applicant / Screening Answer]`,
        type: questionConditionType(selectedQuestion.inputType),
      }
    : null);
  const conditionFields = [
    ...(selectedField ? [selectedField] : []),
    ...fieldPresentations
      .filter((field) => !questionKeys.has(field.key))
      .map((field) => field.builderField),
  ];
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
            label="Rule Code"
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
        <FormSelect
          items={questions.map((question) => ({
            label: `${question.applicantLabel}`,
            value: question.id,
          }))}
          label="Eligibility question"
          name="questionId"
          onChange={(event) => {
            form.setValue("questionId", event.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            });
            const question = questions.find((item) =>
              item.id === event.target.value
            );
            if (!question) return;
            form.setValue(
              "condition",
              replaceQuestionFields(
                form.getValues("condition") as ConditionGroup,
                questionKeys,
                questionFieldKey(question),
              ),
              { shouldDirty: true, shouldValidate: true },
            );
          }}
          placeholder={questions.length
            ? "Select a question"
            : "Create an eligibility question first"}
          required
        />
        <FormInput
          label="Message shown when this rule is not met"
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
                fields={conditionFields}
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
