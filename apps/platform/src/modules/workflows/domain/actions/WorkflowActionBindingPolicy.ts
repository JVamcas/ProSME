import type { WorkflowActionDefinition } from "./WorkflowActionDefinition";
import { isWorkflowStageDecisionAction } from "./WorkflowActionDefinition";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "../definitions/WorkflowTypes";

function sameRecord(
  left: { id?: string; stableKey: string },
  right: { id?: string; stableKey: string },
) {
  return left.id && right.id
    ? left.id === right.id
    : left.stableKey === right.stableKey;
}

function previousStage(
  previous: WorkflowGraphInput | null,
  stage: WorkflowStageInput,
) {
  return previous?.stages.find((candidate) => sameRecord(candidate, stage));
}

function previousTask(
  previous: WorkflowStageInput | undefined,
  task: WorkflowTaskInput,
) {
  return previous?.tasks.find((candidate) => sameRecord(candidate, task));
}

function previousAction(
  previous: WorkflowStageInput | undefined,
  action: WorkflowActionDefinition,
) {
  return previous?.actions.find((candidate) => sameRecord(candidate, action));
}

export function reconcileWorkflowStageActionBindings(
  previous: WorkflowStageInput | undefined,
  stage: WorkflowStageInput,
): WorkflowStageInput {
  const actionsByKey = new Map(
    stage.actions.map((action) => [action.stableKey, action]),
  );
  const commonKeys = stage.actions
    .filter((action) => !isWorkflowStageDecisionAction(action.actionType))
    .map((action) => action.stableKey);
  const decisionKeys = stage.actions
    .filter((action) => isWorkflowStageDecisionAction(action.actionType))
    .map((action) => action.stableKey);
  const newlyCommonKeys = new Set(
    stage.actions.flatMap((action) => {
      if (isWorkflowStageDecisionAction(action.actionType)) return [];
      const prior = previousAction(previous, action);
      return !prior || isWorkflowStageDecisionAction(prior.actionType)
        ? [action.stableKey]
        : [];
    }),
  );

  return {
    ...stage,
    tasks: stage.tasks.map((task) => {
      const prior = previousTask(previous, task);
      const selectedCommon = new Set(
        task.actionKeys.filter((key) => {
          const action = actionsByKey.get(key);
          return action && !isWorkflowStageDecisionAction(action.actionType);
        }),
      );
      if (!prior) {
        commonKeys.forEach((key) => selectedCommon.add(key));
      } else {
        newlyCommonKeys.forEach((key) => selectedCommon.add(key));
      }
      const requiredKeys = new Set([
        ...selectedCommon,
        ...(task.taskType === "STAGE_DECISION" ? decisionKeys : []),
      ]);
      const unknownKeys = task.actionKeys.filter(
        (key) => !actionsByKey.has(key),
      );
      return {
        ...task,
        actionKeys: [
          ...stage.actions
            .map((action) => action.stableKey)
            .filter((key) => requiredKeys.has(key)),
          ...unknownKeys,
        ],
      };
    }),
  };
}

export function reconcileWorkflowActionBindings(
  previous: WorkflowGraphInput | null,
  next: WorkflowGraphInput,
): WorkflowGraphInput {
  return {
    ...next,
    stages: next.stages.map((stage) =>
      reconcileWorkflowStageActionBindings(
        previousStage(previous, stage),
        stage,
      ),
    ),
  };
}

export function createDefaultWorkflowCommonActions(
  escalationRoleId?: string,
): WorkflowActionDefinition[] {
  const actions: WorkflowActionDefinition[] = [
    {
      actionType: "REQUEST_INFORMATION",
      configuration: {
        continuation: "RESUME_SOURCE_TASK",
        deadlineDays: 10,
        editableFieldPaths: ["CLARIFICATION_RESPONSE"],
        expiryAction: "CLOSE_REQUEST",
        participantScope: "APPLICATION_OWNER_AND_REQUESTER",
        recipientScope: "APPLICATION_OWNER",
        reminderDayOffsets: [3, 7],
      },
      displayOrder: 1,
      enabled: true,
      label: "Request information",
      reasonRequired: false,
      stableKey: "REQUEST_INFORMATION",
    },
    {
      actionType: "PUT_ON_HOLD",
      configuration: {
        reviewDateRequired: true,
        scope: "STAGE",
      },
      displayOrder: 2,
      enabled: true,
      label: "Put on hold",
      reasonRequired: true,
      stableKey: "PUT_ON_HOLD",
    },
    {
      actionType: "RESUME",
      configuration: { scope: "STAGE" },
      displayOrder: 3,
      enabled: true,
      label: "Resume",
      reasonRequired: false,
      stableKey: "RESUME",
    },
  ];
  actions.push({
    actionType: "RETURN",
    configuration: { dataHandling: "RETAIN" },
    displayOrder: 4,
    enabled: true,
    label: "Return for correction",
    reasonRequired: false,
    stableKey: "RETURN",
  });
  if (escalationRoleId) {
    actions.push({
      actionType: "ESCALATE",
      configuration: {
        blockUntilResolved: true,
        responsibility: "SHARE",
        targetId: escalationRoleId,
        targetType: "ROLE",
        trigger: "MANUAL",
      },
      displayOrder: 5,
      enabled: true,
      label: "Escalate",
      reasonRequired: true,
      stableKey: "ESCALATE",
    });
  }
  return actions;
}
