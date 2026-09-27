import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  WorkflowCoiReplacementCandidate,
  WorkflowCoiReviewDetail,
  WorkflowCoiReviewListInput,
  WorkflowCoiReviewRow,
} from "../api/WorkflowCoiReviewTypes";

type ReviewDatabaseRow = Omit<WorkflowCoiReviewRow, "submittedAt"> & {
  submittedAt: Date | string;
  totalCount: number;
};

function searchFilter(search?: string) {
  if (!search) return sql`TRUE`;
  const pattern = `%${search}%`;
  return sql`(
    definition.name ILIKE ${pattern}
    OR stage_definition.name ILIKE ${pattern}
    OR application.reference ILIKE ${pattern}
    OR assignee.display_name ILIKE ${pattern}
    OR assigned_role.name ILIKE ${pattern}
  )`;
}

export async function readPendingWorkflowCoiReviews(
  actorId: string,
  input: WorkflowCoiReviewListInput,
) {
  const offset = (input.page - 1) * input.pageSize;
  const result = await getDatabase().execute(sql`
    WITH pending AS (
      SELECT task.id AS "taskId", definition.name AS "taskName",
        stage_definition.name AS "stageName",
        application.reference AS "applicationReference",
        assignee.display_name AS "assignedUserName",
        assigned_role.name AS "assignedRoleName",
        disclosure.occurred_at AS "submittedAt"
      FROM app_workflow_tasks task
      JOIN app_stage_task_definitions definition
        ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.workflow_stage_definition_id
      JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
      JOIN app_applications application ON application.id = workflow.application_id
      JOIN app_users assignee ON assignee.id = task.assigned_user_id
      LEFT JOIN app_roles assigned_role ON assigned_role.id = task.assigned_role_id
      JOIN app_workflow_application_coi clearance ON clearance.task_id = task.id
      JOIN LATERAL (
        SELECT event.occurred_at
        FROM app_workflow_application_coi_events event
        WHERE event.task_id = task.id AND event.to_state = 'PENDING_REVIEW'
        ORDER BY event.occurred_at DESC, event.id DESC
        LIMIT 1
      ) disclosure ON TRUE
      WHERE clearance.state = 'PENDING_REVIEW'
        AND clearance.user_id <> ${actorId}::uuid
        AND task.status IN ('PENDING', 'IN_PROGRESS')
        AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
        AND ${searchFilter(input.search)}
    )
    SELECT pending.*, count(*) OVER ()::integer AS "totalCount"
    FROM pending
    ORDER BY "submittedAt" ASC, "taskId" ASC
    LIMIT ${input.pageSize} OFFSET ${offset}
  `);
  const rows = result.rows as unknown as ReviewDatabaseRow[];
  return {
    items: rows.map((databaseRow) => {
      const { totalCount, ...row } = databaseRow;
      void totalCount;
      return {
        ...row,
        submittedAt: new Date(row.submittedAt).toISOString(),
      };
    }),
    total: rows[0]?.totalCount ?? 0,
  };
}

type ReviewDetailDatabaseRow = Omit<
  WorkflowCoiReviewDetail,
  "replacementCandidates" | "submittedAt"
> & {
  applicationId: string;
  stageInstanceId: string;
  submittedAt: Date | string;
  workflowTaskDefinitionId: string;
};

