import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  WorkflowRfiDetail,
  WorkflowRfiSummary,
} from "../domain/runtime/WorkflowRfiView";
import { workflowRfiDetailedResponseFieldPath } from "../domain/runtime/WorkflowRfi";
import {
  sanitizeWorkflowRfiInstructions,
  sanitizeWorkflowRfiRichText,
} from "./WorkflowRfiInstructions";

type SummaryRow = Omit<
  WorkflowRfiSummary,
  "createdAt" | "deadlineAt" | "respondedAt"
> & {
  createdAt: Date | string;
  deadlineAt: Date | string;
  respondedAt: Date | string | null;
};

type DetailRow = Omit<
  WorkflowRfiDetail,
  "closedAt" | "createdAt" | "deadlineAt" | "expiredAt" | "respondedAt"
> & {
  closedAt: Date | string | null;
  createdAt: Date | string;
  deadlineAt: Date | string;
  expiredAt: Date | string | null;
  respondedAt: Date | string | null;
};

const summarySelection = sql`
  rfi.id,
  rfi.application_id AS "applicationId",
  COALESCE(application.reference, application.id::text)
    AS "applicationReference",
  application.funding_opportunity_title AS "applicationTitle",
  rfi.task_id AS "taskId",
  rfi.status,
  rfi.question,
  rfi.instructions,
  (rfi.status = 'OPEN' AND rfi.deadline_at < now()) AS "isOverdue",
  rfi.deadline_at AS "deadlineAt",
  rfi.row_version AS "rowVersion",
  rfi.created_at AS "createdAt",
  rfi.responded_at AS "respondedAt"
`;

function mapSummary(row: SummaryRow): WorkflowRfiSummary {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    deadlineAt: new Date(row.deadlineAt).toISOString(),
    instructions: sanitizeWorkflowRfiInstructions(row.instructions),
    respondedAt: row.respondedAt
      ? new Date(row.respondedAt).toISOString()
      : null,
  };
}

function scopeCondition(input: {
  actorId?: string;
  applicationId?: string;
  requestInformationId?: string;
  taskId?: string;
}) {
  const conditions: SQL[] = [];
  if (input.actorId) {
    conditions.push(sql`application.owner_user_id = ${input.actorId}::uuid`);
    conditions.push(sql`rfi.recipient_user_id = ${input.actorId}::uuid`);
  }
  if (input.applicationId) {
    conditions.push(sql`rfi.application_id = ${input.applicationId}::uuid`);
  }
  if (input.requestInformationId) {
    conditions.push(sql`rfi.id = ${input.requestInformationId}::uuid`);
  }
  if (input.taskId) conditions.push(sql`rfi.task_id = ${input.taskId}::uuid`);
  return sql.join(conditions, sql` AND `);
}

export async function readOwnedApplicationRfis(input: {
  applicationId: string;
  ownerUserId: string;
}) {
  const result = await getDatabase().execute<SummaryRow>(sql`
    SELECT ${summarySelection}
    FROM app_workflow_rfis rfi
    JOIN app_applications application ON application.id = rfi.application_id
    WHERE ${scopeCondition({
      actorId: input.ownerUserId,
      applicationId: input.applicationId,
    })}
    ORDER BY CASE rfi.status WHEN 'OPEN' THEN 0 WHEN 'RESPONDED' THEN 1 ELSE 2 END,
      rfi.created_at DESC, rfi.id DESC
  `);
  return result.rows.map(mapSummary);
}

export async function readOwnedOpenRfiActions(
  ownerUserId: string,
  limit: number,
) {
  const result = await getDatabase().execute<SummaryRow>(sql`
    SELECT ${summarySelection}
    FROM app_workflow_rfis rfi
    JOIN app_applications application ON application.id = rfi.application_id
    WHERE ${scopeCondition({ actorId: ownerUserId })}
      AND rfi.status = 'OPEN'
    ORDER BY rfi.deadline_at, rfi.created_at, rfi.id
    LIMIT ${limit}
  `);
  return result.rows.map(mapSummary);
}

