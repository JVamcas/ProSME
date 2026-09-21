"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type {
  PublicEligibilityAnswer,
  PublicEligibilityQuestion,
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckWorkspace,
} from "../../api/PublicEligibilitySelfCheckTransport";

const formSchema = z.object({
  answers: z.record(z.string(), z.string().trim().min(1, "Answer this question.")),
});

type FormValues = z.infer<typeof formSchema>;

function defaults(questions: PublicEligibilityQuestion[]): FormValues {
  return {
    answers: Object.fromEntries(questions.map((question) => [question.id, ""])),
  };
}

function answerValue(question: PublicEligibilityQuestion, value: string) {
  if (question.type === "boolean") return value === "yes";
  if (question.type === "number") return Number(value);
  return value;
}

function transportInput(
  workspace: PublicEligibilitySelfCheckWorkspace,
  values: FormValues,
): PublicEligibilitySelfCheckInput {
  const answers: Record<string, PublicEligibilityAnswer> = {};
  workspace.questions.forEach((question) => {
    answers[question.id] = answerValue(
      question,
      values.answers[question.id],
    );
  });
  return {
    answers,
    configurationToken: workspace.configurationToken,
  };
}

function QuestionField({ question }: { question: PublicEligibilityQuestion }) {
  const name = `answers.${question.id}`;
  if (question.type === "boolean") {
    return (
      <FormSelect
        items={[
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ]}
        label={question.label}
        name={name}
        placeholder="Select an answer"
        required
      />
    );
  }
  return (
    <FormInput
      label={question.label}
      name={name}
      required
      step={question.type === "number" ? "any" : undefined}
      type={question.type}
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
  const form = useForm<FormValues>({
    defaultValues: defaults(workspace.questions),
    resolver: zodResolver(formSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    await onSubmit(transportInput(workspace, values));
  });
  return (
    <FormProvider {...form}>
      <form
        className="rounded-2xl border border-brand-navy/15 bg-white p-6 shadow-sm sm:p-8"
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
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {workspace.questions.map((question) => (
            <QuestionField key={question.id} question={question} />
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
