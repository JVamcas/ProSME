import "server-only";

import { and, eq } from "drizzle-orm";

import { type DatabaseTransaction } from "@/db/client";
import { businessProfiles } from "@/db/schema/profiles";

function ownedBusinessFilter(ownerUserId: string, businessId: string) {
  return and(
    eq(businessProfiles.id, businessId),
    eq(businessProfiles.userId, ownerUserId),
  );
}

export async function readApplicationBusinessInTransaction(
  transaction: DatabaseTransaction,
  ownerUserId: string,
  businessId: string,
) {
  const [business] = await transaction
    .select()
    .from(businessProfiles)
    .where(ownedBusinessFilter(ownerUserId, businessId))
    .limit(1);
  return business ?? null;
}
