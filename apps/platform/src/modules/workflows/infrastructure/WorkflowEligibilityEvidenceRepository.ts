import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { JsonPrimitive } from "@/modules/conditions/domain/Operand";
import {
  resolveChecklistItemFacts,
  resolveDocumentRequirementFacts,
  type ChecklistItemFacts,
  type DocumentRequirementFacts,
} from "../domain/EvidenceFacts";
import {
  workflowDocumentEvidenceVerifications,
  workflowDocumentEvidenceVersions,
} from "./workflow-evidence.schema";

type ChecklistFactRow = {
  completedAt: Date | null;
  itemDefinitionId: string;
  response: JsonPrimitive;
  responsePresent: boolean;
  taskId: string;
};

function emptyDocumentFacts(
  requirementIds: readonly string[],
  evaluatedAt: Date,
) {
  return requirementIds.map((requirementId) =>
    resolveDocumentRequirementFacts(requirementId, [], evaluatedAt)
  );
}

export async function readDocumentRequirementFacts(
  applicationId: string,
  requirementIds: readonly string[],
  evaluatedAt: Date,
): Promise<DocumentRequirementFacts[]> {
  if (!requirementIds.length) return [];
  const rows = await getDatabase()
    .select({
      id: workflowDocumentEvidenceVersions.id,
      requirementId: workflowDocumentEvidenceVersions.requirementId,
      validUntil: workflowDocumentEvidenceVersions.validUntil,
      verificationStatus: workflowDocumentEvidenceVerifications.status,
      versionNumber: workflowDocumentEvidenceVersions.versionNumber,
    })
    .from(workflowDocumentEvidenceVersions)
    .leftJoin(
      workflowDocumentEvidenceVerifications,
      eq(
        workflowDocumentEvidenceVerifications.documentVersionId,
        workflowDocumentEvidenceVersions.id,
      ),
    )
    .where(and(
      eq(workflowDocumentEvidenceVersions.applicationId, applicationId),
      inArray(workflowDocumentEvidenceVersions.requirementId, [
        ...requirementIds,
      ]),
    ));
  if (!rows.length) return emptyDocumentFacts(requirementIds, evaluatedAt);
  return requirementIds.map((requirementId) =>
    resolveDocumentRequirementFacts(requirementId, rows, evaluatedAt)
  );
}

export async function readScreeningChecklistItemFacts(
  applicationId: string,
  itemDefinitionIds: readonly string[],
): Promise<ChecklistItemFacts[]> {
  if (!itemDefinitionIds.length) return [];
  const result = await getDatabase().execute<ChecklistFactRow>(sql`
      SELECT checklist.id AS "itemDefinitionId", task.id AS "taskId",
        task.completed_at AS "completedAt",
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
          SELECT 1
          FROM jsonb_array_elements(task_definition.config -> 'items') item
          WHERE item ->> 'code' = checklist.key
        )
      JOIN app_workflow_tasks task
        ON task.workflow_task_definition_id = task_definition.id
      JOIN app_workflow_stage_instances stage_instance
        ON stage_instance.id = task.stage_instance_id
      JOIN app_workflow_instances workflow
        ON workflow.id = stage_instance.workflow_instance_id
      LEFT JOIN LATERAL jsonb_array_elements(
        COALESCE(task.result -> 'items', '[]'::jsonb)
      ) result_item ON result_item ->> 'code' = checklist.key
      WHERE workflow.application_id = ${applicationId}::uuid
        AND checklist.id = ANY(${itemDefinitionIds}::uuid[])
  `);
  const rows = result.rows.map((row) => ({
    ...row,
    response: row.responsePresent ? row.response : undefined,
  }));
  return itemDefinitionIds.map((itemDefinitionId) =>
    resolveChecklistItemFacts(itemDefinitionId, rows)
  );
}
