import { validateTaskConfiguration } from "./WorkflowTaskRegistry";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

const sensitiveApplicantTerms =
  /score|recommendation|assignee|assignment|committee/i;

function issue(
  code: string,
  message: string,
  path: string,
): WorkflowValidationIssue {
  return { code, message, path };
}

function duplicates(values: (string | number)[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function validateTaskIdentity(
  task: WorkflowGraphInput["stages"][number]["tasks"][number],
  base: string,
  taskIndex: number,
) {
  const errors: WorkflowValidationIssue[] = [];
  const taskPath = `${base}.tasks.${taskIndex}`;
  if (!validateTaskConfiguration(task.config).success) {
    errors.push(
      issue(
        "INVALID_TASK_CONFIG",
        `${task.name} has invalid task configuration.`,
        `${taskPath}.config`,
      ),
    );
  }
  if (task.requiredCompletionCount > task.reviewerCount) {
    errors.push(
      issue(
        "INVALID_COMPLETION_COUNT",
        `${task.name} cannot require more completions than reviewers.`,
        `${taskPath}.requiredCompletionCount`,
      ),
    );
  }
  if (task.assignmentMode === "ROLE" && !task.roleId) {
    errors.push(
      issue(
        "MISSING_ASSIGNMENT",
        `${task.name} must be assigned to a role before publication.`,
        `${taskPath}.roleId`,
      ),
    );
  }
  if (task.assignmentMode === "NAMED_USER" && !task.namedUserOverrideId) {
    errors.push(
      issue(
        "MISSING_ASSIGNMENT",
        `${task.name} must select a named user before publication.`,
        `${taskPath}.namedUserOverrideId`,
      ),
    );
  }
  if (task.assignmentMode === "NAMED_USER" && task.reviewerCount !== 1) {
    errors.push(
      issue(
        "INVALID_NAMED_USER_REVIEWER_COUNT",
        `${task.name} must have exactly one reviewer when assigned to a named user.`,
        `${taskPath}.reviewerCount`,
      ),
    );
  }
  if (task.taskType === "STAGE_DECISION" && task.reviewerCount !== 1) {
    errors.push(
      issue(
        "INVALID_STAGE_DECISION_REVIEWER_COUNT",
        `${task.name} must have exactly one assignee because it determines the stage outcome.`,
        `${taskPath}.reviewerCount`,
      ),
    );
  }
  if (
    task.quorum &&
    (!task.quorumRule ||
      (task.quorumRule.minimumCount === null &&
        task.quorumRule.minimumPercentage === null))
  ) {
    errors.push(
      issue(
        "INVALID_QUORUM",
        `${task.name} must configure a participation quorum.`,
        `${taskPath}.quorumRule`,
      ),
    );
  }
  if (
    task.quorum &&
    task.quorumRule?.population === "ASSIGNED_TASKS" &&
    task.quorumRule.minimumCount !== null &&
    task.quorumRule.minimumCount > task.reviewerCount
  ) {
    errors.push(
      issue(
        "INVALID_QUORUM_COUNT",
        `${task.name} cannot require more assigned participants than reviewer slots.`,
        `${taskPath}.quorumRule.minimumCount`,
      ),
    );
  }
  return errors;
}

function validateTaskUniqueness(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  const errors: WorkflowValidationIssue[] = [];
  const duplicateCodes = new Set(
    duplicates(stage.tasks.map((task) => task.stableKey)),
  );
  for (const code of duplicateCodes) {
    errors.push(
      issue(
        "DUPLICATE_TASK_CODE",
        `Task code ${code} is duplicated.`,
        `${base}.tasks`,
      ),
    );
  }
  const duplicateSequences = new Set(
    duplicates(stage.tasks.map((task) => task.displayOrder)),
  );
  for (const sequence of duplicateSequences) {
    errors.push(
      issue(
        "DUPLICATE_TASK_SEQUENCE",
        `Task sequence ${sequence} is duplicated.`,
        `${base}.tasks`,
      ),
    );
  }
  return errors;
}

function validateTaskTypeActions(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  const errors: WorkflowValidationIssue[] = [];
  const decisionTasks = stage.tasks.filter(
    (task) => task.taskType === "STAGE_DECISION",
  );
  if (decisionTasks.length > 1) {
    errors.push(
      issue(
        "MULTIPLE_STAGE_DECISION_TASKS",
        `${stage.name} can contain at most one stage-decision task.`,
        `${base}.tasks`,
      ),
    );
  }
  const actionsByKey = new Map(
    stage.actions.map((action) => [action.stableKey, action]),
  );
  const decisionActionKeys = stage.actions
    .filter((action) => isWorkflowStageDecisionAction(action.actionType))
    .map((action) => action.stableKey);
  const decisionTask = decisionTasks[0];
  if (decisionActionKeys.length && !decisionTask) {
    errors.push(
      issue(
        "STAGE_DECISION_TASK_REQUIRED",
        `${stage.name} needs a stage-decision task for its decision actions.`,
        `${base}.tasks`,
      ),
    );
  }
  if (decisionTask) {
    const missingDecisionActions = decisionActionKeys.filter(
      (actionKey) => !decisionTask.actionKeys.includes(actionKey),
    );
    if (missingDecisionActions.length) {
      const taskIndex = stage.tasks.indexOf(decisionTask);
      errors.push(
        issue(
          "STAGE_DECISION_ACTION_BINDING_REQUIRED",
          `${decisionTask.name} must expose every stage-decision action.`,
          `${base}.tasks.${taskIndex}.actionKeys`,
        ),
      );
    }
  }
  stage.tasks.forEach((task, taskIndex) => {
    const decisionActions = task.actionKeys.filter((actionKey) => {
      const action = actionsByKey.get(actionKey);
      return action ? isWorkflowStageDecisionAction(action.actionType) : false;
    });
    if (task.taskType === "CONTRIBUTING" && decisionActions.length) {
      errors.push(
        issue(
          "DECISION_ACTION_ON_CONTRIBUTING_TASK",
          `${task.name} cannot expose a stage-decision action because it is a contributing task.`,
          `${base}.tasks.${taskIndex}.actionKeys`,
        ),
      );
    }
    if (task.taskType === "STAGE_DECISION" && !decisionActions.length) {
      errors.push(
        issue(
          "STAGE_DECISION_ACTION_REQUIRED",
          `${task.name} must expose at least one stage-decision action.`,
          `${base}.tasks.${taskIndex}.actionKeys`,
        ),
      );
    }
  });
  return errors;
}

function validateActionUniqueness(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  const errors: WorkflowValidationIssue[] = [];
  const duplicateKeys = new Set(
    duplicates(stage.actions.map((action) => action.stableKey)),
  );
  for (const stableKey of duplicateKeys) {
    errors.push(
      issue(
        "DUPLICATE_ACTION_KEY",
        `Action key ${stableKey} is duplicated.`,
        `${base}.actions`,
      ),
    );
  }
  const duplicateOrders = new Set(
    duplicates(stage.actions.map((action) => action.displayOrder)),
  );
  for (const displayOrder of duplicateOrders) {
    errors.push(
      issue(
        "DUPLICATE_ACTION_ORDER",
        `Action display order ${displayOrder} is duplicated.`,
        `${base}.actions`,
      ),
    );
  }
  return errors;
}

function validateApplicantLabels(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  if (
    !sensitiveApplicantTerms.test(
      `${stage.publicStatusMapping.label} ${stage.publicStatusMapping.description}`,
    )
  ) {
    return [];
  }
  return [
    issue(
      "UNSAFE_APPLICANT_LABEL",
      `${stage.name} exposes internal workflow terminology.`,
      base,
    ),
  ];
}

function validateAutomaticDocumentRequests(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  const errors: WorkflowValidationIssue[] = [];
  const automatic = stage.documentRequirements.filter(
    (requirement) => requirement.requestOnStageActivation,
  );
  const taskKeys = new Set(
    automatic.map((requirement) => requirement.taskStableKey),
  );
  if (taskKeys.size > 1) {
    errors.push(
      issue(
        "AUTO_RFI_MULTIPLE_TASKS",
        `${stage.name} must attach automatically requested documents to one task so they can be consolidated.`,
        `${base}.documentRequirements`,
      ),
    );
  }
  automatic.forEach((requirement) => {
    const requirementIndex = stage.documentRequirements.indexOf(requirement);
    const path = `${base}.documentRequirements.${requirementIndex}`;
    if (requirement.uploader !== "APPLICANT") {
      errors.push(
        issue(
          "AUTO_RFI_APPLICANT_OWNER_REQUIRED",
          `${requirement.name} can be requested automatically only when the applicant is the uploader.`,
          `${path}.uploader`,
        ),
      );
    }
    const task = stage.tasks.find(
      (candidate) => candidate.stableKey === requirement.taskStableKey,
    );
    const actions = stage.actions.filter(
      (action) =>
        action.actionType === "REQUEST_INFORMATION" &&
        action.enabled &&
        task?.actionKeys.includes(action.stableKey),
    );
    if (actions.length !== 1) {
      errors.push(
        issue(
          "AUTO_RFI_ACTION_REQUIRED",
          `${requirement.name} must be attached to a task with exactly one enabled Request Information action.`,
          path,
        ),
      );
    }
  });
  return errors;
}

export function validateWorkflowStage(
  stage: WorkflowGraphInput["stages"][number],
  index: number,
) {
  const errors: WorkflowValidationIssue[] = [];
  const base = `stages.${index}`;
  if (stage.tasks.length === 0) {
    errors.push(
      issue(
        "MISSING_RESPONSIBILITY",
        `${stage.name} needs at least one assigned task.`,
        `${base}.tasks`,
      ),
    );
  }
  errors.push(...validateActionUniqueness(stage, base));
  errors.push(...validateTaskUniqueness(stage, base));
  errors.push(...validateTaskTypeActions(stage, base));
  stage.tasks.forEach((task, taskIndex) => {
    errors.push(...validateTaskIdentity(task, base, taskIndex));
  });
  errors.push(...validateApplicantLabels(stage, base));
  errors.push(...validateAutomaticDocumentRequests(stage, base));
  return errors;
}
