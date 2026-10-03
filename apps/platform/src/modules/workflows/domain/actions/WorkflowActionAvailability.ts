import type { WorkflowActionDefinition } from "./WorkflowActionDefinition";
import type { WorkflowActionType } from "./WorkflowActionDefinition";
import type { WorkflowRfiFieldOption } from "../runtime/WorkflowRfiFields";

export const workflowActionPresentationVariants = [
  "danger",
  "navy",
  "outline",
  "outlineOrange",
  "primary",
  "subtle",
  "success",
  "yellow",
] as const;

export type WorkflowActionPresentationVariant =
  (typeof workflowActionPresentationVariants)[number];

export type WorkflowActionInputMetadata = {
  escalationTargets?: readonly {
    id: string;
    label: string;
    targetType: "ROLE" | "USER";
  }[];
  defaultDestinationStageId?: string;
  destinationStages?: readonly {
    id: string;
    name: string;
    stableKey: string;
  }[];
  controlDefaults?: {
    dataHandling?: "RETAIN" | "CLEAR";
    sourceTaskBehavior?: "BLOCKED" | "OPEN";
    returnToReferrer?: boolean;
  };
  confirmation: {
    message: string | null;
    required: boolean;
  };
  dueDate: {
    deadlineDays: number | null;
    required: boolean;
  };
  editableFieldPaths: readonly string[];
  editableFields?: readonly WorkflowRfiFieldOption[];
  reason: {
    maxLength: number;
    required: boolean;
  };
  reviewDate: {
    required: boolean;
  };
  target: {
    type: "DATE" | "FUNDING_CALL" | "ROLE" | "USER" | null;
    value: string | null;
  };
};

export type WorkflowActionAvailability = {
  actionType: WorkflowActionType;
  available: boolean;
  key: string;
  label: string;
  presentation: {
    displayOrder: number;
    variant: WorkflowActionPresentationVariant;
  };
  requiredInput: WorkflowActionInputMetadata;
  runtimeVersion: number;
  unavailableReason: string | null;
};

export const emptyWorkflowActionInputMetadata: WorkflowActionInputMetadata = {
  confirmation: { message: null, required: false },
  dueDate: { deadlineDays: null, required: false },
  editableFieldPaths: [],
  reason: { maxLength: 4_000, required: false },
  reviewDate: { required: false },
  target: { type: null, value: null },
};

const presentationByType: Record<
  WorkflowActionType,
  WorkflowActionPresentationVariant
> = {
  APPROVE_ADVANCE: "success",
  DEFER: "subtle",
  ESCALATE: "primary",
  PUT_ON_HOLD: "yellow",
  RESUME: "success",
  REFER: "navy",
  REJECT: "danger",
  REQUEST_INFORMATION: "outlineOrange",
  RETURN: "outline",
  WITHDRAW: "danger",
};

function targetMetadata(
  action: WorkflowActionDefinition,
): WorkflowActionInputMetadata["target"] {
  if (action.actionType === "ESCALATE") {
    return {
      type: action.configuration.targetType,
      value: action.configuration.targetId,
    };
  }
  if (action.actionType === "DEFER") {
    return action.configuration.targetType === "DATE"
      ? { type: "DATE", value: action.configuration.targetDate }
      : {
          type: "FUNDING_CALL",
          value: action.configuration.targetCallKey,
        };
  }
  return { type: null, value: null };
}

export function workflowActionInputMetadata(
  action: WorkflowActionDefinition,
): WorkflowActionInputMetadata {
  const isRequest = action.actionType === "REQUEST_INFORMATION";
  const isHold = action.actionType === "PUT_ON_HOLD";
  return {
    controlDefaults:
      action.actionType === "RETURN" || action.actionType === "REFER"
        ? action.configuration
        : undefined,
    confirmation: {
      message:
        action.actionType === "WITHDRAW"
          ? "Confirm that this application should be withdrawn."
          : null,
      required: action.actionType === "WITHDRAW",
    },
    dueDate: {
      deadlineDays: isRequest ? action.configuration.deadlineDays : null,
      required: isRequest,
    },
    editableFieldPaths: isRequest
      ? action.configuration.editableFieldPaths
      : [],
    reason: {
      maxLength: 4_000,
      required: !isRequest && action.reasonRequired,
    },
    reviewDate: {
      required: isHold && action.configuration.reviewDateRequired,
    },
    target: targetMetadata(action),
  };
}

export function workflowActionPresentation(action: WorkflowActionDefinition) {
  return {
    displayOrder: action.displayOrder,
    variant: presentationByType[action.actionType],
  };
}
