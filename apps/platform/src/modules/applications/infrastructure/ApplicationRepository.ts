import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import {
  adminApplications,
  getAdminApplication,
} from "@/data/admin-applications";
import { getDatabase } from "@/db/client";
import {
  readOwnedApplicationList,
  readOwnedApplicationStatus,
} from "./ApplicationListRepository";
import { applications, type ApplicationRecord } from "./application.schema";

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
