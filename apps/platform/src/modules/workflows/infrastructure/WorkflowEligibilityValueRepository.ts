import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import type {
  JsonPrimitive,
  JsonValue,
} from "@/modules/conditions/domain/Operand";
import type {
  EligibilityScreeningSourceRequest,
} from "@/modules/eligibility/domain/EligibilityDataResolution";
import {
  resolveChecklistItemFacts,
  resolveDocumentRequirementFacts,
} from "../domain/EvidenceFacts";

export type WorkflowEligibilityValueRecord = {
  sourceDefinitionId: string;
  sourceKey: string;
  sourceRecordId: string;
  sourceVersionId: string | null;
  values: Record<string, JsonValue>;
};

type WorkflowFormRow = {
  fieldId: string;
  fieldKey: string;
  formVersionId: string;
  responseId: string;
  value: JsonValue;
};

type EligibilityQuestionResponseRow = {
  code: string;
  questionId: string;
  responseId: string;
  value: JsonValue;
  versionId: string;
};

export async function readEligibilityQuestionResponseRecords(
  requests: readonly EligibilityScreeningSourceRequest[],
  database: ReturnType<typeof getDatabase> | DatabaseTransaction = getDatabase(),
) {
  const [first] = requests;
  if (!first) return [];
  const questionIds = requests.map((request) =>
    request.binding.sourceDefinitionId
  );
  const result = await database.execute<EligibilityQuestionResponseRow>(sql`
    SELECT binding.question_id AS "questionId",
      binding.version_id AS "versionId", binding.code_snapshot AS code,
      response.id AS "responseId",
      response.values -> binding.code_snapshot AS value
    FROM app_eligibility_rule_set_question_bindings binding
    JOIN app_applications application
      ON application.eligibility_rule_set_version_id = binding.version_id
    JOIN app_workflow_instances workflow
      ON workflow.application_id = application.id
    JOIN app_workflow_stage_instances stage
      ON stage.workflow_instance_id = workflow.id
    JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
      AND definition.code = 'ELIGIBILITY_VERIFICATION'
    JOIN app_form_responses response
      ON response.workflow_task_id = task.id
      AND response.status = 'COMPLETED'
    WHERE application.id = ${first.applicationId}::uuid
      AND binding.question_id = ANY(${questionIds}::uuid[])
      AND response.values ? binding.code_snapshot
  `);
  return result.rows.map((row): WorkflowEligibilityValueRecord => ({
    sourceDefinitionId: row.questionId,
    sourceKey: row.code,
    sourceRecordId: row.responseId,
    sourceVersionId: row.versionId,
    values: { value: row.value },
  }));
}

type TaskRow = {
  completedAt: Date | null;
  definitionId: string;
  result: Record<string, JsonValue> | null;
  sourceKey: string;
  taskId: string;
  workflowVersionId: string;
};

type ChecklistRow = {
  completedAt: Date | null;
  definitionId: string;
  response: JsonPrimitive;
  responsePresent: boolean;
  taskId: string;
  workflowVersionId: string;
};

type DocumentRow = {
  definitionId: string;
  documentVersionId: string | null;
  validUntil: Date | null;
  verificationStatus: "REJECTED" | "VERIFIED" | null;
  versionNumber: number | null;
  workflowVersionId: string;
};

function requestedIds(
  requests: readonly EligibilityScreeningSourceRequest[],
  kind: EligibilityScreeningSourceRequest["binding"]["sourceKind"],
) {
  return requests
    .filter((request) => request.binding.sourceKind === kind)
    .map((request) => request.binding.sourceDefinitionId);
}