async function readReplacementCandidates(input: {
  applicationId: string;
  stageInstanceId: string;
  subjectUserId: string;
  taskId: string;
  workflowTaskDefinitionId: string;
}): Promise<WorkflowCoiReplacementCandidate[]> {
  const result = await getDatabase().execute(sql`
    SELECT DISTINCT candidate.id, candidate.display_name AS "displayName"
    FROM app_stage_task_definitions definition
    JOIN app_user_roles membership
      ON membership.role_id = definition.assignment_role_id
    JOIN app_users candidate ON candidate.id = membership.user_id
    WHERE definition.id = ${input.workflowTaskDefinitionId}::uuid
      AND definition.assignment_mode = 'ROLE'
      AND candidate.id <> ${input.subjectUserId}::uuid
      AND candidate.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM (VALUES
          (definition.permissions ->> 'view'),
          (definition.permissions ->> 'edit'),
          (definition.permissions ->> 'decide')
        ) required(code)
        WHERE NOT EXISTS (
          SELECT 1 FROM app_role_capabilities grant_record
          JOIN app_capabilities capability
            ON capability.id = grant_record.capability_id
          JOIN app_user_roles granted_role
            ON granted_role.role_id = grant_record.role_id
          WHERE granted_role.user_id = candidate.id
            AND capability.code = required.code
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_application_coi prior_clearance
        WHERE prior_clearance.application_id = ${input.applicationId}::uuid
          AND prior_clearance.user_id = candidate.id
          AND prior_clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')
      )
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks sibling
        WHERE sibling.stage_instance_id = ${input.stageInstanceId}::uuid
          AND sibling.workflow_task_definition_id = definition.id
          AND sibling.id <> ${input.taskId}::uuid
          AND sibling.assigned_user_id = candidate.id
          AND sibling.status <> 'CANCELLED'
      )
    ORDER BY candidate.display_name, candidate.id
  `);
  return result.rows as WorkflowCoiReplacementCandidate[];
}

export async function readPendingWorkflowCoiReview(
  actorId: string,
  taskId: string,
): Promise<WorkflowCoiReviewDetail | null> {
  const result = await getDatabase().execute(sql`
    SELECT task.id AS "taskId", definition.name AS "taskName",
      task.row_version AS "rowVersion",
      workflow.application_id AS "applicationId",
      task.stage_instance_id AS "stageInstanceId",
      task.workflow_task_definition_id AS "workflowTaskDefinitionId",
      stage_definition.name AS "stageName",
      application.reference AS "applicationReference",
      applicant.display_name AS "applicantName",
      NULLIF(COALESCE(business.trading_name, business.legal_name), '')
        AS "businessName",
      clearance.user_id AS "subjectUserId",
      assignee.display_name AS "assignedUserName",
      assigned_role.name AS "assignedRoleName",
      disclosure.disclosure_text AS "disclosureText",
      disclosure.occurred_at AS "submittedAt"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    JOIN app_users applicant ON applicant.id = application.owner_user_id
    JOIN app_users assignee ON assignee.id = task.assigned_user_id
    LEFT JOIN app_business_profiles business
      ON business.id::text = application.business_section ->> 'businessId'
    LEFT JOIN app_roles assigned_role ON assigned_role.id = task.assigned_role_id
    JOIN app_workflow_application_coi clearance ON clearance.task_id = task.id
    JOIN LATERAL (
      SELECT event.disclosure_text, event.occurred_at
      FROM app_workflow_application_coi_events event
      WHERE event.task_id = task.id AND event.to_state = 'PENDING_REVIEW'
      ORDER BY event.occurred_at DESC, event.id DESC
      LIMIT 1
    ) disclosure ON TRUE
    WHERE task.id = ${taskId}::uuid
      AND clearance.state = 'PENDING_REVIEW'
      AND clearance.user_id <> ${actorId}::uuid
      AND task.status IN ('PENDING', 'IN_PROGRESS')
      AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
  `);
  const row = result.rows[0] as ReviewDetailDatabaseRow | undefined;
  if (!row) return null;
  const replacementCandidates = await readReplacementCandidates(row);
  const {
    applicationId: _applicationId,
    stageInstanceId: _stageInstanceId,
    workflowTaskDefinitionId: _workflowTaskDefinitionId,
    ...detail
  } = row;
  void _applicationId;
  void _stageInstanceId;
  void _workflowTaskDefinitionId;
  return {
    ...detail,
    replacementCandidates,
    submittedAt: new Date(row.submittedAt).toISOString(),
  };
}
