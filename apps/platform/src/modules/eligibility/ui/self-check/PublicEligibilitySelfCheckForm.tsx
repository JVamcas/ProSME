"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ChevronRight, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-controls";
import { FormInput } from "@/components/ui/form-fields";
import type {
  PublicEligibilityAnswer,
  PublicEligibilityQuestion,
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckWorkspace,
} from "../../api/PublicEligibilitySelfCheckTransport";

type FormAnswer = string | string[];
type FormValues = { answers: Record<string, FormAnswer> };

function defaults(questions: PublicEligibilityQuestion[]): FormValues {
  return {
    answers: Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.type === "multi-select" ? [] : "",
      ]),
    ),
  };
}

function formSchema(questions: PublicEligibilityQuestion[]) {
  return z
    .object({
      answers: z.record(
        z.string(),
        z.union([z.string(), z.array(z.string())]),
      ),
    })
    .superRefine((values, context) => {
      questions.forEach((question) => {
        const value = values.answers[question.id];
        const empty = value === "" || (Array.isArray(value) && !value.length);
        if (question.required && empty) {
          context.addIssue({
            code: "custom",
            message: "Choose or enter an answer to continue.",
            path: ["answers", question.id],
          });
        }
      });
    });
}

function answerValue(
  question: PublicEligibilityQuestion,
  value: FormAnswer,
): PublicEligibilityAnswer {
  if (question.type === "boolean") return value === "true";
  if (question.type === "number" || question.type === "percentage") {
    return Number(value);
  }
  return value;
}

function transportInput(
  workspace: PublicEligibilitySelfCheckWorkspace,
  values: FormValues,
): PublicEligibilitySelfCheckInput {
  const answers: Record<string, PublicEligibilityAnswer> = {};
  workspace.questions.forEach((question) => {
    const value = values.answers[question.id];
    const empty = value === "" || (Array.isArray(value) && !value.length);
    if (!question.required && empty) return;
    answers[question.id] = answerValue(question, value);
  });
  return {
    answers,
    configurationToken: workspace.configurationToken,
  };
}

function choiceOptions(question: PublicEligibilityQuestion) {
  if (question.type === "boolean") {
    return [
      {
        description: "This applies to my business",
        label: "Yes",
        value: "true",
      },
      {
        description: "Not yet or not applicable",
        label: "No",
        value: "false",
      },
    ];
  }
  return question.options;
}

