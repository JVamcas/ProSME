import { permissionCodes } from "@/auth/authorization/permissions";
import type { TaskTypeCode } from "@/modules/workflows/domain/definitions/WorkflowTypes";

const defaults: Record<TaskTypeCode, unknown> = {
  AUTOMATED_RULE_CHECK: {
    rulesetCode: "RULESET_CODE",
    ruleVersion: 1,
    inputs: ["application"],
    categories: [{ code: "PASS", label: "Pass" }],
  },
  CHECKLIST: {
    items: [{ code: "ITEM_1", label: "Checklist item", required: true }],
  },
  DOCUMENT_REVIEW: {
    categories: [{ code: "GENERAL", label: "General documents" }],
    outcomes: [{ code: "ACCEPT", label: "Accept" }],
  },
  STRUCTURED_FORM: {
    fields: [
      {
        code: "NOTES",
        label: "Notes",
        required: false,
        type: "textarea",
      },
    ],
  },
  ASSESSMENT_FORM: {
    criteria: [
      {
        code: "CRITERION_1",
        commentRequired: false,
        label: "Assessment criterion",
        maximumScore: 10,
        weight: 1,
      },
    ],
  },
  FINANCE_REVIEW: {
    fields: [
      {
        code: "NOTES",
        label: "Finance notes",
        required: true,
        type: "textarea",
      },
    ],
    recommendations: [{ code: "PROCEED", label: "Proceed" }],
  },
  INFORMATION_REQUEST: {
    categories: [{ code: "GENERAL", label: "General information" }],
    responseRequired: true,
    templateReference: "INFORMATION_REQUEST",
  },
  RECOMMENDATION: {
    options: [{ code: "PROCEED", label: "Proceed" }],
    rationaleRequired: true,
  },
  DECISION: {
    authorityCapability: permissionCodes.workflowTaskAssignedDecide,
    outcomes: [{ code: "APPROVE", label: "Approve" }],
    rationaleRequired: true,
  },
  COMMUNICATION: {
    audience: "APPLICANT",
    channel: "EMAIL",
    template: "TEMPLATE_REFERENCE",
    trigger: "TASK_COMPLETED",
  },
};

export function defaultTaskConfiguration(type: TaskTypeCode) {
  return structuredClone(defaults[type]);
}

export function formatTaskConfiguration(config: unknown) {
  return JSON.stringify(config, null, 2);
}
