import type { WorkflowActionDefinition } from "./WorkflowActionDefinition";
import type { WorkflowActionType } from "./WorkflowActionDefinition";

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
  comment: {
    maxLength: number;
    required: boolean;
  };
  confirmation: {
    message: string | null;
    required: boolean;
  };
  dueDate: {
    deadlineDays: number | null;
    required: boolean;
  };
  editableFieldKeys: readonly string[];
  reasonCode: {
    options: readonly string[];
    required: boolean;
  };
  reasonOrCommentRequired: boolean;
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
  comment: { maxLength: 4_000, required: false },
  confirmation: { message: null, required: false },
  dueDate: { deadlineDays: null, required: false },
  editableFieldKeys: [],
  reasonCode: { options: [], required: false },
  reasonOrCommentRequired: false,
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
  REFER: "navy",
  REJECT: "danger",
  REQUEST_INFORMATION: "outlineOrange",
  RETURN: "outline",
  WITHDRAW: "danger",
};

function reasonCodes(action: WorkflowActionDefinition) {
  return action.actionType === "REJECT"
      || action.actionType === "PUT_ON_HOLD"
    ? action.configuration.reasonCodes
    : [];
}

function targetMetadata(
  action: WorkflowActionDefinition,
): WorkflowActionInputMetadata["target"] {
  if (action.actionType === "ESCALATE") {
    return { type: action.configuration.targetType, value: null };
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
  const reasonOrCommentRequired = action.actionType === "RETURN"
    && action.configuration.reasonRequired;
  return {
    comment: {
      maxLength: 4_000,
      required: false,
    },
    confirmation: {
      message: action.actionType === "WITHDRAW"
        ? "Confirm that this application should be withdrawn."
        : action.actionType === "REJECT"
          ? "Confirm this rejection decision."
          : null,
      required: action.actionType === "WITHDRAW"
        || action.actionType === "REJECT",
    },
    dueDate: {
      deadlineDays: isRequest ? action.configuration.deadlineDays : null,
      required: isRequest,
    },
    editableFieldKeys: isRequest
      ? action.configuration.editableFieldKeys
      : [],
    reasonCode: {
      options: reasonCodes(action),
      required: action.reasonCodeRequired,
    },
    reasonOrCommentRequired,
    reviewDate: {
      required: isHold && action.configuration.reviewDateRequired,
    },
    target: targetMetadata(action),
  };
}

export function workflowActionPresentation(
  action: WorkflowActionDefinition,
) {
  return {
    displayOrder: action.displayOrder,
    variant: presentationByType[action.actionType],
  };
}
