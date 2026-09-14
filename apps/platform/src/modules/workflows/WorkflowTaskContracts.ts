import type { TaskTypeCode, WorkflowActionCode } from "./WorkflowTypes";

export type WorkflowTaskContract = {
  allowedActions: readonly WorkflowActionCode[];
  handlerKey: string;
  rendererKey: string;
  requiredCapabilities: readonly string[];
};

export const workflowTaskContracts = {
  AUTOMATED_RULE_CHECK: {
    allowedActions: ["COMPLETE", "OVERRIDE"],
    handlerKey: "evaluate-versioned-rules",
    rendererKey: "automated-rule-check",
    requiredCapabilities: ["workflow.task.complete"],
  },
  CHECKLIST: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "complete-checklist",
    rendererKey: "checklist",
    requiredCapabilities: ["workflow.task.complete", "application.screen"],
  },
  DOCUMENT_REVIEW: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "record-document-review",
    rendererKey: "document-review",
    requiredCapabilities: ["workflow.task.complete", "application.screen"],
  },
  STRUCTURED_FORM: {
    allowedActions: ["SAVE", "COMPLETE"],
    handlerKey: "save-structured-form",
    rendererKey: "structured-form",
    requiredCapabilities: ["workflow.task.complete"],
  },
  ASSESSMENT_FORM: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "score-assessment",
    rendererKey: "assessment-form",
    requiredCapabilities: ["workflow.task.complete", "application.assess"],
  },
  FINANCE_REVIEW: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "complete-finance-review",
    rendererKey: "finance-review",
    requiredCapabilities: [
      "workflow.task.complete",
      "application.finance_review",
    ],
  },
  INFORMATION_REQUEST: {
    allowedActions: ["REQUEST_INFORMATION", "ACCEPT_INFORMATION", "CANCEL"],
    handlerKey: "manage-information-request",
    rendererKey: "information-request",
    requiredCapabilities: ["application.request_information"],
  },
  RECOMMENDATION: {
    allowedActions: ["SAVE", "RECOMMEND_PROCEED", "RECOMMEND_REJECT", "RETURN"],
    handlerKey: "record-recommendation",
    rendererKey: "recommendation",
    requiredCapabilities: ["application.recommend"],
  },
  DECISION: {
    allowedActions: ["APPROVE", "DECLINE", "RETURN", "OVERRIDE"],
    handlerKey: "record-decision",
    rendererKey: "decision",
    requiredCapabilities: ["application.decide"],
  },
  COMMUNICATION: {
    allowedActions: ["SAVE", "COMPLETE", "CANCEL"],
    handlerKey: "enqueue-communication",
    rendererKey: "communication",
    requiredCapabilities: ["communication.send"],
  },
} satisfies Record<TaskTypeCode, WorkflowTaskContract>;
