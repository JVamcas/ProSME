import type { WorkflowTransitionInput } from "./WorkflowTypes";

const stageTransitions = [
  ["PRE_SCREENING", "COMPLETENESS", "workflow.task.complete"],
  ["COMPLETENESS", "TECHNICAL_ASSESSMENT", "application.screen"],
  ["TECHNICAL_ASSESSMENT", "FINANCE_REVIEW", "application.assess"],
  ["FINANCE_REVIEW", "COMMITTEE_DECISION", "application.finance_review"],
  ["COMMITTEE_DECISION", "OUTCOME_COMMUNICATION", "application.decide"],
] as const;

export const referenceWorkflowTransitions: WorkflowTransitionInput[] = [
  ...stageTransitions.map(
    ([fromStageCode, toStageCode, requiredCapability]) => ({
      fromStageCode,
      actionCode: "COMPLETE" as const,
      toStageCode,
      requiredCapability,
    }),
  ),
  {
    fromStageCode: "OUTCOME_COMMUNICATION",
    actionCode: "COMPLETE",
    terminalOutcome: "CLOSED",
    requiredCapability: "communication.send",
  },
];
