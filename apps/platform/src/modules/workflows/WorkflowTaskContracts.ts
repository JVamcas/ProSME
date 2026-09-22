import { permissionCodes, type PermissionCode } from "@/auth/authorization/permissions";
import type { TaskTypeCode, WorkflowActionCode } from "@/modules/workflows/domain/definitions/WorkflowTypes";

export type WorkflowTaskContract = {
  allowedActions: readonly WorkflowActionCode[];
  handlerKey: string;
  rendererKey: string;
  requiredCapabilities: readonly PermissionCode[];
};

export const workflowTaskContracts = {
  AUTOMATED_RULE_CHECK: {
    allowedActions: ["COMPLETE", "OVERRIDE"],
    handlerKey: "evaluate-versioned-rules",
    rendererKey: "automated-rule-check",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
  CHECKLIST: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "complete-checklist",
    rendererKey: "checklist",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
  DOCUMENT_REVIEW: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "record-document-review",
    rendererKey: "document-review",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
  STRUCTURED_FORM: {
    allowedActions: ["SAVE", "COMPLETE"],
    handlerKey: "save-structured-form",
    rendererKey: "structured-form",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
  ASSESSMENT_FORM: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "score-assessment",
    rendererKey: "assessment-form",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
  FINANCE_REVIEW: {
    allowedActions: ["SAVE", "COMPLETE", "REQUEST_INFORMATION"],
    handlerKey: "complete-finance-review",
    rendererKey: "finance-review",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
  INFORMATION_REQUEST: {
    allowedActions: ["REQUEST_INFORMATION", "ACCEPT_INFORMATION", "CANCEL"],
    handlerKey: "manage-information-request",
    rendererKey: "information-request",
    requiredCapabilities: [
      permissionCodes.fundingApplicationInformationRequestCreate,
    ],
  },
  RECOMMENDATION: {
    allowedActions: ["SAVE", "RECOMMEND_PROCEED", "RECOMMEND_REJECT", "RETURN"],
    handlerKey: "record-recommendation",
    rendererKey: "recommendation",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedDecide],
  },
  DECISION: {
    allowedActions: ["APPROVE", "DECLINE", "RETURN", "OVERRIDE"],
    handlerKey: "record-decision",
    rendererKey: "decision",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedDecide],
  },
  COMMUNICATION: {
    allowedActions: ["SAVE", "COMPLETE", "CANCEL"],
    handlerKey: "enqueue-communication",
    rendererKey: "communication",
    requiredCapabilities: [permissionCodes.workflowTaskAssignedProcess],
  },
} satisfies Record<TaskTypeCode, WorkflowTaskContract>;