function detailQuery(condition: SQL) {
  return sql`
    SELECT ${summarySelection},
      rfi.closed_at AS "closedAt",
      rfi.expired_at AS "expiredAt",
      stage_definition.name AS "stageName",
      task_definition.name AS "taskName",
      CASE WHEN draft.rfi_id IS NULL THEN NULL ELSE jsonb_build_object(
        'fieldValues', draft.field_values,
        'rowVersion', draft.row_version,
        'updatedAt', draft.updated_at
      ) END AS draft,
      CASE WHEN response.id IS NULL THEN NULL ELSE jsonb_build_object(
        'fieldValues', response.field_values,
        'respondedAt', response.responded_at
      ) END AS response,
      COALESCE(editable.fields, '[]'::jsonb) AS "editableFields",
      COALESCE(documents.items, '[]'::jsonb) AS "requestedDocuments",
      COALESCE(history.entries, '[]'::jsonb) AS correspondence
    FROM app_workflow_rfis rfi
    JOIN app_applications application ON application.id = rfi.application_id
    JOIN app_workflow_tasks task ON task.id = rfi.task_id
    JOIN app_stage_task_definitions task_definition
      ON task_definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = rfi.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    LEFT JOIN app_application_draft_responses application_response
      ON application_response.id = application.latest_draft_response_id
    LEFT JOIN app_workflow_rfi_drafts draft ON draft.rfi_id = rfi.id
    LEFT JOIN app_workflow_rfi_responses response ON response.rfi_id = rfi.id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'path', requested.path,
        'label', COALESCE(field.label, initcap(replace(requested.path, '_', ' '))),
        'type', CASE
          WHEN requested.path = ${workflowRfiDetailedResponseFieldPath}
            THEN 'RICH_TEXT'
          ELSE COALESCE(NULLIF(field.type, 'DOCUMENT'), 'TEXT')
        END,
        'options', COALESCE(field_options.items, '[]'::jsonb),
        'currentValue', application_response.values -> requested.path
      ) ORDER BY requested.ordinality) AS fields
      FROM jsonb_array_elements_text(rfi.editable_field_paths)
        WITH ORDINALITY requested(path, ordinality)
      LEFT JOIN app_form_fields field
        ON field.form_version_id = application.form_version_id
        AND field.key = requested.path
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'key', option.key,
          'label', option.label,
          'order', option.display_order
        ) ORDER BY option.display_order, option.id) AS items
        FROM app_form_field_options option
        WHERE option.field_id = field.id
      ) field_options ON TRUE
    ) editable ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'requirementId', requirement.id,
        'name', requirement.name,
        'acceptedFileTypes', requirement.accepted_file_types,
        'maximumSizeMb', requirement.maximum_size_mb,
        'evidence', CASE WHEN evidence.id IS NULL THEN NULL ELSE jsonb_build_object(
          'versionId', evidence.id,
          'versionNumber', evidence.version_number,
          'fileName', evidence.original_name,
          'sizeBytes', evidence.size_bytes,
          'uploadedAt', evidence.uploaded_at
        ) END
      ) ORDER BY requirement.name, requirement.id) AS items
      FROM app_workflow_rfi_document_requests document_request
      JOIN app_workflow_stage_document_requirements requirement
        ON requirement.id = document_request.requirement_id
      LEFT JOIN LATERAL (
        SELECT version.id, version.version_number, version.original_name,
          version.size_bytes, version.uploaded_at
        FROM app_workflow_document_evidence_versions version
        WHERE version.application_id = rfi.application_id
          AND version.requirement_id = requirement.id
          AND version.uploaded_by = rfi.recipient_user_id
          AND (version.valid_until IS NULL OR version.valid_until > now())
        ORDER BY version.version_number DESC
        LIMIT 1
      ) evidence ON TRUE
      WHERE document_request.rfi_id = rfi.id
    ) documents ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'id', entry.id,
        'conversationSequence', entry.conversation_sequence,
        'authorName', author.display_name,
        'authorType', entry.author_type,
        'entryType', entry.entry_type,
        'message', entry.message,
        'createdAt', entry.created_at
      ) ORDER BY entry.conversation_sequence) AS entries
      FROM app_workflow_rfi_correspondence entry
      JOIN app_users author ON author.id = entry.author_user_id
      WHERE entry.rfi_id = rfi.id
    ) history ON TRUE
    WHERE ${condition}
    LIMIT 1
  `;
}

