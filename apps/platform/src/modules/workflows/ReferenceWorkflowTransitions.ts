import type { WorkflowTransitionInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

const stageTransitions = [
  ["PRE_SCREENING", "COMPLETENESS"],
  ["COMPLETENESS", "TECHNICAL_ASSESSMENT"],
  ["TECHNICAL_ASSESSMENT", "FINANCE_REVIEW"],
  ["FINANCE_REVIEW", "COMMITTEE_DECISION"],
  ["COMMITTEE_DECISION", "OUTCOME_COMMUNICATION"],
] as const;

export const referenceWorkflowTransitions: WorkflowTransitionInput[] = [
  ...stageTransitions.map(
    ([sourceStageKey, targetStageKey]) => ({
      sourceStageKey,
      actionKey: "ADVANCE",
      targetStageKey,
      priority: 1,
    }),
  ),
  {
    sourceStageKey: "OUTCOME_COMMUNICATION",
    actionKey: "COMPLETE",
    terminalOutcome: "CLOSED",
    priority: 1,
  },
];
