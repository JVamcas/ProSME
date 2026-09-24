import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  adminApplications,
  getAdminApplication,
} from "@/data/admin-applications";
import { getDatabase } from "@/db/client";
import {
  businessProfiles,
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
import {
  readOwnedApplicationList,
  readOwnedApplicationStatus,
} from "./ApplicationListRepository";
import type { ApplicationDuplicatePolicy } from "../domain/Application";
import { applicationDraftResponses, applications, type ApplicationRecord } from "./application.schema";
import {
  attachedBusinessFieldKeys,
  attachedBusinessFieldValues,
} from "../domain/AttachedApplicationForm";

type OwnedApplicationListInput = Parameters<typeof readOwnedApplicationList>[0];

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
  return readOwnedApplicationList(input);
}

export async function findOwnedApplicationStatus(
  ownerUserId: string,
  applicationId: string,
) {
  return readOwnedApplicationStatus(ownerUserId, applicationId);
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
      isNull(applications.deletedAt),
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
      isNull(applications.deletedAt),
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
    return await getDatabase().transaction(async (transaction) => {
      const businessId = input.section === "business"
        ? input.data.businessId
        : undefined;
      const business = businessId
        ? (await transaction
            .select()
            .from(businessProfiles)
            .where(and(
              eq(businessProfiles.id, businessId),
              eq(businessProfiles.userId, ownerUserId),
            ))
            .limit(1))[0]
        : null;
      if (input.section === "business" && !business) {
        return { kind: "conflict" as const };
      }
      const [updated] = await transaction
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
          isNull(applications.deletedAt),
          eq(applications.rowVersion, input.expectedRowVersion),
        ))
        .returning({
          id: applications.id,
          latestDraftResponseId: applications.latestDraftResponseId,
        });
      if (!updated) return { kind: "conflict" as const };
      if (business && !updated.latestDraftResponseId) {
        throw new Error("Application draft response is missing.");
      }
      if (business && updated.latestDraftResponseId) {
        const [response] = await transaction
          .select({ values: applicationDraftResponses.values })
          .from(applicationDraftResponses)
          .where(eq(applicationDraftResponses.id, updated.latestDraftResponseId))
          .limit(1);
        if (!response) throw new Error("Application draft response is missing.");
        const businessKeys = new Set<string>(attachedBusinessFieldKeys);
        const otherValues = Object.fromEntries(
          Object.entries(response.values).filter(([key]) => !businessKeys.has(key)),
        );
        await transaction
          .update(applicationDraftResponses)
          .set({
            rowVersion: sql`${applicationDraftResponses.rowVersion} + 1`,
            updatedAt: new Date(),
            values: { ...otherValues, ...attachedBusinessFieldValues(business) },
          })
          .where(eq(applicationDraftResponses.id, updated.latestDraftResponseId));
      }
      return { id: updated.id, kind: "updated" as const };
    });
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
