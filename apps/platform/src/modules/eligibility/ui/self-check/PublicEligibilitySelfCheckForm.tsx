"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import {
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
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
    answers: Object.fromEntries(questions.map((question) => [
      question.id,
      question.type === "multi-select" ? [] : "",
    ])),
  };
}

function formSchema(questions: PublicEligibilityQuestion[]) {
  return z.object({
    answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  }).superRefine((values, context) => {
    questions.forEach((question) => {
      const value = values.answers[question.id];
      const empty = value === "" || (Array.isArray(value) && !value.length);
      if (question.required && empty) {
        context.addIssue({
          code: "custom",
          message: "Answer this question.",
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

function questionHelp(question: PublicEligibilityQuestion) {
  const content = [question.helpText, question.explanation].filter(Boolean);
  if (!content.length) return null;
  return (
    <div
      className="mt-2 space-y-1 text-sm leading-5 text-brand-navy/65"
      id={`${question.id}-help`}
    >
      {content.map((text) => <p key={text}>{text}</p>)}
    </div>
  );
}

function choiceOptions(question: PublicEligibilityQuestion) {
  if (question.type === "boolean") {
    return [
      { description: "", label: "Yes", value: "true" },
      { description: "", label: "No", value: "false" },
    ];
  }
  return question.options;
}

function ChoiceQuestion({ question }: { question: PublicEligibilityQuestion }) {
  const { formState, register } = useFormContext<FormValues>();
  const error = formState.errors.answers?.[question.id]?.message;
  const errorId = error ? `${question.id}-error` : undefined;
  const helpId = question.helpText || question.explanation
    ? `${question.id}-help`
    : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const multiple = question.type === "multi-select";
  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className="min-w-0"
    >
      <legend className="text-sm font-semibold text-brand-navy">
        {question.label}
        {question.required ? (
          <>
            <span aria-hidden className="ml-1 text-brand-orange">*</span>
            <span className="sr-only">(required)</span>
          </>
        ) : null}
      </legend>
      {questionHelp(question)}
      <div className="mt-3 grid gap-2">
        {choiceOptions(question).map((option) => (
          <label
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-brand-navy/15 px-4 py-3 text-sm text-brand-navy has-checked:border-brand-orange has-checked:bg-brand-orange/5"
            key={option.value}
          >
            <input
              className="mt-0.5 size-4 shrink-0 accent-brand-orange"
              type={multiple ? "checkbox" : "radio"}
              value={option.value}
              {...register(`answers.${question.id}`)}
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-brand-navy/60">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

function QuestionField({ question }: { question: PublicEligibilityQuestion }) {
  if (
    question.type === "boolean"
    || question.type === "yes-no-na"
    || question.type === "single-select"
    || question.type === "multi-select"
  ) {
    return <ChoiceQuestion question={question} />;
  }
  const helpId = question.helpText || question.explanation
    ? `${question.id}-help`
    : undefined;
  return (
    <div>
      <FormInput
        aria-describedby={helpId}
        inputMode={
          question.type === "number" || question.type === "percentage"
            ? "decimal"
            : undefined
        }
        label={question.label}
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
      {questionHelp(question)}
    </div>
  );
}

type QuestionSection = {
  key: string;
  label: string | null;
  questions: PublicEligibilityQuestion[];
};

function sections(questions: PublicEligibilityQuestion[]): QuestionSection[] {
  const result: QuestionSection[] = [];
  questions.forEach((question) => {
    const key = question.section?.key ?? "general";
    const current = result.at(-1);
    if (current?.key === key) {
      current.questions.push(question);
      return;
    }
    result.push({
      key,
      label: question.section?.label ?? null,
      questions: [question],
    });
  });
  return result;
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
  const form = useForm<FormValues>({
    defaultValues: defaults(workspace.questions),
    resolver: zodResolver(formSchema(workspace.questions)),
  });
  const questionSections = sections(workspace.questions);
  const submit = form.handleSubmit(async (values) => {
    await onSubmit(transportInput(workspace, values));
  });
  return (
    <FormProvider {...form}>
      <form
        className="rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={submit}
      >
        <div className="flex gap-3 rounded-xl bg-brand-cream p-4">
          <ShieldCheck className="size-6 shrink-0 text-brand-orange" aria-hidden />
          <div>
            <p className="font-bold text-brand-navy">Private and advisory</p>
            <p className="mt-1 text-sm leading-6 text-brand-navy/70">
              Your answers are evaluated for guidance only and are not saved as
              an authoritative eligibility assessment.
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm text-brand-navy/65" aria-live="polite">
          {workspace.questions.length} eligibility questions
        </p>
        <div className="mt-6 space-y-8">
          {questionSections.map((section, sectionIndex) => (
            <section
              aria-labelledby={section.label ? `section-${sectionIndex}` : undefined}
              className="space-y-5"
              key={`${section.key}-${sectionIndex}`}
            >
              {section.label ? (
                <header className="border-b border-brand-navy/10 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                    Section {sectionIndex + 1} of {questionSections.length}
                  </p>
                  <h2
                    className="mt-1 text-xl font-bold text-brand-navy"
                    id={`section-${sectionIndex}`}
                  >
                    {section.label}
                  </h2>
                </header>
              ) : null}
              <div className="grid gap-6 sm:grid-cols-2">
                {section.questions.map((question) => (
                  <div className="min-w-0" key={question.id}>
                    <p className="mb-2 text-xs text-brand-navy/55">
                      Question {question.progress.current} of{" "}
                      {question.progress.total}
                    </p>
                    <QuestionField question={question} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        {error ? (
          <p className="mt-5 text-sm font-semibold text-red-700" role="alert">
            {error.message}
          </p>
        ) : null}
        <div className="mt-7 flex justify-end border-t border-brand-navy/10 pt-5">
          <GeneralButton disabled={pending} type="submit">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : null}
            Check eligibility
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