async function readWorkflowForms(
  applicationId: string,
  ids: string[],
  database: ReturnType<typeof getDatabase> | DatabaseTransaction,
) {
  if (!ids.length) return [];
  const result = await database.execute<WorkflowFormRow>(sql`
    SELECT field.id AS "fieldId", field.key AS "fieldKey",
      field.form_version_id AS "formVersionId",
      response.id AS "responseId", response.values -> field.key AS value
    FROM app_form_fields field
    JOIN app_form_responses response
      ON response.form_version_id = field.form_version_id
      AND response.status = 'COMPLETED'
    JOIN app_workflow_tasks task ON task.id = response.workflow_task_id
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    WHERE workflow.application_id = ${applicationId}::uuid
      AND field.id = ANY(${ids}::uuid[])
  `);
  return result.rows.map((row): WorkflowEligibilityValueRecord => ({
    sourceDefinitionId: row.fieldId,
    sourceKey: row.fieldKey,
    sourceRecordId: row.responseId,
    sourceVersionId: row.formVersionId,
    values: { value: row.value },
  }));
}

async function readTasks(
  applicationId: string,
  ids: string[],
  database: ReturnType<typeof getDatabase> | DatabaseTransaction,
) {
  if (!ids.length) return [];
  const result = await database.execute<TaskRow>(sql`
    SELECT definition.id AS "definitionId", definition.code AS "sourceKey",
      task.id AS "taskId",
      task.completed_at AS "completedAt", task.result,
      workflow.workflow_template_version_id AS "workflowVersionId"
    FROM app_stage_task_definitions definition
    JOIN app_workflow_tasks task
      ON task.workflow_task_definition_id = definition.id
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    WHERE workflow.application_id = ${applicationId}::uuid
      AND definition.id = ANY(${ids}::uuid[])
  `);
  return result.rows.flatMap((row): WorkflowEligibilityValueRecord[] =>
    row.completedAt && row.result
      ? [{
          sourceDefinitionId: row.definitionId,
          sourceKey: row.sourceKey,
          sourceRecordId: row.taskId,
          sourceVersionId: row.workflowVersionId,
          values: row.result,
        }]
      : []
  );
}

async function readChecklists(
  applicationId: string,
  requests: readonly EligibilityScreeningSourceRequest[],
  database: ReturnType<typeof getDatabase> | DatabaseTransaction,
) {
  const ids = requests.map((request) => request.binding.sourceDefinitionId);
  if (!ids.length) return [];
  const result = await database.execute<ChecklistRow>(sql`
    SELECT checklist.id AS "definitionId", task.id AS "taskId",
      task.completed_at AS "completedAt",
      workflow.workflow_template_version_id AS "workflowVersionId",
      result_item IS NOT NULL AS "responsePresent",
      CASE checklist.response_type
        WHEN 'YES_NO' THEN to_jsonb((result_item ->> 'accepted')::boolean)
        WHEN 'NUMBER' THEN to_jsonb((result_item ->> 'value')::numeric)
        ELSE to_jsonb(result_item ->> 'value')
      END AS response
    FROM app_workflow_stage_checklist_definitions checklist
    JOIN app_stage_task_definitions task_definition
      ON task_definition.stage_id = checklist.stage_id
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(task_definition.config -> 'items') item
        WHERE item ->> 'code' = checklist.key
      )
    JOIN app_workflow_tasks task
      ON task.workflow_task_definition_id = task_definition.id
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    LEFT JOIN LATERAL jsonb_array_elements(
      COALESCE(task.result -> 'items', '[]'::jsonb)
    ) result_item ON result_item ->> 'code' = checklist.key
    WHERE workflow.application_id = ${applicationId}::uuid
      AND checklist.id = ANY(${ids}::uuid[])
  `);
  return requests.flatMap((request): WorkflowEligibilityValueRecord[] => {
    const definitionId = request.binding.sourceDefinitionId;
    const rows = result.rows
      .filter((row) => row.definitionId === definitionId)
      .map((row) => ({
        completedAt: row.completedAt,
        itemDefinitionId: row.definitionId,
        response: row.responsePresent ? row.response : undefined,
        taskId: row.taskId,
      }));
    const facts = resolveChecklistItemFacts(definitionId, rows);
    const latest = rows.toSorted((left, right) =>
      (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0)
    )[0];
    const version = result.rows.find((row) => row.definitionId === definitionId);
    const value = facts[
      request.binding.sourceKey as keyof typeof facts
    ];
    if (value === undefined || typeof value === "object") return [];
    return [{
      sourceDefinitionId: definitionId,
      sourceKey: request.binding.sourceKey,
      sourceRecordId: latest?.taskId ?? definitionId,
      sourceVersionId: version?.workflowVersionId ?? null,
      values: { value },
    }];
  });
}

