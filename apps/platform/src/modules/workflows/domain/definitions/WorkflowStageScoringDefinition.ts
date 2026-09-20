export const workflowScoringAggregations = [
  "WEIGHTED_AVERAGE",
  "WEIGHTED_SUM",
  "AVERAGE",
  "SUM",
] as const;

export type WorkflowScoringAggregation =
  (typeof workflowScoringAggregations)[number];

export type WorkflowStageScoringCriterion = {
  id?: string;
  criterion: string;
  description: string;
  weight: number;
  scaleMinimum: number;
  scaleMaximum: number;
  threshold: number;
  mandatoryComment: boolean;
};

export type WorkflowStageScoringDefinition = {
  aggregation: WorkflowScoringAggregation;
  criteria: WorkflowStageScoringCriterion[];
};
