import { defaultWorkflowElementPermissions } from "../definitions/WorkflowElementPermissions";
import { standardFormPurpose } from "@/modules/forms/domain/FormPurpose";
import type { WorkflowActionDefinition } from "../actions/WorkflowActionDefinition";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "../definitions/WorkflowTypes";
import type { WorkflowStageDocumentRequirement } from "../definitions/WorkflowStageDocumentRequirement";
import type { WorkflowStageChecklistDefinition } from "../definitions/WorkflowStageChecklistDefinition";
import type {
  StandardWorkflowDependencies,
  StandardWorkflowFormCode,
  StandardWorkflowRoleCode,
} from "./StandardWorkflowTypes";

export function action(
  stableKey: string,
  label: string,
  actionType: WorkflowActionDefinition["actionType"],
  displayOrder: number,
  configuration: WorkflowActionDefinition["configuration"],
  reasonCodeRequired = false,
): WorkflowActionDefinition {
  return {
    actionType,
    configuration,
    displayOrder,
    enabled: true,
    label,
    reasonCodeRequired,
    stableKey,
  } as WorkflowActionDefinition;
}

export function approve(key: string, label: string, order: number) {
  return action(key, label, "APPROVE_ADVANCE", order, {});
}

export function reject(
  key: string,
  label: string,
  order: number,
  reasonCodes: string[],
  outcomeType: "TERMINAL" | "TRANSITION" = "TERMINAL",
) {
  return action(
    key,
    label,
    "REJECT",
    order,
    {
      commentRequired: true,
      outcome: outcomeType === "TERMINAL"
        ? {
            cancelOpenStageInstances: true,
            cancelOpenTasks: true,
            publicStatusMapping: {
              description: "A decision is available for your application.",
              label: "Decision available",
              status: "OUTCOME_AVAILABLE",
            },
            type: "TERMINAL" as const,
          }
        : { type: "TRANSITION" as const },
      reasonCodes,
      reversibleActionKey: null,
    },
    true,
  );
}

export function requestInformation(
  key: string,
  label: string,
  order: number,
) {
  return action(key, label, "REQUEST_INFORMATION", order, {
    deadlineDays: 10,
    editableFieldKeys: ["CLARIFICATION_RESPONSE"],
    expiryAction: "ESCALATE",
    reminderDayOffsets: [3, 7],
  });
}

export function returnAction(key: string, label: string, order: number) {
  return action(key, label, "RETURN", order, {
    dataHandling: "RETAIN",
    reasonRequired: true,
  }, true);
}

export function deferDate(key: string, label: string, order: number) {
  return action(key, label, "DEFER", order, {
    targetDate: "2027-01-15",
    targetType: "DATE",
  });
}

export function hold(
  key: string,
  label: string,
  order: number,
  reasonCodes: string[],
) {
  return action(key, label, "PUT_ON_HOLD", order, {
    reasonCodes,
    reviewDateRequired: true,
  }, true);
}

export function refer(key: string, label: string, order: number) {
  return action(key, label, "REFER", order, { returnToReferrer: false }, true);
}

export function checklist(
  key: string,
  text: string,
  displayOrder: number,
  evidenceRequirement: WorkflowStageChecklistDefinition["evidenceRequirement"] = "NONE",
): WorkflowStageChecklistDefinition {
  return {
    displayOrder,
    evidenceRequirement,
    key,
    mandatory: true,
    notes: "",
    responseType: "YES_NO",
    taskStableKey: "",
    text,
  };
}

export function documentRequirement(
  name: string,
  uploader: WorkflowStageDocumentRequirement["uploader"],
  mandatory = true,
): WorkflowStageDocumentRequirement {
  return {
    acceptedFileTypes: ["PDF", "DOCX", "JPG", "PNG"],
    expiryDays: null,
    mandatory,
    maximumSizeMb: 20,
    name,
    taskStableKey: "",
    templateReference: "",
    uploader,
    verifier: "STAFF",
  };
}

type TaskInput = {
  actionKeys: string[];
  coiRequired?: boolean;
  config: unknown;
  description: string;
  displayOrder: number;
  formCode?: StandardWorkflowFormCode;
  name: string;
  quorum?: boolean;
  quorumRule?: import("../runtime/Quorum").QuorumRule;
  requiredCompletionCount?: number;
  reviewerCount?: number;
  roleCode: StandardWorkflowRoleCode;
  stableKey: string;
};

export function task(
  dependencies: StandardWorkflowDependencies,
  input: TaskInput,
): WorkflowTaskInput {
  const formVersionId = input.formCode
    ? dependencies.formVersionIds[input.formCode]
    : undefined;
  return {
    actionKeys: input.actionKeys,
    assignmentMode: "ROLE",
    coiRequired: input.coiRequired ?? false,
    config: input.formCode
      ? {
          ...(input.config && typeof input.config === "object"
            ? input.config as Record<string, unknown>
            : {}),
          formPurpose: standardFormPurpose(input.formCode),
        }
      : input.config,
    description: input.description,
    displayOrder: input.displayOrder,
    formBinding: formVersionId
      ? { contextFields: [], formVersionId }
      : null,
    name: input.name,
    namedUserOverrideId: null,
    permissions: defaultWorkflowElementPermissions,
    quorum: input.quorum ?? false,
    quorumRule: input.quorumRule ?? null,
    required: true,
    requiredCompletionCount: input.requiredCompletionCount ?? 1,
    reviewerCount: input.reviewerCount ?? 1,
    roleId: dependencies.roleIds[input.roleCode],
    stableKey: input.stableKey,
  };
}

export function stage(
  input: Omit<WorkflowStageInput, "entryCondition" | "exitCondition">,
): WorkflowStageInput {
  const defaultTaskKey = input.tasks[0]?.stableKey ?? "";
  return {
    ...input,
    checklistItems: input.checklistItems.map((item) => ({
      ...item,
      taskStableKey: item.taskStableKey || defaultTaskKey,
    })),
    documentRequirements: input.documentRequirements.map((requirement) => ({
      ...requirement,
      taskStableKey: requirement.taskStableKey || defaultTaskKey,
    })),
    entryCondition: null,
    exitCondition: null,
  };
}
