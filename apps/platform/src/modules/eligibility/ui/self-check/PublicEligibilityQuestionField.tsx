"use client";

import { Check } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { FormInput } from "@/components/ui/form-fields";
import { FieldError } from "@/shared/ui/FormPrimitives";
import type { PublicEligibilityQuestion } from "../../api/PublicEligibilitySelfCheckTransport";
import type { FormValues } from "./PublicEligibilitySelfCheckValues";

function choiceOptions(question: PublicEligibilityQuestion) {
  if (question.type !== "boolean") return question.options;
  return [
    { description: "This applies to my business", label: "Yes", value: "true" },
    { description: "Not yet or not applicable", label: "No", value: "false" },
  ];
}

function ChoiceQuestion({ question }: { question: PublicEligibilityQuestion }) {
  const { control, formState, register } = useFormContext<FormValues>();
  const selectedValue = useWatch({ control, name: `answers.${question.id}` });
  const error = formState.errors.answers?.[question.id]?.message;
  const errorId = error ? `${question.id}-error` : undefined;
  const multiple = question.type === "multi-select";
  return (
    <fieldset
      aria-describedby={errorId}
      aria-invalid={error ? true : undefined}
    >
      <legend className="sr-only">
        {question.label}
        {question.required ? " (required)" : ""}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {choiceOptions(question).map((option) => {
          const selected = Array.isArray(selectedValue)
            ? selectedValue.includes(option.value)
            : selectedValue === option.value;
          return (
            <label
              className="flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border border-brand-blue/30 bg-white p-5 transition has-checked:border-brand-orange has-checked:bg-brand-orange/5 hover:border-brand-orange/50 focus-within:ring-2 focus-within:ring-brand-navy focus-within:ring-offset-2"
              key={option.value}
            >
              <input
                className="sr-only"
                type={multiple ? "checkbox" : "radio"}
                value={option.value}
                {...register(`answers.${question.id}`)}
              />
              <span
                aria-hidden
                className={`mt-0.5 grid size-5 shrink-0 place-items-center border ${multiple ? "rounded" : "rounded-full"} ${selected ? "border-brand-orange bg-brand-orange text-white" : "border-brand-blue/70 bg-white"}`}
              >
                {selected ? <Check className="size-3" /> : null}
              </span>
              <span>
                <span className="block text-lg font-bold text-brand-navy">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-2 block text-sm leading-6 text-brand-navy/65">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

export function PublicEligibilityQuestionField({
  question,
}: {
  question: PublicEligibilityQuestion;
}) {
  if (
    ["boolean", "yes-no-na", "single-select", "multi-select"].includes(
      question.type,
    )
  ) {
    return <ChoiceQuestion key={question.id} question={question} />;
  }
  const numeric = question.type === "number" || question.type === "percentage";
  return (
    <FormInput
      className="h-14 rounded-xl border-brand-blue/30 px-4 text-base"
      inputMode={numeric ? "decimal" : undefined}
      label={<span className="sr-only">{question.label}</span>}
      max={question.type === "percentage" ? 100 : undefined}
      min={question.type === "percentage" ? 0 : undefined}
      name={`answers.${question.id}`}
      required={question.required}
      step={numeric ? "any" : undefined}
      type={question.type === "percentage" ? "number" : question.type}
    />
  );
}
