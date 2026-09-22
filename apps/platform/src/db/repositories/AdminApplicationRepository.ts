import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { AdminApplicationCursor } from "@/modules/applications/AdminApplicationCursor";
import type {
  AdminApplicationOverview,
  AdminApplicationStage,
  AdminApplicationListInput,
  AdminApplicationListRow,
} from "@/modules/applications/ApplicationTypes";

type DatabaseRow = Omit<
  AdminApplicationListRow,
  "dueAt" | "requestedAmount" | "submittedAt"
> & {
  dueAt: Date | string | null;
  requestedAmount: number | string | null;
  submittedAt: Date | string;
  totalCount: number;
};

type DetailDatabaseRow = Omit<
  AdminApplicationOverview,
  "coFunding" | "requestedAmount" | "stages" | "submittedAt"
> & {
  coFunding: number | string | null;
  requestedAmount: number | string | null;
  stages: Array<
    Omit<AdminApplicationStage, "endedAt" | "startedAt"> & {
      endedAt: Date | string | null;
      startedAt: Date | string | null;
    }
  >;
  submittedAt: Date | string;
};

function visibilityFilter(
  actorId: string,
  visibility: "all" | "assigned",
) {
  if (visibility === "all") return sql`TRUE`;
  return sql`EXISTS (
    SELECT 1
    FROM app_workflow_tasks visible_task
    JOIN app_workflow_stage_instances visible_stage
      ON visible_stage.id = visible_task.stage_instance_id
    WHERE visible_stage.workflow_instance_id = workflow.id
      AND visible_stage.status IN ('ACTIVE', 'BLOCKED')
      AND visible_task.status IN ('PENDING', 'CLAIMED', 'IN_PROGRESS')
      AND (
        visible_task.assigned_user_id = ${actorId}::uuid
        OR visible_task.assigned_role_id IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )
  )`;
}

function statusFilter(status: AdminApplicationListInput["status"]) {
  if (status === "all") return sql`TRUE`;
  const code = status.replaceAll("-", "_").toUpperCase();
  return sql`COALESCE(
    workflow.public_status->>'status',
    stage_definition.applicant_status,
    'SUBMITTED'
  ) = ${code}`;
}

function applicationSearch(search?: string) {
  if (!search) return sql`TRUE`;
  const pattern = `%${search}%`;
  return sql`(
    application.reference ILIKE ${pattern}
    OR applicant.display_name ILIKE ${pattern}
    OR business.legal_name ILIKE ${pattern}
    OR business.trading_name ILIKE ${pattern}
    OR application.funding_opportunity_title ILIKE ${pattern}
  )`;
}

function stageFilter(stage?: string) {
  return stage
    ? sql`stage_definition.name ILIKE ${`%${stage}%`}`
    : sql`TRUE`;
}

function cursorFilter(cursor?: AdminApplicationCursor) {
  if (!cursor) return sql`TRUE`;
  return sql`(
    "submittedAt" < ${cursor.submittedAt}
    OR ("submittedAt" = ${cursor.submittedAt}
      AND "applicationId" < ${cursor.id}::uuid)
  )`;
}

function applicationQuery(input: {
  actorId: string;
  cursor?: AdminApplicationCursor;
  filters: AdminApplicationListInput;
  visibility: "all" | "assigned";
}) {
  return sql`
    WITH filtered AS (
      SELECT
        application.id AS "applicationId",
        application.reference AS "reference",
        NULLIF(COALESCE(business.trading_name, business.legal_name), '') AS "businessName",
        applicant.display_name AS "applicantName",
        application.funding_opportunity_title AS "fundingCallTitle",
        NULLIF(application.financial_section ->> 'amountRequested', '')::numeric AS "requestedAmount",
        application.submitted_at AS "submittedAt",
        COALESCE(workflow.terminal_outcome, stage_definition.name, 'Submitted')
          AS "internalStatus",
        COALESCE(
          workflow.public_status->>'status',
          stage_definition.applicant_status,
          'SUBMITTED'
        ) AS "applicantStatus",
        stage_definition.name AS "activeStageName",
        COALESCE(task_summary.active_count, 0)::integer AS "activeTaskCount",
        task_summary.role_names AS "assignedRoleName",
        task_summary.user_names AS "assignedUserName",
        task_summary.due_at AS "dueAt",
        NULL::text AS "priority",
        application.row_version AS "rowVersion"
      FROM app_applications application
      JOIN app_users applicant ON applicant.id = application.owner_user_id
      LEFT JOIN app_business_profiles business
        ON business.id::text = application.business_section ->> 'businessId'
      LEFT JOIN app_workflow_instances workflow ON workflow.application_id = application.id
      LEFT JOIN app_workflow_stage_instances stage
        ON stage.id = workflow.current_stage_instance_id
      LEFT JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.workflow_stage_definition_id
      LEFT JOIN LATERAL (
        SELECT count(*) AS active_count,
          string_agg(DISTINCT role.name, ', ') AS role_names,
          string_agg(DISTINCT assignee.display_name, ', ') AS user_names,
          min(task.due_at) AS due_at
        FROM app_workflow_tasks task
        LEFT JOIN app_roles role ON role.id = task.assigned_role_id
        LEFT JOIN app_users assignee ON assignee.id = task.assigned_user_id
        WHERE task.stage_instance_id = stage.id
          AND task.status IN ('PENDING', 'CLAIMED', 'IN_PROGRESS')
      ) task_summary ON TRUE
      WHERE application.status = 'submitted'
        AND ${visibilityFilter(input.actorId, input.visibility)}
        AND ${statusFilter(input.filters.status)}
        AND ${applicationSearch(input.filters.search)}
        AND ${stageFilter(input.filters.stage)}
    )
    SELECT filtered.*, (SELECT count(*)::integer FROM filtered) AS "totalCount"
    FROM filtered
    WHERE ${cursorFilter(input.cursor)}
    ORDER BY "submittedAt" DESC, "applicationId" DESC
    LIMIT ${input.filters.limit + 1}
  `;
}

