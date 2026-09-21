import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  ApplicantDashboardActivity,
  ApplicantDashboardMetrics,
} from "@/modules/dashboard/ApplicantDashboardTypes";

type ApplicantDashboardDatabaseActivity = Omit<
  ApplicantDashboardActivity,
  "occurredAt"
> & {
  occurredAt: string | Date;
};

type ApplicantDashboardRow = {
  actionRequired: number;
  activities: ApplicantDashboardDatabaseActivity[] | null;
  applicationsInProgress: number;
  openFundingOpportunities: number;
  submittedApplications: number;
};

function dashboardCtes(ownerUserId: string) {
  return sql`
    WITH owned_applications AS (
      SELECT
        application.id AS application_id,
        application.funding_opportunity_title,
        application.reference,
        application.status,
        application.updated_at,
        workflow.id AS workflow_id,
        stage_definition.applicant_status
      FROM app_applications application
      LEFT JOIN app_workflow_instances workflow
        ON workflow.application_id = application.id
      LEFT JOIN app_workflow_stage_instances stage
        ON stage.id = workflow.current_stage_instance_id
      LEFT JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.workflow_stage_definition_id
      WHERE application.owner_user_id = ${ownerUserId}::uuid
    ), activity_candidates AS (
      SELECT
        event.id::text AS sort_id,
        event.event_code,
        event.created_at AS occurred_at,
        owned.application_id,
        owned.funding_opportunity_title,
        owned.reference
      FROM app_workflow_events event
      JOIN owned_applications owned
        ON owned.workflow_id = event.workflow_instance_id
      UNION ALL
      SELECT
        owned.application_id::text AS sort_id,
        'APPLICATION_DRAFT_UPDATED' AS event_code,
        owned.updated_at AS occurred_at,
        owned.application_id,
        owned.funding_opportunity_title,
        owned.reference
      FROM owned_applications owned
      WHERE owned.status = 'draft'
    ), recent_activity AS (
      SELECT *
      FROM activity_candidates
      ORDER BY occurred_at DESC, sort_id DESC
      LIMIT 6
    )
  `;
}

const dashboardSelect = sql`
  SELECT
      count(*) FILTER (WHERE status = 'draft')::integer
        AS "applicationsInProgress",
      count(*) FILTER (WHERE status = 'submitted')::integer
        AS "submittedApplications",
      count(*) FILTER (
        WHERE status = 'submitted'
          AND applicant_status = 'ACTION_REQUIRED'
      )::integer AS "actionRequired",
      (
        SELECT count(*)::integer
        FROM cms_funding_calls
        WHERE _status = 'published'
          AND call_status = 'open'
      ) AS "openFundingOpportunities",
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'applicationId', application_id,
            'applicationReference', COALESCE(reference, 'Draft application'),
            'fundingOpportunityTitle', funding_opportunity_title,
            'eventCode', event_code,
            'occurredAt', occurred_at
          )
          ORDER BY occurred_at DESC, sort_id DESC
        )
        FROM recent_activity
      ), '[]'::json) AS activities
    FROM owned_applications
`;

export async function readApplicantDashboard(ownerUserId: string) {
  const result = await getDatabase().execute(
    sql`${dashboardCtes(ownerUserId)} ${dashboardSelect}`,
  );
  const row = result.rows[0] as unknown as ApplicantDashboardRow;

  return {
    activities: (row.activities ?? []).map((activity) => ({
      ...activity,
      occurredAt: new Date(activity.occurredAt).toISOString(),
    })),
    metrics: {
      actionRequired: row.actionRequired,
      applicationsInProgress: row.applicationsInProgress,
      openFundingOpportunities: row.openFundingOpportunities,
      submittedApplications: row.submittedApplications,
    } satisfies ApplicantDashboardMetrics,
  };
}
