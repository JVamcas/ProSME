import { validateTaskConfiguration } from "./WorkflowTaskRegistry";
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
  if (
    !task.formVersionId &&
    !validateTaskConfiguration(task.type, task.config).success
  ) {
    errors.push(
      issue(
        "INVALID_TASK_CONFIG",
        `${task.name} has invalid ${task.type} configuration.`,
        `${taskPath}.config`,
      ),
    );
  }
  if (!task.formVersionId && task.type === "STRUCTURED_FORM") {
    errors.push(
      issue(
        "MISSING_FORM_VERSION",
        `${task.name} must reference a published form version.`,
        `${taskPath}.formVersionId`,
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
  if (
    task.quorum &&
    (task.reviewerCount < 2 ||
      task.requiredCompletionCount * 2 <= task.reviewerCount)
  ) {
    errors.push(
      issue(
        "INVALID_QUORUM",
        `${task.name} must require a majority of at least two reviewers for quorum.`,
        `${taskPath}.quorum`,
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
  stage.tasks.forEach((task, taskIndex) => {
    errors.push(...validateTaskIdentity(task, base, taskIndex));
  });
  errors.push(...validateApplicantLabels(stage, base));
  return errors;
}
