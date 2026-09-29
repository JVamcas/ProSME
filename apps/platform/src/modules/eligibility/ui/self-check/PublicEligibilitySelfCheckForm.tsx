"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import type {
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckWorkspace,
} from "../../api/PublicEligibilitySelfCheckTransport";
import { PublicEligibilityQuestionField } from "./PublicEligibilityQuestionField";
import {
  defaults,
  formSchema,
  transportInput,
  type FormValues,
} from "./PublicEligibilitySelfCheckValues";

export function PublicEligibilitySelfCheckForm({
  backHref,
  error,
  onSubmit,
  pending,
  workspace,
}: {
  backHref?: string;
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
  const progress = Math.round(((questionIndex + 1) / total) * 100);
  const isLastQuestion = questionIndex === total - 1;

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(transportInput(workspace, values));
  });

  async function continueFromCurrentQuestion() {
    if (pending) return;
    const valid = await form.trigger(`answers.${question.id}`);
    if (!valid) return;
    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    try {
      await submit();
    } catch {
      // Mutation errors are displayed below and leave the answers available to retry.
    }
  }

  return (
    <FormProvider {...form}>
      <form
        className="rounded-xl border border-brand-blue/25 bg-white p-5 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          void continueFromCurrentQuestion();
        }}
      >
        <div>
          <p
            aria-live="polite"
            className="text-xs font-bold uppercase tracking-widest text-brand-orange"
          >
            Question {questionIndex + 1} of {total}
          </p>
          <div
            aria-label="Eligibility questions"
            aria-valuemax={total}
            aria-valuemin={0}
            aria-valuenow={questionIndex + 1}
            aria-valuetext={`Question ${questionIndex + 1} of ${total}`}
            className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-brand-orange transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <section
          className="py-7 sm:py-8"
          aria-labelledby="eligibility-question-heading"
        >
          {question.section ? (
            <p className="mb-3 text-xs font-semibold text-brand-navy/60">
              {question.section.label}
            </p>
          ) : null}
          <h2
            className="text-2xl font-bold leading-tight text-brand-navy sm:text-3xl"
            id="eligibility-question-heading"
          >
            {question.label}
            {question.required ? (
              <span className="sr-only"> (required)</span>
            ) : null}
          </h2>
          <p className="mt-3 text-sm text-brand-navy/65">
            {question.helpText ||
              "Choose the answer that applies to your business."}
          </p>
          {question.explanation ? (
            <p className="mt-2 text-sm text-brand-navy/65">
              {question.explanation}
            </p>
          ) : null}
          <div className="mt-6">
            <PublicEligibilityQuestionField question={question} />
          </div>
          {error ? (
            <p className="mt-5 text-sm font-semibold text-red-700" role="alert">
              {error.message}
            </p>
          ) : null}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-blue/20 pt-5">
          {questionIndex === 0 && backHref ? (
            <GeneralButtonLink
              className="min-h-11 rounded-lg"
              href={backHref}
              variant="outline"
            >
              <ArrowLeft aria-hidden className="size-4" /> Back
            </GeneralButtonLink>
          ) : (
            <GeneralButton
              className="min-h-11 rounded-lg"
              disabled={questionIndex === 0 || pending}
              onClick={() =>
                setQuestionIndex((current) => Math.max(0, current - 1))
              }
              variant="outline"
            >
              <ArrowLeft aria-hidden className="size-4" /> Back
            </GeneralButton>
          )}
          <GeneralButton
            className="min-h-11 rounded-lg"
            disabled={pending}
            type="submit"
          >
            {pending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : null}
            {isLastQuestion ? "Check eligibility" : "Continue"}
            {!pending ? <ArrowRight aria-hidden className="size-4" /> : null}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
