import { defaultWorkflowElementPermissions } from "../definitions/WorkflowElementPermissions";
import type { WorkflowActionDefinition } from "../actions/WorkflowActionDefinition";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "../definitions/WorkflowTypes";
import type { WorkflowStageDocumentRequirement } from "../definitions/WorkflowStageDocumentRequirement";
import type { WorkflowStageChecklistDefinition } from "../definitions/WorkflowStageChecklistDefinition";
import type { WorkflowStageCommentField } from "../definitions/WorkflowStageCommentField";
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
    templateReference: "",
    uploader,
    verifier: "STAFF",
  };
}

export function comment(
  key: string,
  label: string,
  displayOrder: number,
  mandatory = false,
  visibility: WorkflowStageCommentField["visibility"] = "INTERNAL_ONLY",
): WorkflowStageCommentField {
  return {
    displayOrder,
    helpText: "",
    key,
    label,
    mandatory,
    visibility,
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
    config: input.config,
    description: input.description,
    displayOrder: input.displayOrder,
    formBinding: formVersionId
      ? { contextFields: [], formVersionId }
      : null,
    name: input.name,
    namedUserOverrideId: null,
    permissions: defaultWorkflowElementPermissions,
    quorum: input.quorum ?? false,
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
  return { ...input, entryCondition: null, exitCondition: null };
}

export const yesNoChecklistConfig = (items: WorkflowStageChecklistDefinition[]) => ({
  items: items.map((item) => ({
    code: item.key,
    label: item.text,
    required: item.mandatory,
  })),
});
