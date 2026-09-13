import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { businessProfiles, profileAuditEntries } from "@/db/schema";
import type { BusinessProfileInput } from "@/modules/profiles/profile.schemas";

const columns = {
  id: businessProfiles.id,
  legalName: businessProfiles.legalName,
  tradingName: businessProfiles.tradingName,
  registrationNumber: businessProfiles.registrationNumber,
  businessType: businessProfiles.businessType,
  sector: businessProfiles.sector,
  region: businessProfiles.region,
  physicalAddress: businessProfiles.physicalAddress,
  establishedYear: businessProfiles.establishedYear,
  employeeCount: businessProfiles.employeeCount,
  createdAt: businessProfiles.createdAt,
  updatedAt: businessProfiles.updatedAt,
};

function values(input: BusinessProfileInput) {
  return {
    ...input,
    establishedYear: input.establishedYear === "" ? null : Number(input.establishedYear),
    employeeCount: input.employeeCount === "" ? null : Number(input.employeeCount),
  };
}

export function listOwnedBusinesses(ownerUserId: string) {
  return getDatabase()
    .select(columns)
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, ownerUserId))
    .orderBy(asc(businessProfiles.legalName), asc(businessProfiles.id));
}

export async function findOwnedBusiness(ownerUserId: string, id: string) {
  const [business] = await getDatabase()
    .select(columns)
    .from(businessProfiles)
    .where(
      and(
        eq(businessProfiles.id, id),
        eq(businessProfiles.userId, ownerUserId),
      ),
    )
    .limit(1);

  return business ?? null;
}

export function createOwnedBusiness(
  ownerUserId: string,
  input: BusinessProfileInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [business] = await transaction
      .insert(businessProfiles)
      .values({ userId: ownerUserId, ...values(input) })
      .returning({ id: businessProfiles.id });

    await transaction.insert(profileAuditEntries).values({
      actorUserId: ownerUserId,
      entityType: "business",
      entityId: business.id,
      action: "business.created",
      changes: { fields: Object.keys(input) },
    });
    return business.id;
  });
}

export function updateOwnedBusiness(
  ownerUserId: string,
  id: string,
  input: BusinessProfileInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [business] = await transaction
      .update(businessProfiles)
      .set({ ...values(input), updatedAt: new Date() })
      .where(
        and(
          eq(businessProfiles.id, id),
          eq(businessProfiles.userId, ownerUserId),
        ),
      )
      .returning({ id: businessProfiles.id });

    if (business) {
      await transaction.insert(profileAuditEntries).values({
        actorUserId: ownerUserId,
        entityType: "business",
        entityId: business.id,
        action: "business.updated",
        changes: { fields: Object.keys(input) },
      });
    }
    return business?.id ?? null;
  });
}

export function deleteOwnedBusiness(ownerUserId: string, id: string) {
  return getDatabase().transaction(async (transaction) => {
    const [business] = await transaction
      .delete(businessProfiles)
      .where(
        and(
          eq(businessProfiles.id, id),
          eq(businessProfiles.userId, ownerUserId),
        ),
      )
      .returning({ id: businessProfiles.id });

    if (business) {
      await transaction.insert(profileAuditEntries).values({
        actorUserId: ownerUserId,
        entityType: "business",
        entityId: business.id,
        action: "business.deleted",
        changes: {},
      });
    }
    return Boolean(business);
  });
}
