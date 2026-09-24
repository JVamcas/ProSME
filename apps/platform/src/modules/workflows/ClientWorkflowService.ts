"use client";

import { requestData } from "@/lib/client-http";
import type { FundingOpportunityPage } from "@/modules/funding-calls/FundingOpportunityTypes";
import type {
  CreateWorkflowInput,
  OpportunityAssignmentInput,
  UpdateWorkflowDraftInput,
  UpdateWorkflowDetailsInput,
} from "@/modules/workflows/api/WorkflowTransportTypes";
import type {
  PublishedWorkflowOption,
  WorkflowDefinitionSummary,
  WorkflowEditorView,
  WorkflowOpportunityAssignment,
  WorkflowValidation,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { CreateWorkflowTemplateInput } from "@/modules/workflows/api/WorkflowTemplateSchemas";
import type { WorkflowTemplateListItem, WorkflowTemplatePage } from "@/modules/workflows/domain/definitions/WorkflowTemplate";
import type { WorkflowActionAvailability } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";

export type WorkflowActionAvailabilityQuery = {
  sourceStageInstanceId: string;
  taskId?: string;
  workflowInstanceId: string;
};

const jsonHeaders = { "Content-Type": "application/json" };

function commandHeaders() {
  return { ...jsonHeaders, "Idempotency-Key": crypto.randomUUID() };
}

function listTemplates(page: number, pageSize: number) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return requestData<WorkflowTemplatePage>(`/api/workflows?${query}`, {
    cache: "no-store",
  });
}

function getActionAvailability(input: WorkflowActionAvailabilityQuery) {
  const query = new URLSearchParams({
    sourceStageInstanceId: input.sourceStageInstanceId,
  });
  if (input.taskId) query.set("taskId", input.taskId);
  return requestData<WorkflowActionAvailability[]>(
    `/api/workflows/${input.workflowInstanceId}/actions?${query}`,
    { cache: "no-store" },
  );
}

function createTemplate(input: CreateWorkflowTemplateInput) {
  return requestData<WorkflowTemplateListItem>("/api/workflows", {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "POST",
  });
}

function listDefinitions() {
  return requestData<WorkflowDefinitionSummary[]>(
    "/api/admin/workflow-definitions",
    { cache: "no-store" },
  );
}

function listPublished() {
  return requestData<PublishedWorkflowOption[]>(
    "/api/admin/workflow-definitions/published",
    { cache: "no-store" },
  );
}

function getEditor(definitionId: string) {
  return requestData<WorkflowEditorView>(
    `/api/admin/workflow-definitions/${definitionId}/draft`,
    { cache: "no-store" },
  );
}

function createDefinition(input: CreateWorkflowInput) {
  return requestData<WorkflowEditorView>("/api/admin/workflow-definitions", {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "POST",
  });
}

function updateDraft(definitionId: string, input: UpdateWorkflowDraftInput) {
  return requestData<WorkflowEditorView>(
    `/api/admin/workflow-definitions/${definitionId}/draft`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "PATCH",
    },
  );
}

function updateDetails(
  definitionId: string,
  input: UpdateWorkflowDetailsInput,
) {
  return requestData<WorkflowEditorView>(
    `/api/admin/workflow-definitions/${definitionId}`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "PATCH",
    },
  );
}

function validateDefinition(definitionId: string) {
  return requestData<WorkflowValidation>(
    `/api/admin/workflow-definitions/${definitionId}/validate`,
    { method: "POST" },
  );
}

function lifecycleCommand(
  definitionId: string,
  action: "publish" | "retire",
  editor: WorkflowEditorView,
) {
  return requestData<WorkflowEditorView>(
    `/api/admin/workflow-definitions/${definitionId}/${action}`,
    {
      body: JSON.stringify({
        expectedRowVersion: editor.version.rowVersion,
        versionId: editor.version.id,
      }),
      headers: commandHeaders(),
      method: "POST",
    },
  );
}

function cloneDefinition(definitionId: string, sourceVersionId: string) {
  return requestData<WorkflowEditorView>(
    `/api/admin/workflow-definitions/${definitionId}/clone`,
    {
      body: JSON.stringify({ sourceVersionId }),
      headers: jsonHeaders,
      method: "POST",
    },
  );
}

function deleteDefinition(
  definitionId: string,
  versionId: string,
  expectedRowVersion: number,
) {
  return requestData<{ id: string }>(
    `/api/admin/workflow-definitions/${definitionId}`,
    {
      body: JSON.stringify({ expectedRowVersion, versionId }),
      headers: jsonHeaders,
      method: "DELETE",
    },
  );
}

function listAssignments() {
  return requestData<WorkflowOpportunityAssignment[]>(
    "/api/admin/workflow-assignments",
    { cache: "no-store" },
  );
}

function listOpportunities() {
  return requestData<FundingOpportunityPage>(
    "/api/admin/workflow-opportunities",
    { cache: "no-store" },
  );
}

function assignOpportunity(input: OpportunityAssignmentInput) {
  return requestData<WorkflowOpportunityAssignment>(
    "/api/admin/workflow-assignments",
    {
      body: JSON.stringify(input),
      headers: commandHeaders(),
      method: "PUT",
    },
  );
}

export const clientWorkflowService = {
  assignOpportunity,
  cloneDefinition,
  createTemplate,
  createDefinition,
  deleteDefinition,
  getActionAvailability,
  getEditor,
  lifecycleCommand,
  listAssignments,
  listDefinitions,
  listOpportunities,
  listPublished,
  listTemplates,
  updateDraft,
  updateDetails,
  validateDefinition,
};
