import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  AdminDashboardActivity,
  AdminDashboardStatus,
} from "@/modules/dashboard/AdminDashboardTypes";

type DashboardDatabaseRow = {
  activities: Array<{
    actorName: string;
    applicationId: string;
    applicationReference: string;
    eventCode: string;
    occurredAt: string | Date;
  }>;
  pendingDecision: number;
  statuses: AdminDashboardStatus[];
  totalApplications: number;
  underReview: number;
};

function applicationScope(input: {
  actorId: string;
  visibility: "all" | "assigned" | "none";
}) {
  if (input.visibility === "all") return sql`TRUE`;
  if (input.visibility === "none") return sql`FALSE`;
  return sql`EXISTS (
    SELECT 1
    FROM app_workflow_instances assigned_workflow
    JOIN app_workflow_stage_instances assigned_stage
      ON assigned_stage.workflow_instance_id = assigned_workflow.id
      AND assigned_stage.status IN ('ACTIVE', 'BLOCKED')
    JOIN app_stage_task_instances assigned_task
      ON assigned_task.stage_instance_id = assigned_stage.id
      AND assigned_task.status IN ('PENDING', 'READY', 'CLAIMED', 'IN_PROGRESS', 'BLOCKED')
    WHERE assigned_workflow.application_id = application.id
      AND (
        assigned_task.assignment_user_id = ${input.actorId}::uuid
        OR assigned_task.assignment_role_id IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${input.actorId}::uuid
        )
      )
  )`;
}

function submittedPeriod(since: Date | null) {
  return since
    ? sql`application.submitted_at >= ${since}`
    : sql`TRUE`;
}

function toActivities(
  activities: DashboardDatabaseRow["activities"] | null,
): AdminDashboardActivity[] {
  return (activities ?? []).map((activity) => ({
    ...activity,
    occurredAt: new Date(activity.occurredAt).toISOString(),
  }));
}

type DashboardInput = {
  actorId: string;
  since: Date | null;
  visibility: "all" | "assigned" | "none";
};

function dashboardCtes(input: DashboardInput) {
  return sql`
    WITH scoped_applications AS (
      SELECT
        application.id,
        application.reference,
        application.submitted_at,
        workflow.id AS workflow_id,
        workflow.status AS workflow_status,
        stage_definition.name AS stage_name,
        stage_definition.applicant_status
      FROM app_applications application
      LEFT JOIN app_workflow_instances workflow
        ON workflow.application_id = application.id
      LEFT JOIN app_workflow_stage_instances stage
        ON stage.id = workflow.current_stage_instance_id
      LEFT JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.stage_definition_id
      WHERE application.status = 'submitted'
        AND ${submittedPeriod(input.since)}
        AND ${applicationScope(input)}
    ), status_counts AS (
      SELECT COALESCE(stage_name, 'Submitted') AS label, count(*)::integer AS count
      FROM scoped_applications
      GROUP BY COALESCE(stage_name, 'Submitted')
      ORDER BY count DESC, label ASC
    ), recent_activity AS (
      SELECT
        event.event_code AS "eventCode",
        event.created_at AS "occurredAt",
        scoped.id AS "applicationId",
        scoped.reference AS "applicationReference",
        actor.display_name AS "actorName"
      FROM app_workflow_events event
      JOIN scoped_applications scoped ON scoped.workflow_id = event.workflow_instance_id
      JOIN app_users actor ON actor.id = event.actor_id
      ORDER BY event.created_at DESC, event.id DESC
      LIMIT 6
    )
  `;
}

const dashboardSelect = sql`
    SELECT
      (SELECT count(*)::integer FROM scoped_applications) AS "totalApplications",
      (SELECT count(*)::integer FROM scoped_applications
        WHERE workflow_status = 'ACTIVE'
          AND applicant_status = 'UNDER_REVIEW') AS "underReview",
      (SELECT count(DISTINCT scoped.id)::integer
        FROM scoped_applications scoped
        JOIN app_workflow_stage_instances stage
          ON stage.workflow_instance_id = scoped.workflow_id
          AND stage.status IN ('ACTIVE', 'BLOCKED')
        JOIN app_stage_task_instances task
          ON task.stage_instance_id = stage.id
          AND task.type_snapshot = 'DECISION'
          AND task.status IN ('PENDING', 'READY', 'CLAIMED', 'IN_PROGRESS', 'BLOCKED'))
        AS "pendingDecision",
      COALESCE((SELECT json_agg(status_counts) FROM status_counts), '[]'::json)
        AS statuses,
      COALESCE((SELECT json_agg(recent_activity) FROM recent_activity), '[]'::json)
        AS activities
`;

export async function readAdminDashboard(input: DashboardInput) {
  const result = await getDatabase().execute(
    sql`${dashboardCtes(input)} ${dashboardSelect}`,
  );
  const row = result.rows[0] as unknown as DashboardDatabaseRow;
  return {
    activities: toActivities(row.activities),
    metrics: {
      pendingDecision: row.pendingDecision,
      totalApplications: row.totalApplications,
      underReview: row.underReview,
    },
    statuses: row.statuses ?? [],
  };
}
