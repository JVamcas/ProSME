import { inArray } from "drizzle-orm";

import { users } from "@/db/schema";

export const systemSeedUserId = "00000000-0000-4000-8000-000000000001";
export const systemSeedUserEmail = "system@internal.sme-fund";

type Transaction = Parameters<
  Parameters<ReturnType<typeof import("@/db/client").getDatabase>["transaction"]>[0]
>[0];

export async function ensureSystemSeedPrincipal(transaction: Transaction) {
  await transaction.insert(users).values({
    displayName: "System",
    email: systemSeedUserEmail,
    id: systemSeedUserId,
    status: "disabled",
    userType: "staff",
  }).onConflictDoNothing();
  const [systemUser] = await transaction
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.id, [systemSeedUserId]))
    .limit(1);
  if (systemUser?.email !== systemSeedUserEmail) {
    throw new Error("The reserved System user identifier is unavailable.");
  }
}
