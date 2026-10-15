import "server-only";
import type { DatabaseTransaction } from "@/platform/database/client";

import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  findConfigurationReferences,
  listWorkflowAssignmentOptions,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { toWorkflowEditor } from "@/modules/workflows/api/WorkflowRepresentation";
import type {
  WorkflowGraphInput,
  WorkflowValidation,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  formPurposes,
  type FormPurpose,
} from "@/modules/forms/domain/FormPurpose";
import { workflowTaskFormPurposes } from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { validateWorkflowConditions } from "@/modules/workflows/engine/WorkflowConditionValidation";
import { validateWorkflowScoring } from "../../engine/WorkflowScoringValidation";

export class WorkflowNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("workflow version");
  }
}

export class WorkflowConflictError extends ResourceConflictError {
  constructor(
    message = "The workflow changed in another session. Reload it and try again.",
  ) {
    super(message);
  }
}

export function requireWorkflowIdempotencyKey(value?: string | null) {
  if (!value?.trim())
    throw new WorkflowConflictError("An Idempotency-Key header is required.");
  return value.trim();
}

export async function loadWorkflowEditor(versionId: string) {
  const record = await findWorkflowGraph(versionId);
  if (!record) throw new WorkflowNotFoundError();
  return record;
}

async function validateReferences(
  graph: WorkflowGraphInput,
  validation: WorkflowValidation,
  references: Awaited<ReturnType<typeof findConfigurationReferences>>,
  allowDraftForms = false,
) {
  graph.stages.forEach((stage, index) => {
    if (stage.coiGated && !stage.coiFormVersionId) {
      validation.errors.push({
        code: "COI_FORM_VERSION_REQUIRED",
        message: "Select an exact COI form version for this stage.",
        path: `stages.${index}.coiFormVersionId`,
      });
    }
    if (
      stage.coiFormVersionId &&
      (!formIsPublishable(
        references.forms.get(stage.coiFormVersionId),
        allowDraftForms,
      ) ||
        references.formPurposes.get(stage.coiFormVersionId) !== "COI")
    ) {
      validation.errors.push({
        code: "INVALID_COI_FORM_VERSION",
        message: "The selected COI form must be an exact COI version.",
        path: `stages.${index}.coiFormVersionId`,
      });
    }
    stage.actions.forEach((action, actionIndex) => {
      action.notifications?.forEach((notification, notificationIndex) => {
        const invalidUser =
          notification.recipientType === "SPECIFIC_USER" &&
          references.users.get(notification.recipientId!) !== "active";
        const invalidRole =
          notification.recipientType === "SPECIFIC_ROLE" &&
          !references.roles.has(notification.recipientId!);
        if (invalidUser || invalidRole) {
          validation.errors.push({
            code: "INVALID_NOTIFICATION_RECIPIENT",
            message: "Select an active notification recipient.",
            path: `stages.${index}.actions.${actionIndex}.notifications.${notificationIndex}.recipientId`,
          });
        }
      });
      if (action.actionType !== "ESCALATE") return;
      const path = `stages.${index}.actions.${actionIndex}.configuration.targetId`;
      if (
        action.configuration.targetType === "ROLE" &&
        !references.roles.has(action.configuration.targetId)
      ) {
        validation.errors.push({
          code: "UNKNOWN_ESCALATION_ROLE",
          message: "The escalation role is not active.",
          path,
        });
      }
      if (
        action.configuration.targetType === "USER" &&
        references.users.get(action.configuration.targetId) !== "active"
      ) {
        validation.errors.push({
          code: "INACTIVE_ESCALATION_USER",
          message: "The escalation user is not active.",
          path,
        });
      }
    });
    stage.tasks.forEach((task, taskIndex) => {
      if (task.roleId && !references.roles.has(task.roleId)) {
        validation.errors.push({
          code: "UNKNOWN_ROLE",
          message: "The assigned role is not active.",
          path: `stages.${index}.tasks.${taskIndex}.roleId`,
        });
      }
      const configuredPurpose =
        task.config &&
        typeof task.config === "object" &&
        "formPurpose" in task.config &&
        formPurposes.includes(task.config.formPurpose as FormPurpose)
          ? (task.config.formPurpose as FormPurpose)
          : null;
      const configuredFormBinding =
        configuredPurpose === "ELIGIBILITY_VERIFICATION"
          ? null
          : task.formBinding;
      if (
        configuredFormBinding &&
        !formIsPublishable(
          references.forms.get(configuredFormBinding.formVersionId),
          allowDraftForms,
        )
      ) {
        validation.errors.push({
          code: "INVALID_FORM_VERSION",
          message:
            "New workflow tasks must reference a draft or published form version.",
          path: `stages.${index}.tasks.${taskIndex}.formBinding.formVersionId`,
        });
      }
      if (
        configuredPurpose &&
        !workflowTaskFormPurposes.some(
          (purpose) => purpose === configuredPurpose,
        )
      ) {
        validation.errors.push({
          code: "UNSUPPORTED_TASK_FORM_PURPOSE",
          message:
            "Task forms must be for application review or eligibility verification.",
          path: `stages.${index}.tasks.${taskIndex}.config.formPurpose`,
        });
      }
      if (configuredFormBinding && !configuredPurpose) {
        validation.errors.push({
          code: "FORM_PURPOSE_REQUIRED",
          message: "Select a purpose for the bound task form.",
          path: `stages.${index}.tasks.${taskIndex}.config.formPurpose`,
        });
      }
      if (
        configuredFormBinding &&
        configuredPurpose &&
        references.formPurposes.get(configuredFormBinding.formVersionId) !==
          configuredPurpose
      ) {
        validation.errors.push({
          code: "FORM_PURPOSE_MISMATCH",
          message: "The selected form purpose does not match this task.",
          path: `stages.${index}.tasks.${taskIndex}.formBinding.formVersionId`,
        });
      }
      if (
        task.namedUserOverrideId &&
        references.users.get(task.namedUserOverrideId) !== "active"
      ) {
        validation.errors.push({
          code: "INACTIVE_USER",
          message: "The assigned user is not active.",
          path: `stages.${index}.tasks.${taskIndex}.namedUserOverrideId`,
        });
      }
    });
  });
  validation.errors.push(
    ...validateWorkflowConditions(graph, references.formFields),
    ...validateWorkflowScoring(graph, references.formFields),
  );
  validation.valid = validation.errors.length === 0;
  return validation;
}

