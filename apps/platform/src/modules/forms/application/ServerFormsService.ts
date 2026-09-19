import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAnyCapability,
  requireCapability,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createForm,
  cloneFormVersion,
  publishFormVersion,
  retireFormVersion,
  saveFormDraft,
} from "@/modules/forms/infrastructure/FormWriteRepository";
import {
  readFormResponse,
  saveDraftFormResponse,
} from "@/modules/forms/infrastructure/FormResponseRepository";
import {
  completeFormTask,
  readFormTaskCompletion,
} from "@/db/repositories/FormTaskCompletionRepository";
import {
  getFormEditor,
  getFormRuntime,
  listForms,
  listPublishedFormVersions,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  readAssignedFormTask,
  readWorkflowTask,
} from "@/db/repositories/WorkflowTaskRepository";
import {
  RequestValidationError,
  IdempotencyConflictError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  formPublicationErrors,
  validateFormValues,
} from "@/modules/forms/FormValidation";
import {
  captureFormResponseValues,
  InvalidFormRuntimeBindingError,
} from "@/modules/forms/engine/FormRuntimeContext";
import type {
  CreateFormInput,
  FormCommandInput,
  TaskFormSubmissionInput,
  UpdateFormInput,
} from "@/modules/forms/api/FormTransportTypes";
import type { FormVersionSummary } from "@/modules/forms/FormTypes";

