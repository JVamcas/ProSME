import "server-only";

import { and, count, desc, eq, lt, or } from "drizzle-orm";

import {
  adminApplications,
  getAdminApplication,
} from "@/data/admin-applications";
import { getDatabase } from "@/db/client";
import { applications, type ApplicationRecord } from "@/db/schema";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
  ApplicationUpdateInput,
} from "@/modules/applications/ApplicationSchemas";
import {
  declarationVersion,
  privacyNoticeVersion,
} from "@/modules/applications/ApplicationDeclarations";

export type ApplicationCursor = {
  id: string;
  updatedAt: Date;
};

const listColumns = {
  createdAt: applications.createdAt,
  currentSection: applications.currentSection,
  fundingOpportunityId: applications.fundingOpportunityId,
  fundingOpportunityTitle: applications.fundingOpportunityTitle,
  id: applications.id,
  sectionCompletion: applications.sectionCompletion,
  status: applications.status,
  updatedAt: applications.updatedAt,
};

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

export async function listOwnedApplications(input: {
  after?: ApplicationCursor;
  limit: number;
  ownerUserId: string;
  status?: "draft";
}) {
  const base = and(
    eq(applications.ownerUserId, input.ownerUserId),
    input.status ? eq(applications.status, input.status) : undefined,
  );
  const cursor = input.after
    ? or(
        lt(applications.updatedAt, input.after.updatedAt),
        and(
          eq(applications.updatedAt, input.after.updatedAt),
          lt(applications.id, input.after.id),
        ),
      )
    : undefined;
  const database = getDatabase();
  const [items, totals] = await Promise.all([
    database
      .select(listColumns)
      .from(applications)
      .where(and(base, cursor))
      .orderBy(desc(applications.updatedAt), desc(applications.id))
      .limit(input.limit + 1),
    database
      .select({ value: count() })
      .from(applications)
      .where(base),
  ]);
  return { items, total: totals[0]?.value ?? 0 };
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
  fundingOpportunityId: number,
): Promise<ApplicationRecord | null> {
  const [application] = await getDatabase()
    .select()
    .from(applications)
    .where(and(
      eq(applications.ownerUserId, ownerUserId),
      eq(applications.fundingOpportunityId, fundingOpportunityId),
    ))
    .limit(1);
  return application ?? null;
}

export async function createOwnedApplication(input: {
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  ownerUserId: string;
}): Promise<string | null> {
  const [created] = await getDatabase()
    .insert(applications)
    .values(input)
    .onConflictDoNothing({
      target: [applications.ownerUserId, applications.fundingOpportunityId],
    })
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
  const [updated] = await getDatabase()
    .update(applications)
    .set(sectionUpdate(input, completion, nextSection))
    .where(and(
      eq(applications.id, applicationId),
      eq(applications.ownerUserId, ownerUserId),
      eq(applications.status, "draft"),
      eq(applications.rowVersion, input.expectedRowVersion),
    ))
    .returning({ id: applications.id });
  return updated?.id ?? null;
}
