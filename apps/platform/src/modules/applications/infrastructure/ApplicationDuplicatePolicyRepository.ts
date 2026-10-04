import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";
import type { ApplicationDuplicatePolicy } from "../domain/Application";
import { applications } from "./application.schema";

type ApplicationPolicyContext = {
  applicationId?: string;
  ownerUserId: string;
  businessId?: string | null;
  fundingCallId: string;
  duplicatePolicy: ApplicationDuplicatePolicy;
  allowResubmissionAfterWithdrawal: boolean;
};

/** Shared by creation and submission; withdrawn history never becomes a draft. */
export async function findApplicationPolicyConflict(
  transaction: DatabaseTransaction,
  input: ApplicationPolicyContext,
): Promise<"duplicate" | "resubmission_not_allowed" | null> {
  if (
    input.duplicatePolicy === "none" &&
    input.allowResubmissionAfterWithdrawal
  ) {
    return null;
  }
  const scope =
    input.duplicatePolicy === "one_per_business" && input.businessId
      ? eq(applications.businessId, input.businessId)
      : eq(applications.ownerUserId, input.ownerUserId);
  const statusFilter = input.allowResubmissionAfterWithdrawal
    ? ne(applications.status, "withdrawn")
    : input.duplicatePolicy === "none"
      ? eq(applications.status, "withdrawn")
      : undefined;
  const [conflict] = await transaction
    .select({ status: applications.status })
    .from(applications)
    .where(
      and(
        eq(applications.fundingOpportunityId, input.fundingCallId),
        isNull(applications.deletedAt),
        input.applicationId
          ? ne(applications.id, input.applicationId)
          : undefined,
        scope,
        statusFilter,
      ),
    )
    .limit(1);
  if (!conflict) return null;
  return conflict.status === "withdrawn"
    ? "resubmission_not_allowed"
    : "duplicate";
}