async function readDocuments(
  applicationId: string,
  requests: readonly EligibilityScreeningSourceRequest[],
  evaluatedAt: Date,
  database: ReturnType<typeof getDatabase> | DatabaseTransaction,
) {
  const ids = requests.map((request) => request.binding.sourceDefinitionId);
  if (!ids.length) return [];
  const result = await database.execute<DocumentRow>(sql`
    SELECT requirement.id AS "definitionId",
      workflow.workflow_template_version_id AS "workflowVersionId",
      document.id AS "documentVersionId", document.valid_until AS "validUntil",
      verification.status AS "verificationStatus",
      document.version_number AS "versionNumber"
    FROM app_workflow_stage_document_requirements requirement
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = requirement.stage_id
    JOIN app_workflow_instances workflow
      ON workflow.workflow_template_version_id = stage_definition.version_id
      AND workflow.application_id = ${applicationId}::uuid
    LEFT JOIN app_workflow_document_evidence_versions document
      ON document.requirement_id = requirement.id
      AND document.application_id = workflow.application_id
    LEFT JOIN app_workflow_document_evidence_verifications verification
      ON verification.document_version_id = document.id
    WHERE requirement.id = ANY(${ids}::uuid[])
  `);
  return requests.flatMap((request): WorkflowEligibilityValueRecord[] => {
    const definitionId = request.binding.sourceDefinitionId;
    const rows = result.rows.filter((row) =>
      row.definitionId === definitionId && row.documentVersionId
    );
    const facts = resolveDocumentRequirementFacts(
      definitionId,
      rows.map((row) => ({
        id: row.documentVersionId!,
        requirementId: definitionId,
        validUntil: row.validUntil,
        verificationStatus: row.verificationStatus,
        versionNumber: row.versionNumber!,
      })),
      evaluatedAt,
    );
    const current = rows.toSorted((left, right) =>
      (right.versionNumber ?? 0) - (left.versionNumber ?? 0)
    )[0];
    const configured = result.rows.find((row) =>
      row.definitionId === definitionId
    );
    const value = facts[
      request.binding.sourceKey as keyof typeof facts
    ];
    if (value === undefined) return [];
    return [{
      sourceDefinitionId: definitionId,
      sourceKey: request.binding.sourceKey,
      sourceRecordId: current?.documentVersionId ?? definitionId,
      sourceVersionId: configured?.workflowVersionId ?? null,
      values: { value },
    }];
  });
}

export async function readWorkflowEligibilityValueRecords(
  requests: readonly EligibilityScreeningSourceRequest[],
  database: ReturnType<typeof getDatabase> | DatabaseTransaction = getDatabase(),
) {
  const applicationId = requests[0]?.applicationId;
  if (!applicationId) return [];
  const evaluatedAt = requests[0]!.evaluatedAt;
  const [forms, tasks, checklists, documents] = await Promise.all([
    readWorkflowForms(
      applicationId,
      requestedIds(requests, "WORKFLOW_FORM_FIELD"),
      database,
    ),
    readTasks(
      applicationId,
      requestedIds(requests, "MANUAL_ASSESSMENT"),
      database,
    ),
    readChecklists(
      applicationId,
      requests.filter((request) =>
        request.binding.sourceKind === "SCREENING_CHECKLIST_ITEM"
      ),
      database,
    ),
    readDocuments(
      applicationId,
      requests.filter((request) =>
        request.binding.sourceKind === "DOCUMENT_REQUIREMENT_FACT"
      ),
      evaluatedAt,
      database,
    ),
  ]);
  return [...forms, ...tasks, ...checklists, ...documents];
}
