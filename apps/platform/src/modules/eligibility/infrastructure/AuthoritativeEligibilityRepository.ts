import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import { applications } from "@/db/schema/applications";
import type { AuthoritativeEligibilityOutcome } from "../domain/AuthoritativeEligibilityOutcome";
import { authoritativeEligibilityOutcomes } from "./eligibility-outcome.schema";

export type AuthoritativeEligibilityTransaction = DatabaseTransaction;

export type AuthoritativeEligibilityOutcomeWrite = Omit<
  AuthoritativeEligibilityOutcome,
  "id"
> & {
  evaluatedBy: string;
};

export async function createAuthoritativeEligibilityOutcomeRecord(
  transaction: AuthoritativeEligibilityTransaction,
  input: AuthoritativeEligibilityOutcomeWrite,
) {
  const [created] = await transaction
    .insert(authoritativeEligibilityOutcomes)
    .values(input)
    .returning();
  return created;
}

export async function findAuthoritativeEligibilityOutcome(
  applicationId: string,
  ownerUserId?: string,
): Promise<AuthoritativeEligibilityOutcome | null> {
  const [outcome] = await getDatabase()
    .select({ outcome: authoritativeEligibilityOutcomes })
    .from(authoritativeEligibilityOutcomes)
    .innerJoin(
      applications,
      eq(applications.id, authoritativeEligibilityOutcomes.applicationId),
    )
    .where(and(
      eq(authoritativeEligibilityOutcomes.applicationId, applicationId),
      ownerUserId ? eq(applications.ownerUserId, ownerUserId) : undefined,
    ))
    .limit(1);
  return outcome?.outcome ?? null;
}
