import "server-only";

import { asc, inArray } from "drizzle-orm";

import { users } from "@/db/schema";
import type { StageActivationTransaction } from "./StageActivationRepository";

export type AssignedUserSnapshot = {
  displayName: string;
  email: string;
  userId: string;
};

export async function loadAssignedUserSnapshots(
  transaction: StageActivationTransaction,
  userIds: readonly string[],
): Promise<AssignedUserSnapshot[]> {
  const distinctUserIds = [...new Set(userIds)];
  if (distinctUserIds.length === 0) return [];

  return transaction
    .select({
      displayName: users.displayName,
      email: users.email,
      userId: users.id,
    })
    .from(users)
    .where(inArray(users.id, distinctUserIds))
    .orderBy(asc(users.id));
}