function toListRow(row: DatabaseRow): AdminApplicationListRow {
  return {
    ...row,
    dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
    requestedAmount:
      row.requestedAmount === null ? null : Number(row.requestedAmount),
    submittedAt: new Date(row.submittedAt).toISOString(),
  };
}

export async function readAdminApplications(input: {
  actorId: string;
  cursor?: AdminApplicationCursor;
  filters: AdminApplicationListInput;
  visibility: "all" | "assigned";
}) {
  const result = await getDatabase().execute(applicationQuery(input));
  const rows = result.rows as unknown as DatabaseRow[];
  return { items: rows.map(toListRow), total: rows[0]?.totalCount ?? 0 };
}

function detailQuery(input: {
  actorId: string;
  applicationId: string;
  visibility: "all" | "assigned";
}) {
  return sql`
    SELECT application.id AS "applicationId",
      COALESCE(application.reference, application.id::text) AS reference,
      applicant.display_name AS "applicantName",
      NULLIF(COALESCE(business.trading_name, business.legal_name), '') AS "businessName",
      business.business_type AS "businessType",
      business.sector AS industry,
      business.region AS location,
      application.funding_opportunity_title AS "opportunityTitle",
      NULLIF(application.financial_section ->> 'amountRequested', '')::numeric
        AS "requestedAmount",
      NULLIF(application.financial_section ->> 'applicantContribution', '')::numeric
        AS "coFunding",
      application.submitted_at AS "submittedAt",
      stage_definition.name AS "currentStageName",
      NULL::text AS priority,
      COALESCE(stage_timeline.stages, '[]'::jsonb) AS stages
    FROM app_applications application
    JOIN app_users applicant ON applicant.id = application.owner_user_id
    LEFT JOIN app_business_profiles business
      ON business.id::text = application.business_section ->> 'businessId'
    LEFT JOIN app_workflow_instances workflow
      ON workflow.application_id = application.id
    LEFT JOIN app_workflow_stage_instances stage
      ON stage.id = workflow.current_stage_instance_id
    LEFT JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'endedAt', stage_instance.completed_at,
          'name', definition.name,
          'startedAt', stage_instance.activated_at,
          'status', COALESCE(stage_instance.status, 'NOT_STARTED')
        ) ORDER BY definition.sequence
      ) AS stages
      FROM app_workflow_stage_definitions definition
      LEFT JOIN app_workflow_stage_instances stage_instance
        ON stage_instance.workflow_stage_definition_id = definition.id
        AND stage_instance.workflow_instance_id = workflow.id
      WHERE definition.version_id = workflow.workflow_template_version_id
    ) stage_timeline ON TRUE
    WHERE application.id = ${input.applicationId}::uuid
      AND application.status = 'submitted'
      AND ${visibilityFilter(input.actorId, input.visibility)}
    LIMIT 1
  `;
}

function optionalNumber(value: number | string | null) {
  return value === null ? null : Number(value);
}

function toStage(stage: DetailDatabaseRow["stages"][number]) {
  return {
    ...stage,
    endedAt: stage.endedAt ? new Date(stage.endedAt).toISOString() : null,
    startedAt: stage.startedAt ? new Date(stage.startedAt).toISOString() : null,
  };
}

export async function readAdminApplication(input: {
  actorId: string;
  applicationId: string;
  visibility: "all" | "assigned";
}): Promise<AdminApplicationOverview | null> {
  const result = await getDatabase().execute(detailQuery(input));
  const row = result.rows[0] as unknown as DetailDatabaseRow | undefined;
  if (!row) return null;
  return {
    ...row,
    coFunding: optionalNumber(row.coFunding),
    requestedAmount: optionalNumber(row.requestedAmount),
    stages: row.stages.map(toStage),
    submittedAt: new Date(row.submittedAt).toISOString(),
  };
}
