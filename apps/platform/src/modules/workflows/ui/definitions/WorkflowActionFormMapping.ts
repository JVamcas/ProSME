import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import { replaceWorkflowActionRoutes } from "./WorkflowActionEditorRoutes";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type { WorkflowActionFormValues } from "./WorkflowActionFormSchema";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

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
  taskStableKeys: string[] = [],
): WorkflowActionFormValues {
  const defaults: WorkflowActionFormValues = {
    stableKey: action?.stableKey ?? "",
    label: action?.label ?? "",
    taskStableKeys,
    actionType: action?.actionType ?? "APPROVE_ADVANCE",
    enabled: action?.enabled ?? true,
    reasonRequired: action?.reasonRequired ?? false,
    displayOrder: action?.displayOrder ?? displayOrder,
    rejectionOutcomeType: "TERMINAL",
    rejectionPublicStatus: "OUTCOME_AVAILABLE",
    rejectionPublicLabel: "Decision available",
    rejectionPublicDescription: "A decision is available for your application.",
    reversibleActionKey: "",
    deadlineDays: undefined,
    editableFieldPaths: "",
    reminderDayOffsets: "",
    expiryAction: "CLOSE_REQUEST",
    dataHandling: "RETAIN",
    returnToReferrer: true,
    sourceTaskBehavior: "BLOCKED",
    escalationTargetType: "ROLE",
    escalationTargetId: "",
    escalationTrigger: "MANUAL",
    escalationResponsibility: "SHARE",
    escalationBlocksWork: true,
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
        rejectionOutcomeType: action.configuration.outcome.type,
        rejectionPublicDescription:
          action.configuration.outcome.type === "TERMINAL"
            ? action.configuration.outcome.publicStatusMapping.description
            : defaults.rejectionPublicDescription,
        rejectionPublicLabel:
          action.configuration.outcome.type === "TERMINAL"
            ? action.configuration.outcome.publicStatusMapping.label
            : defaults.rejectionPublicLabel,
        rejectionPublicStatus:
          action.configuration.outcome.type === "TERMINAL"
            ? action.configuration.outcome.publicStatusMapping.status
            : defaults.rejectionPublicStatus,
        reversibleActionKey: action.configuration.reversibleActionKey ?? "",
      };
    case "REQUEST_INFORMATION":
      return {
        ...defaults,
        deadlineDays: action.configuration.deadlineDays,
        editableFieldPaths: action.configuration.editableFieldPaths.join(", "),
        reminderDayOffsets: action.configuration.reminderDayOffsets.join(", "),
        expiryAction: action.configuration.expiryAction,
      };
    case "RETURN":
      return {
        ...defaults,
        dataHandling: action.configuration.dataHandling,
      };
    case "REFER":
      return {
        ...defaults,
        returnToReferrer: action.configuration.returnToReferrer,
        sourceTaskBehavior: action.configuration.sourceTaskBehavior,
      };
    case "ESCALATE":
      return {
        ...defaults,
        escalationTargetType: action.configuration.targetType,
        escalationTargetId: action.configuration.targetId,
        escalationTrigger: action.configuration.trigger,
        escalationResponsibility: action.configuration.responsibility,
        escalationBlocksWork: action.configuration.blockUntilResolved,
      };
    case "PUT_ON_HOLD":
      return {
        ...defaults,
        reviewDateRequired: action.configuration.reviewDateRequired,
      };
    case "RESUME":
      return defaults;
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
        outcome:
          values.rejectionOutcomeType === "TERMINAL"
            ? {
                cancelOpenStageInstances: true as const,
                cancelOpenTasks: true as const,
                publicStatusMapping: {
                  description: values.rejectionPublicDescription,
                  label: values.rejectionPublicLabel,
                  status: values.rejectionPublicStatus,
                },
                type: "TERMINAL" as const,
              }
            : { type: "TRANSITION" as const },
        reversibleActionKey: values.reversibleActionKey || null,
      };
    case "REQUEST_INFORMATION":
      return {
        continuation: "RESUME_SOURCE_TASK" as const,
        deadlineDays: values.deadlineDays,
        editableFieldPaths: keys(values.editableFieldPaths),
        reminderDayOffsets: numbers(values.reminderDayOffsets),
        expiryAction: values.expiryAction,
        participantScope: "APPLICATION_OWNER_AND_REQUESTER" as const,
        recipientScope: "APPLICATION_OWNER" as const,
      };
    case "RETURN":
      return {
        dataHandling: values.dataHandling,
      };
    case "REFER":
      return {
        returnToReferrer: values.returnToReferrer,
        sourceTaskBehavior: values.sourceTaskBehavior,
      };
    case "ESCALATE":
      return {
        blockUntilResolved: values.escalationBlocksWork,
        responsibility: values.escalationResponsibility,
        targetType: values.escalationTargetType,
        targetId: values.escalationTargetId,
        trigger: values.escalationTrigger,
      };
    case "PUT_ON_HOLD":
      return {
        reviewDateRequired: values.reviewDateRequired,
        scope: "STAGE" as const,
      };
    case "RESUME":
      return { scope: "STAGE" as const };
    case "WITHDRAW":
      return {
        allowedStageKeys: keys(values.allowedStageKeys),
        resubmissionRule: values.resubmissionRule,
      };
    case "DEFER":
      return values.deferTargetType === "DATE"
        ? {
            continuation: "RESUME_ON_DATE" as const,
            targetType: "DATE" as const,
            targetDate: values.targetDate,
          }
        : {
            continuation: "EXPLICIT_TRANSFER" as const,
            targetType: "FUNDING_CALL" as const,
            targetCallKey: values.targetCallKey,
          };
  }
}

export function toWorkflowActionDefinition(
  values: WorkflowActionFormValues,
  id?: string,
  condition?: ConditionGroup | null,
): WorkflowActionDefinition {
  return workflowActionDefinitionSchema.parse({
    ...(id ? { id } : {}),
    ...(condition ? { condition } : {}),
    stableKey: values.stableKey,
    label: values.label,
    actionType: values.actionType,
    enabled: values.enabled,
    reasonRequired: values.reasonRequired,
    displayOrder: values.displayOrder,
    configuration: configuration(values),
  });
}

export function workflowActionUpdatedGraph(
  editor: WorkflowEditorView,
  stage: WorkflowStageInput,
  action: WorkflowActionDefinition | undefined,
  nextAction: WorkflowActionDefinition,
  taskStableKeys: readonly string[],
  routes: WorkflowTransitionDefinition[],
) {
  const selectedTasks = new Set(taskStableKeys);
  return {
    stages: editor.graph.stages.map((item) =>
      item.stableKey === stage.stableKey
        ? {
            ...item,
            actions: action
              ? item.actions.map((current) =>
                  current.stableKey === action.stableKey
                    ? nextAction
                    : current,
                )
              : [...item.actions, nextAction],
            tasks: item.tasks.map((task) => {
              const actionKeys = task.actionKeys.filter(
                (key) =>
                  key !== action?.stableKey
                  && key !== nextAction.stableKey,
              );
              return {
                ...task,
                actionKeys: selectedTasks.has(task.stableKey)
                  ? [...actionKeys, nextAction.stableKey]
                  : actionKeys,
              };
            }),
          }
        : item,
    ),
    transitions: replaceWorkflowActionRoutes(
      editor.graph.transitions,
      stage.stableKey,
      action?.stableKey,
      nextAction.stableKey,
      routes,
    ),
  };
}