function formIsPublishable(
  status: string | undefined,
  allowDraftForms: boolean,
) {
  return status === "PUBLISHED" || (allowDraftForms && status === "DRAFT");
}

export async function validateWorkflowConfiguration(
  graph: WorkflowGraphInput,
  allowDraftForms = true,
  database?: Pick<DatabaseTransaction, "select">,
) {
  return validateReferences(
    graph,
    validateWorkflowGraph(graph),
    await (database
      ? findConfigurationReferences(graph, database)
      : findConfigurationReferences(graph)),
    allowDraftForms,
  );
}

export async function workflowEditorView(
  versionId: string,
  includeAssignmentOptions = true,
) {
  return workflowEditorViewFromRecord(
    await loadWorkflowEditor(versionId),
    includeAssignmentOptions,
  );
}

export async function workflowEditorViewFromRecord(
  record: Awaited<ReturnType<typeof loadWorkflowEditor>>,
  includeAssignmentOptions = true,
) {
  const [validation, assignmentOptions] = await Promise.all([
    validateWorkflowConfiguration(record.graph),
    includeAssignmentOptions ? listWorkflowAssignmentOptions() : undefined,
  ]);
  return {
    ...toWorkflowEditor(record, validation),
    ...(assignmentOptions ? { assignmentOptions } : {}),
  };
}
