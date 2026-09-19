import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type { WorkflowActionFormValues } from "./WorkflowActionFormSchema";

function keys(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numbers(value: string) {
  if (!value.trim()) return [];
  return value
    .split(/[\n,]/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

export function workflowActionFormDefaults(
  action: WorkflowActionDefinition | undefined,
  displayOrder: number,
): WorkflowActionFormValues {
  const defaults: WorkflowActionFormValues = {
    stableKey: action?.stableKey ?? "",
    label: action?.label ?? "",
    actionType: action?.actionType ?? "APPROVE_ADVANCE",
    enabled: action?.enabled ?? true,
    reasonCodeRequired: action?.reasonCodeRequired ?? false,
    displayOrder: action?.displayOrder ?? displayOrder,
    reasonCodes: "",
    deadlineDays: undefined,
    editableFieldKeys: "",
    reminderDayOffsets: "",
    expiryAction: "CLOSE_REQUEST",
    dataHandling: "RETAIN",
    reasonRequired: true,
    returnToReferrer: true,
    escalationTargetType: "ROLE",
    escalationTargetId: "",
    escalationTrigger: "MANUAL",
    reviewDateRequired: true,
    allowedStageKeys: "",
    resubmissionRule: "NOT_ALLOWED",
    deferTargetType: "DATE",
    targetDate: "",
    targetCallKey: "",
  };
  if (!action) return defaults;
  switch (action.actionType) {
    case "APPROVE_ADVANCE":
      return defaults;
    case "REJECT":
      return {
        ...defaults,
        reasonCodes: action.configuration.reasonCodes.join(", "),
      };
    case "REQUEST_INFORMATION":
      return {
        ...defaults,
        deadlineDays: action.configuration.deadlineDays,
        editableFieldKeys: action.configuration.editableFieldKeys.join(", "),
        reminderDayOffsets:
          action.configuration.reminderDayOffsets.join(", "),
        expiryAction: action.configuration.expiryAction,
      };
    case "RETURN":
      return {
        ...defaults,
        dataHandling: action.configuration.dataHandling,
        reasonRequired: action.configuration.reasonRequired,
      };
    case "REFER":
      return {
        ...defaults,
        returnToReferrer: action.configuration.returnToReferrer,
      };
    case "ESCALATE":
      return {
        ...defaults,
        escalationTargetType: action.configuration.targetType,
        escalationTargetId: action.configuration.targetId,
        escalationTrigger: action.configuration.trigger,
      };
    case "PUT_ON_HOLD":
      return {
        ...defaults,
        reasonCodes: action.configuration.reasonCodes.join(", "),
        reviewDateRequired: action.configuration.reviewDateRequired,
      };
    case "WITHDRAW":
      return {
        ...defaults,
        allowedStageKeys: action.configuration.allowedStageKeys.join(", "),
        resubmissionRule: action.configuration.resubmissionRule,
      };
    case "DEFER":
      return action.configuration.targetType === "DATE"
        ? {
            ...defaults,
            deferTargetType: "DATE",
            targetDate: action.configuration.targetDate,
          }
        : {
            ...defaults,
            deferTargetType: "FUNDING_CALL",
            targetCallKey: action.configuration.targetCallKey,
          };
  }
}

function configuration(values: WorkflowActionFormValues) {
  switch (values.actionType) {
    case "APPROVE_ADVANCE":
      return {};
    case "REJECT":
      return {
        reasonCodes: keys(values.reasonCodes),
      };
    case "REQUEST_INFORMATION":
      return {
        deadlineDays: values.deadlineDays,
        editableFieldKeys: keys(values.editableFieldKeys),
        reminderDayOffsets: numbers(values.reminderDayOffsets),
        expiryAction: values.expiryAction,
      };
    case "RETURN":
      return {
        dataHandling: values.dataHandling,
        reasonRequired: values.reasonRequired,
      };
    case "REFER":
      return {
        returnToReferrer: values.returnToReferrer,
      };
    case "ESCALATE":
      return {
        targetType: values.escalationTargetType,
        targetId: values.escalationTargetId,
        trigger: values.escalationTrigger,
      };
    case "PUT_ON_HOLD":
      return {
        reasonCodes: keys(values.reasonCodes),
        reviewDateRequired: values.reviewDateRequired,
      };
    case "WITHDRAW":
      return {
        allowedStageKeys: keys(values.allowedStageKeys),
        resubmissionRule: values.resubmissionRule,
      };
    case "DEFER":
      return values.deferTargetType === "DATE"
        ? { targetType: "DATE" as const, targetDate: values.targetDate }
        : {
            targetType: "FUNDING_CALL" as const,
            targetCallKey: values.targetCallKey,
          };
  }
}

export function toWorkflowActionDefinition(
  values: WorkflowActionFormValues,
  id?: string,
): WorkflowActionDefinition {
  return workflowActionDefinitionSchema.parse({
    ...(id ? { id } : {}),
    stableKey: values.stableKey,
    label: values.label,
    actionType: values.actionType,
    enabled: values.enabled,
    reasonCodeRequired: values.reasonCodeRequired,
    displayOrder: values.displayOrder,
    configuration: configuration(values),
  });
}