function ChoiceQuestion({ question }: { question: PublicEligibilityQuestion }) {
  const { formState, getValues, register } = useFormContext<FormValues>();
  const error = formState.errors.answers?.[question.id]?.message;
  const errorId = error ? `${question.id}-error` : undefined;
  const multiple = question.type === "multi-select";
  const registration = register(`answers.${question.id}`);

  return (
    <fieldset
      aria-describedby={errorId}
      aria-invalid={error ? true : undefined}
      className="min-w-0"
    >
      <legend className="sr-only">
        {question.label}
        {question.required ? " (required)" : ""}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {choiceOptions(question).map((option, index) => {
          const selectedValue = getValues(`answers.${question.id}`);
          const selected = Array.isArray(selectedValue)
            ? selectedValue.includes(option.value)
            : selectedValue === option.value;
          const ChoiceIcon = index === 0 ? Check : X;
          return (
            <label
              className="group flex min-h-28 cursor-pointer items-center gap-5 rounded-2xl border-2 border-brand-navy/10 bg-white px-6 py-5 transition hover:border-brand-orange/45 has-checked:border-brand-orange has-checked:bg-brand-orange/[0.035] focus-within:ring-2 focus-within:ring-brand-navy focus-within:ring-offset-2"
              key={option.value}
            >
              <input
                className="peer sr-only"
                type={multiple ? "checkbox" : "radio"}
                value={option.value}
                {...registration}
              />
              <span
                className={[
                  "grid size-12 shrink-0 place-items-center rounded-full",
                  index === 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-600",
                  selected ? "ring-2 ring-current ring-offset-2" : "",
                ].join(" ")}
              >
                <ChoiceIcon className="size-6" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-bold text-brand-navy">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-1 block text-sm leading-5 text-brand-navy/65">
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

function QuestionField({ question }: { question: PublicEligibilityQuestion }) {
  if (
    question.type === "boolean" ||
    question.type === "yes-no-na" ||
    question.type === "single-select" ||
    question.type === "multi-select"
  ) {
    return <ChoiceQuestion question={question} />;
  }
  return (
    <FormInput
      className="h-14 rounded-xl border-brand-navy/20 px-4 text-base"
      inputMode={
        question.type === "number" || question.type === "percentage"
          ? "decimal"
          : undefined
      }
      label={<span className="sr-only">{question.label}</span>}
      max={question.type === "percentage" ? 100 : undefined}
      min={question.type === "percentage" ? 0 : undefined}
      name={`answers.${question.id}`}
      required={question.required}
      step={
        question.type === "number" || question.type === "percentage"
          ? "any"
          : undefined
      }
      type={question.type === "percentage" ? "number" : question.type}
    />
  );
}

export function PublicEligibilitySelfCheckForm({
  error,
  onSubmit,
  pending,
  workspace,
}: {
  error: Error | null;
  onSubmit: (input: PublicEligibilitySelfCheckInput) => Promise<void>;
  pending: boolean;
  workspace: PublicEligibilitySelfCheckWorkspace;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const form = useForm<FormValues>({
    defaultValues: defaults(workspace.questions),
    resolver: zodResolver(formSchema(workspace.questions)),
  });
  const question = workspace.questions[questionIndex];
  const total = workspace.questions.length;
  const progress = Math.round((questionIndex / total) * 100);
  const isLastQuestion = questionIndex === total - 1;

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(transportInput(workspace, values));
  });

  async function continueFromCurrentQuestion() {
    const valid = await form.trigger(`answers.${question.id}`);
    if (!valid) return;
    if (isLastQuestion) {
      await submit();
      return;
    }
    setQuestionIndex((current) => current + 1);
  }

  return (
    <FormProvider {...form}>
      <form
        className="overflow-hidden rounded-3xl border border-brand-navy/10 bg-white shadow-[0_22px_55px_rgba(10,24,59,0.08)]"
        onSubmit={submit}
      >
        <header className="border-b border-brand-navy/10 px-6 py-6 sm:px-11">
          <div className="flex items-center justify-between gap-4 text-sm font-bold text-brand-navy">
            <p aria-live="polite">
              Question {questionIndex} of {total}
            </p>
            <p className="text-brand-navy/45">{progress}% complete</p>
          </div>
          <div
            aria-label={`${progress}% complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-brand-orange transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="min-h-[455px] px-6 py-10 sm:px-12 sm:py-12">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-orange">
            {question.section?.label ?? "Initial eligibility"}
          </p>
          <h2 className="display mt-5 max-w-4xl text-3xl font-bold leading-tight text-brand-navy sm:text-[2.5rem]">
            {question.label}
            {question.required ? <span className="sr-only"> (required)</span> : null}
          </h2>
          <div className="mt-10">
            <QuestionField question={question} />
          </div>

          <div className="mt-7 flex justify-end">
            <GeneralButton
              disabled={pending}
              onClick={() => void continueFromCurrentQuestion()}
              type="button"
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              {isLastQuestion ? "Check eligibility" : "Continue"}
              {!pending ? <ChevronRight className="size-4" aria-hidden /> : null}
            </GeneralButton>
          </div>

          {error ? (
            <p className="mt-6 text-sm font-semibold text-red-700" role="alert">
              {error.message}
            </p>
          ) : null}
        </section>

        <footer className="flex min-h-20 items-center justify-between gap-4 border-t border-brand-navy/10 bg-slate-50/70 px-6 sm:px-12">
          <button
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-navy/55 transition hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-45"
            disabled={questionIndex === 0 || pending}
            onClick={() =>
              setQuestionIndex((current) => Math.max(0, current - 1))
            }
            type="button"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Previous
          </button>
          <p className="text-right text-sm font-medium text-brand-navy/45">
            Your answers stay on this device
          </p>
        </footer>
      </form>
    </FormProvider>
  );
}
