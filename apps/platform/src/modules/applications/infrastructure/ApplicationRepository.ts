import "server-only";

import { and, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm";

import {
  adminApplications,
  getAdminApplication,
} from "@/data/admin-applications";
import { getDatabase } from "@/db/client";
import {
  businessProfiles,
  workflowInstances,
  workflowStageDefinitions,
  stageInstances,
} from "@/db/schema";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
  ApplicationUpdateInput,
} from "@/modules/applications/ApplicationSchemas";
import {
  declarationVersion,
  privacyNoticeVersion,
} from "@/modules/applications/ApplicationDeclarations";
import type {
  ApplicationListInput,
  ApplicationStatusCounts,
} from "@/modules/applications/ApplicationTypes";
import type { ApplicationDuplicatePolicy } from "../domain/Application";
import { applications, type ApplicationRecord } from "./application.schema";

export type ApplicationCursor = {
  id: string;
  updatedAt: Date;
};

type OwnedApplicationListInput = {
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
  sectionCompletion: applications.sectionCompletion,
  status: applications.status,
  updatedAt: applications.updatedAt,
};

const effectiveApplicantStatus = sql`
  COALESCE(
    ${workflowInstances.publicStatus}->>'status',
    ${workflowStageDefinitions.applicantStatus},
    'SUBMITTED'
  )
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
    )
    .leftJoin(
      stageInstances,
      eq(stageInstances.id, workflowInstances.currentStageInstanceId),
    )
    .leftJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        stageInstances.workflowStageDefinitionId,
      ),
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
    .leftJoin(
      stageInstances,
      eq(stageInstances.id, workflowInstances.currentStageInstanceId),
    )
    .leftJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        stageInstances.workflowStageDefinitionId,
      ),
    )
    .where(eq(applications.ownerUserId, ownerUserId));
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

export async function findAllApplications() {
  return adminApplications;
}

export async function findApplicationById(id: string) {
  return getAdminApplication(id) ?? null;
}

export async function findApplicationsAssignedTo(userId: string) {
  void userId;
  return [];
}

export async function findAssignedApplicationById(
  userId: string,
  applicationId: string,
) {
  void userId;
  void applicationId;
  return null;
}

export async function listOwnedApplications(input: OwnedApplicationListInput) {
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

export async function findOwnedApplication(
  ownerUserId: string,
  applicationId: string,
): Promise<ApplicationRecord | null> {
  const [application] = await getDatabase()
    .select()
    .from(applications)
    .where(and(
      eq(applications.id, applicationId),
      eq(applications.ownerUserId, ownerUserId),
    ))
    .limit(1);
  return application ?? null;
}

export async function findOwnedApplicationByOpportunity(
  ownerUserId: string,
  fundingOpportunityId: string,
): Promise<ApplicationRecord | null> {
  const [application] = await getDatabase()
    .select()
    .from(applications)
    .where(and(
      eq(applications.ownerUserId, ownerUserId),
      eq(applications.fundingOpportunityId, fundingOpportunityId),
      eq(applications.status, "draft"),
      isNull(applications.businessId),
    ))
    .limit(1);
  return application ?? null;
}

export async function readApplicationEligibilityBinding(
  applicationId: string,
) {
  const [application] = await getDatabase()
    .select({
      eligibilityRuleSetVersionId: applications.eligibilityRuleSetVersionId,
      fundingOpportunityId: applications.fundingOpportunityId,
      id: applications.id,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  return application ?? null;
}

export async function createOwnedApplication(input: {
  duplicatePolicy: ApplicationDuplicatePolicy;
  eligibilityRuleSetVersionId: string;
  formVersionId: string;
  fundingOpportunityId: string;
  fundingOpportunityTitle: string;
  ownerUserId: string;
}): Promise<string | null> {
  const [created] = await getDatabase()
    .insert(applications)
    .values(input)
    .onConflictDoNothing()
    .returning({ id: applications.id });
  return created?.id ?? null;
}

function sectionUpdate(
  input: ApplicationUpdateInput,
  completion: ApplicationSectionCompletion,
  nextSection: ApplicationSection,
) {
  const common = {
    currentSection: nextSection,
    rowVersion: input.expectedRowVersion + 1,
    sectionCompletion: completion,
    updatedAt: new Date(),
  };
  if (input.section === "business") {
    return { ...common, businessSection: input.data };
  }
  if (input.section === "project") {
    return { ...common, projectSection: input.data };
  }
  if (input.section === "financial") {
    return { ...common, financialSection: input.data };
  }
  if (input.section === "declarations") {
    return {
      ...common,
      declarationAcceptance: completion.declarations
        ? {
            acceptedAt: new Date().toISOString(),
            declarationVersion,
            privacyVersion: privacyNoticeVersion,
          }
        : null,
      declarationsSection: input.data,
    };
  }
  return common;
}

export async function updateOwnedApplication(
  ownerUserId: string,
  applicationId: string,
  input: ApplicationUpdateInput,
  completion: ApplicationSectionCompletion,
  nextSection: ApplicationSection,
) {
  try {
    const [updated] = await getDatabase()
      .update(applications)
      .set({
        ...sectionUpdate(input, completion, nextSection),
        businessId: input.section === "business"
          ? input.data.businessId
          : undefined,
      })
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.ownerUserId, ownerUserId),
        eq(applications.status, "draft"),
        eq(applications.rowVersion, input.expectedRowVersion),
      ))
      .returning({ id: applications.id });
    return updated
      ? { id: updated.id, kind: "updated" as const }
      : { kind: "conflict" as const };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      (
        error.constraint === "app_applications_business_opportunity_unique"
        || error.constraint === "app_applications_applicant_opportunity_unique"
      )
    ) {
      return { kind: "duplicate_business" as const };
    }
    throw error;
  }
}