function toIso(value: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

function toRequiredIso(value: Date | string) {
  return new Date(value).toISOString();
}

function allowedActions(status: FormVersionSummary["status"]) {
  if (status === "DRAFT") return ["UPDATE", "PUBLISH", "CLONE"];
  if (status === "PUBLISHED") return ["RETIRE", "CLONE"];
  return ["CLONE"];
}

function capturedResponseValues(
  fields: Parameters<typeof captureFormResponseValues>[0],
  values: Record<string, unknown>,
) {
  try {
    return captureFormResponseValues(fields, values);
  } catch (error) {
    if (error instanceof InvalidFormRuntimeBindingError) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
}

function versionView(version: {
  id: string;
  formDefinitionId: string;
  versionNumber: number;
  status: FormVersionSummary["status"];
  instructions: string | null;
  submitLabel: string;
  rowVersion: number;
  createdAt: Date;
  publishedAt: Date | null;
  retiredAt: Date | null;
  [key: string]: unknown;
}): FormVersionSummary {
  return {
    formDefinitionId: version.formDefinitionId,
    id: version.id,
    instructions: version.instructions,
    rowVersion: version.rowVersion,
    status: version.status,
    submitLabel: version.submitLabel,
    versionNumber: version.versionNumber,
    createdAt: toRequiredIso(version.createdAt),
    publishedAt: toIso(version.publishedAt),
    retiredAt: toIso(version.retiredAt),
  };
}

async function editorView(definitionId: string) {
  const editor = await getFormEditor(definitionId);
  if (!editor) throw new ResourceNotFoundError("form");
  return {
    allowedActions: allowedActions(editor.version.status),
    definition: {
      active: editor.definition.active,
      code: editor.definition.code,
      createdAt: editor.definition.createdAt.toISOString(),
      description: editor.definition.description,
      id: editor.definition.id,
      name: editor.definition.name,
      updatedAt: editor.definition.updatedAt.toISOString(),
    },
    fields: editor.fields,
    sections: editor.sections,
    version: versionView(editor.version),
    versions: editor.versions.map(versionView),
  };
}

export async function getForms(user: AuthenticatedUser | null) {
  requireCapability(user, permissionCodes.workflowFormRead);
  return listForms();
}

export async function getPublishedForms(user: AuthenticatedUser | null) {
  requireAnyCapability(user, [
    permissionCodes.workflowFormRead,
    permissionCodes.workflowDefinitionRead,
  ]);
  return listPublishedFormVersions();
}

export async function getForm(user: AuthenticatedUser | null, definitionId: string) {
  requireCapability(user, permissionCodes.workflowFormRead);
  return editorView(definitionId);
}

export async function createNewForm(
  user: AuthenticatedUser | null,
  input: CreateFormInput,
) {
  const actor = requireCapability(user, permissionCodes.workflowFormCreate);
  const created = await createForm({ ...input, actorId: actor.id });
  return editorView(created.definition.id);
}

export async function updateFormDraft(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: UpdateFormInput,
) {
  const actor = requireCapability(user, permissionCodes.workflowFormUpdate);
  const errors = formPublicationErrors(
    input.fields,
    input.submitLabel,
  );
  if (errors.length && input.fields.length > 0) {
    throw new RequestValidationError(errors.join(" "));
  }
  const updated = await saveFormDraft({
    ...input,
    actorId: actor.id,
    definitionId,
  });
  if (!updated) throw new ResourceConflictError("The form draft changed. Refresh and retry.");
  return editorView(definitionId);
}

export async function clonePublishedForm(
  user: AuthenticatedUser | null,
  definitionId: string,
  sourceVersionId: string,
) {
  const actor = requireCapability(user, permissionCodes.workflowFormUpdate);
  const version = await cloneFormVersion({ actorId: actor.id, definitionId, sourceVersionId });
  if (!version) throw new ResourceNotFoundError("form version");
  return editorView(definitionId);
}

export async function publishForm(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: FormCommandInput,
) {
  const actor = requireCapability(user, permissionCodes.workflowFormPublish);
  const result = await publishFormVersion({
    ...input,
    actorId: actor.id,
    definitionId,
  });
  if (result.kind === "invalid") {
    throw new RequestValidationError(result.errors.join(" "));
  }
  if (result.kind === "conflict") {
    throw new ResourceConflictError("The form draft changed. Refresh and retry.");
  }
  return result.version;
}

export async function retireForm(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: FormCommandInput,
) {
  const actor = requireCapability(user, permissionCodes.workflowFormRetire);
  const version = await retireFormVersion({
    ...input,
    actorId: actor.id,
    definitionId,
  });
  if (!version) throw new ResourceConflictError("The form version changed or is not published.");
  return version;
}

export async function getTaskForm(
  user: AuthenticatedUser | null,
  taskInstanceId: string,
) {
  const actor = requireCapability(user, permissionCodes.workflowTaskAssignedRead);
  const task = await readWorkflowTask(actor.id, taskInstanceId);
  if (!task || !task.formVersionId) {
    throw new ResourceNotFoundError("form task");
  }
  const schema = await getFormRuntime(task.formVersionId);
  if (!schema) throw new ResourceNotFoundError("published form");
  const submission = await readFormResponse(taskInstanceId, task.formVersionId);
  return {
    schema,
    submission: submission
      ? {
          ...submission,
          completedAt: toIso(submission.completedAt),
        }
      : null,
    taskRowVersion: task.rowVersion,
  };
}

export async function saveTaskForm(
  user: AuthenticatedUser | null,
  input: TaskFormSubmissionInput & { taskInstanceId: string },
) {
  const actor = requireCapability(
    user,
    permissionCodes.workflowTaskAssignedProcess,
  );
  const task = await readAssignedFormTask(actor.id, input.taskInstanceId);
  if (!task?.formVersionId) throw new ResourceNotFoundError("assigned form task");
  const schema = await getFormRuntime(task.formVersionId);
  if (!schema) throw new ResourceNotFoundError("published form");
  const values = capturedResponseValues(schema.fields, input.values);
  if (!validateFormValues(schema.fields, values, false)) {
    throw new RequestValidationError("The form values are invalid.");
  }
  const saved = await saveDraftFormResponse({
    actorId: actor.id,
    expectedTaskRowVersion: input.expectedTaskRowVersion,
    expectedSubmissionRowVersion: input.expectedSubmissionRowVersion,
    formVersionId: task.formVersionId,
    taskInstanceId: input.taskInstanceId,
    values,
  });
  if (!saved) throw new ResourceConflictError("The saved form changed. Refresh and retry.");
  return saved;
}

export async function completeTaskForm(
  user: AuthenticatedUser | null,
  input: TaskFormSubmissionInput & {
    correlationId: string;
    idempotencyKey: string;
    taskInstanceId: string;
  },
) {
  const actor = requireCapability(
    user,
    permissionCodes.workflowTaskAssignedProcess,
  );
  const replay = await readFormTaskCompletion({
    actorId: actor.id,
    expectedTaskRowVersion: input.expectedTaskRowVersion,
    idempotencyKey: input.idempotencyKey,
    taskInstanceId: input.taskInstanceId,
    values: input.values,
  });
  if (replay?.kind === "completed") return replay.result;
  if (replay?.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used with different task data.",
    );
  }
  const task = await readAssignedFormTask(actor.id, input.taskInstanceId);
  if (!task?.formVersionId) throw new ResourceNotFoundError("assigned form task");
  const schema = await getFormRuntime(task.formVersionId);
  if (!schema) throw new ResourceNotFoundError("published form");
  const values = capturedResponseValues(schema.fields, input.values);
  if (!validateFormValues(schema.fields, values, true)) {
    throw new RequestValidationError("Complete all required form fields with valid values.");
  }
  const result = await completeFormTask({
    actorId: actor.id,
    correlationId: input.correlationId,
    expectedTaskRowVersion: input.expectedTaskRowVersion,
    expectedSubmissionRowVersion: input.expectedSubmissionRowVersion,
    formVersionId: task.formVersionId,
    idempotencyKey: input.idempotencyKey,
    taskInstanceId: input.taskInstanceId,
    values,
  });
  if (result.kind === "completed") return result.result;
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used with different task data.",
    );
  }
  throw new ResourceConflictError("The task changed or is no longer assigned to you.");
}
