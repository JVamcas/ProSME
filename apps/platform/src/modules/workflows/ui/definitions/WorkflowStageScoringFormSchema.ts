import { z } from "zod";

import { workflowScoringAggregations } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";

export const scoringAggregationItems = [
  { label: "Weighted average", value: "WEIGHTED_AVERAGE" },
  { label: "Weighted sum", value: "WEIGHTED_SUM" },
  { label: "Average", value: "AVERAGE" },
  { label: "Sum", value: "SUM" },
] as const;

export const workflowStageAggregationFormSchema = z.object({
  aggregation: z.enum(workflowScoringAggregations),
});

export const workflowStageScoringCriterionFormSchema = z.object({
  criterion: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000),
  weight: z.number().positive().max(100),
  scaleMinimum: z.number().min(0).max(1000),
  scaleMaximum: z.number().positive().max(1000),
  threshold: z.number().min(0).max(1000),
  mandatoryComment: z.boolean(),
}).superRefine((criterion, context) => {
  if (criterion.scaleMaximum <= criterion.scaleMinimum) {
    context.addIssue({
      code: "custom",
      message: "Scale maximum must be greater than scale minimum.",
      path: ["scaleMaximum"],
    });
  }
  if (
    criterion.threshold < criterion.scaleMinimum
    || criterion.threshold > criterion.scaleMaximum
  ) {
    context.addIssue({
      code: "custom",
      message: "Threshold must fall within the configured scale.",
      path: ["threshold"],
    });
  }
});

export type WorkflowStageAggregationFormValues = z.infer<
  typeof workflowStageAggregationFormSchema
>;

export type WorkflowStageScoringCriterionFormValues = z.infer<
  typeof workflowStageScoringCriterionFormSchema
>;