function normaliseDetail(row: DetailRow): WorkflowRfiDetail {
  const sanitizeFieldValues = (values: Record<string, unknown>) => ({
    ...values,
    ...(typeof values[workflowRfiDetailedResponseFieldPath] === "string"
      ? {
          [workflowRfiDetailedResponseFieldPath]: sanitizeWorkflowRfiRichText(
            values[workflowRfiDetailedResponseFieldPath],
          ),
        }
      : {}),
  });
  return {
    ...mapSummary(row),
    closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : null,
    correspondence: row.correspondence.map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt).toISOString(),
    })),
    draft: row.draft
      ? {
          ...row.draft,
          fieldValues: sanitizeFieldValues(row.draft.fieldValues),
          updatedAt: new Date(row.draft.updatedAt).toISOString(),
        }
      : null,
    editableFields: row.editableFields,
    expiredAt: row.expiredAt ? new Date(row.expiredAt).toISOString() : null,
    requestedDocuments: row.requestedDocuments.map((document) => ({
      ...document,
      evidence: document.evidence
        ? {
            ...document.evidence,
            uploadedAt: new Date(document.evidence.uploadedAt).toISOString(),
          }
        : null,
    })),
    response: row.response
      ? {
          ...row.response,
          fieldValues: sanitizeFieldValues(row.response.fieldValues),
          respondedAt: new Date(row.response.respondedAt).toISOString(),
        }
      : null,
    stageName: row.stageName,
    taskName: row.taskName,
  };
}

async function readDetail(condition: SQL) {
  const result = await getDatabase().execute<DetailRow>(detailQuery(condition));
  return result.rows[0] ? normaliseDetail(result.rows[0]) : null;
}

export function readOwnedWorkflowRfi(input: {
  applicationId: string;
  ownerUserId: string;
  requestInformationId: string;
}) {
  return readDetail(
    scopeCondition({
      actorId: input.ownerUserId,
      applicationId: input.applicationId,
      requestInformationId: input.requestInformationId,
    }),
  );
}

export function readTaskWorkflowRfi(input: {
  requestInformationId: string;
  taskId: string;
}) {
  return readDetail(scopeCondition(input));
}

export async function readTaskWorkflowRfis(taskId: string) {
  const result = await getDatabase().execute<SummaryRow>(sql`
    SELECT ${summarySelection}
    FROM app_workflow_rfis rfi
    JOIN app_applications application ON application.id = rfi.application_id
    WHERE rfi.task_id = ${taskId}::uuid
    ORDER BY rfi.created_at DESC, rfi.id DESC
  `);
  return result.rows.map(mapSummary);
}

export async function readApplicationWorkflowRfis(applicationId: string) {
  const result = await getDatabase().execute<SummaryRow>(sql`
    SELECT ${summarySelection}
    FROM app_workflow_rfis rfi
    JOIN app_applications application ON application.id = rfi.application_id
    WHERE rfi.application_id = ${applicationId}::uuid
    ORDER BY rfi.created_at DESC, rfi.id DESC
  `);
  return result.rows.map(mapSummary);
}

export async function readAssignedApplicationWorkflowRfis(
  applicationId: string,
  actorId: string,
) {
  const result = await getDatabase().execute<SummaryRow>(sql`
    SELECT ${summarySelection}
    FROM app_workflow_rfis rfi
    JOIN app_applications application ON application.id = rfi.application_id
    JOIN app_workflow_tasks assigned_task ON assigned_task.id = rfi.task_id
    WHERE rfi.application_id = ${applicationId}::uuid
      AND (
        assigned_task.assigned_user_id = ${actorId}::uuid
        OR assigned_task.assigned_role_id IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )
    ORDER BY rfi.created_at DESC, rfi.id DESC
  `);
  return result.rows.map(mapSummary);
}
