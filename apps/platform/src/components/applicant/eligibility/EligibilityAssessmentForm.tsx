"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { ClientRequestError } from "@/lib/client-http";
import { eligibilityAssessmentSchema } from "@/modules/eligibility/EligibilitySchemas";
import { useCreateEligibilityAssessment } from "@/modules/eligibility/EligibilityHooks";
import type {
  EligibilityAssessmentInput,
  EligibilityAssessmentView,
  EligibilityWorkspace,
} from "@/modules/eligibility/EligibilityTypes";
import {
  EligibilityActions,
  EligibilityError,
  EligibilityQuestion,
  EligibilityStage,
} from "./EligibilityAssessmentContent";

type EligibilityAssessmentFormProps = {
  onComplete: (assessment: EligibilityAssessmentView) => void;
  onRefresh: () => void;
  workspace: EligibilityWorkspace;
};

function assessmentDefaults(workspace: EligibilityWorkspace) {
  return {
    answers: {},
    expectedRuleSetVersion: workspace.ruleSetVersion,
    fundingOpportunityId: workspace.fundingOpportunity.id,
  };
}

function isConflict(error: Error | null) {
  return error instanceof ClientRequestError && error.code === "CONFLICT";
}

export function EligibilityAssessmentForm(
  props: EligibilityAssessmentFormProps,
) {
  const { onComplete, onRefresh, workspace } = props;
  const [index, setIndex] = useState(0);
  const mutation = useCreateEligibilityAssessment();
  const form = useForm<EligibilityAssessmentInput>({
    defaultValues: assessmentDefaults(workspace),
    resolver: zodResolver(eligibilityAssessmentSchema),
  });
  const rule = workspace.rules[index];
  const answer = useWatch({
    control: form.control,
    name: `answers.${rule.id}`,
  });
  const lastQuestion = index === workspace.rules.length - 1;

  async function submit(input: EligibilityAssessmentInput) {
    const assessment = await mutation.mutateAsync(input);
    onComplete(assessment);
  }

  function next() {
    if (!answer) return;
    if (lastQuestion) {
      void form.handleSubmit(submit)();
      return;
    }
    setIndex((current) => current + 1);
  }

  const conflict = isConflict(mutation.error);
  return (
    <FormProvider {...form}>
      <form className="mt-8" onSubmit={form.handleSubmit(submit)}>
        <EligibilityStage current={index + 1} total={workspace.rules.length} />
        <EligibilityQuestion
          answer={answer}
          current={index + 1}
          form={form}
          rule={rule}
          total={workspace.rules.length}
        />
        <EligibilityError
          conflict={conflict}
          error={mutation.error}
          onRefresh={onRefresh}
        />
        <EligibilityActions
          answer={answer}
          current={index}
          lastQuestion={lastQuestion}
          onNext={next}
          onPrevious={() => setIndex((current) => current - 1)}
          pending={mutation.isPending}
        />
      </form>
    </FormProvider>
  );
}
