import "server-only";

import { and, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { WorkflowPublicStatusMapping } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";
import { getDatabase } from "@/db/client";
import { businessProfiles, workflowInstances } from "@/db/schema";
import type {
  ApplicationListInput,
  ApplicationStatusCounts,
} from "@/modules/applications/ApplicationTypes";
import { applications } from "./application.schema";

export type ApplicationCursor = {
  id: string;
  updatedAt: Date;
};

export type OwnedApplicationListInput = {
  after?: ApplicationCursor;
  limit: number;
  ownerUserId: string;
  status?: ApplicationListInput["status"];
};

const listColumns = {
  businessName: sql<string | null>`
    COALESCE(NULLIF(${businessProfiles.tradingName}, ''), ${businessProfiles.legalName})
  `,
  createdAt: applications.createdAt,
  currentSection: applications.currentSection,
  fundingOpportunityId: applications.fundingOpportunityId,
  fundingOpportunityTitle: applications.fundingOpportunityTitle,
  id: applications.id,
  canWithdraw: sql<boolean>`
    ${applications.status} = 'submitted'
    AND ${workflowInstances.status} = 'ACTIVE'
    AND EXISTS (
      SELECT 1
      FROM app_workflow_stage_instances active_stage
      JOIN app_workflow_stage_definitions definition
        ON definition.id = active_stage.workflow_stage_definition_id
      JOIN app_workflow_action_definitions withdrawal
        ON withdrawal.stage_id = definition.id
      WHERE active_stage.workflow_instance_id = ${workflowInstances.id}
        AND active_stage.status = 'ACTIVE'
        AND withdrawal.action_type = 'WITHDRAW'
        AND withdrawal.enabled = true
        AND withdrawal.configuration->'allowedStageKeys' ? definition.code
    )
  `,
  reference: applications.reference,
  submittedAt: applications.submittedAt,
  workflowStatus: workflowInstances.status,
  terminalPublicStatus: workflowInstances.publicStatus,
  activeStageStatuses: sql<WorkflowPublicStatusMapping[]>`
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'status', definition.applicant_status,
        'label', definition.applicant_label,
        'description', definition.applicant_description
      ) ORDER BY definition.sequence, definition.id)
      FROM app_workflow_stage_instances active_stage
      JOIN app_workflow_stage_definitions definition
        ON definition.id = active_stage.workflow_stage_definition_id
      WHERE active_stage.workflow_instance_id = ${workflowInstances.id}
        AND active_stage.status = 'ACTIVE'
    ), '[]'::jsonb)
  `,
  sectionCompletion: applications.sectionCompletion,
  status: applications.status,
  updatedAt: applications.updatedAt,
};

const effectiveApplicantStatus = sql`
  CASE
    WHEN ${applications.status} = 'withdrawn' THEN 'WITHDRAWN'
    WHEN ${workflowInstances.status} IN ('COMPLETED', 'CANCELLED', 'REJECTED')
      THEN COALESCE(${workflowInstances.publicStatus}->>'status', 'CLOSED')
    ELSE COALESCE((
      SELECT definition.applicant_status
      FROM app_workflow_stage_instances active_stage
      JOIN app_workflow_stage_definitions definition
        ON definition.id = active_stage.workflow_stage_definition_id
      WHERE active_stage.workflow_instance_id = ${workflowInstances.id}
        AND active_stage.status = 'ACTIVE'
      ORDER BY CASE definition.applicant_status
        WHEN 'ACTION_REQUIRED' THEN 0
        WHEN 'UNDER_REVIEW' THEN 1
        WHEN 'SUBMITTED' THEN 2
        WHEN 'OUTCOME_AVAILABLE' THEN 3
        WHEN 'CLOSED' THEN 4
        ELSE 5
      END, definition.sequence, definition.id
      LIMIT 1
    ), 'SUBMITTED')
  END
`;
const openWorkflow = sql`
  COALESCE(${workflowInstances.status}, 'ACTIVE')
    NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED')
`;
const applicationCategories = {
  completed: and(
    or(
      eq(applications.status, "withdrawn"),
      and(
        eq(applications.status, "submitted"),
        sql`(
          ${workflowInstances.status} IN ('COMPLETED', 'CANCELLED', 'REJECTED')
          OR ${effectiveApplicantStatus} IN ('OUTCOME_AVAILABLE', 'CLOSED', 'WITHDRAWN')
        )`,
      ),
    ),
  ),
  draft: eq(applications.status, "draft"),
  submitted: and(
    eq(applications.status, "submitted"),
    openWorkflow,
    sql`${effectiveApplicantStatus} = 'SUBMITTED'`,
  ),
  "under-review": and(
    eq(applications.status, "submitted"),
    openWorkflow,
    sql`${effectiveApplicantStatus} IN ('UNDER_REVIEW', 'ACTION_REQUIRED')`,
  ),
} satisfies Record<
  NonNullable<ApplicationListInput["status"]>,
  ReturnType<typeof and>
>;

function ownedApplicationFilter(input: OwnedApplicationListInput) {
  return and(
    eq(applications.ownerUserId, input.ownerUserId),
    isNull(applications.deletedAt),
    input.status ? applicationCategories[input.status] : undefined,
  );
}

function applicationCursorFilter(after?: ApplicationCursor) {
  if (!after) return undefined;
  return or(
    lt(applications.updatedAt, after.updatedAt),
    and(
      eq(applications.updatedAt, after.updatedAt),
      lt(applications.id, after.id),
    ),
  );
}

function applicationStatusJoins() {
  return getDatabase()
    .select(listColumns)
    .from(applications)
    .leftJoin(
      businessProfiles,
      eq(businessProfiles.id, applications.businessId),
    )
    .leftJoin(
      workflowInstances,
      eq(workflowInstances.applicationId, applications.id),
    );
}

function readOwnedApplicationItems(input: OwnedApplicationListInput) {
  return applicationStatusJoins()
    .where(and(
      ownedApplicationFilter(input),
      applicationCursorFilter(input.after),
    ))
    .orderBy(desc(applications.updatedAt), desc(applications.id))
    .limit(input.limit + 1);
}

async function countOwnedApplicationsByStatus(ownerUserId: string) {
  const rows = await getDatabase()
    .select({
      all: count(),
      completed: sql<number>`
        count(*) FILTER (WHERE ${applicationCategories.completed})::integer
      `,
      draft: sql<number>`
        count(*) FILTER (WHERE ${applicationCategories.draft})::integer
      `,
      submitted: sql<number>`
        count(*) FILTER (WHERE ${applicationCategories.submitted})::integer
      `,
      underReview: sql<number>`
        count(*) FILTER (
          WHERE ${applicationCategories["under-review"]}
        )::integer
      `,
    })
    .from(applications)
    .leftJoin(
      workflowInstances,
      eq(workflowInstances.applicationId, applications.id),
    )
    .where(and(
      eq(applications.ownerUserId, ownerUserId),
      isNull(applications.deletedAt),
    ));
  return rows[0];
}

function filteredApplicationCount(
  counts: ApplicationStatusCounts,
  status: ApplicationListInput["status"],
) {
  if (!status) return counts.all;
  if (status === "under-review") return counts.underReview;
  return counts[status];
}

export async function readOwnedApplicationList(input: OwnedApplicationListInput) {
  const [items, resultCounts] = await Promise.all([
    readOwnedApplicationItems(input),
    countOwnedApplicationsByStatus(input.ownerUserId),
  ]);
  const emptyCounts: ApplicationStatusCounts = {
    all: 0,
    completed: 0,
    draft: 0,
    submitted: 0,
    underReview: 0,
  };
  const counts = resultCounts ?? emptyCounts;
  return {
    counts,
    items,
    total: filteredApplicationCount(counts, input.status),
  };
}

export async function readOwnedApplicationStatus(
  ownerUserId: string,
  applicationId: string,
) {
  const [item] = await applicationStatusJoins()
    .where(and(
      eq(applications.ownerUserId, ownerUserId),
      eq(applications.id, applicationId),
      isNull(applications.deletedAt),
    ))
    .limit(1);
  return item ?? null;
}

