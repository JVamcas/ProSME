import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";
import type { ApplicationDuplicatePolicy } from "../domain/Application";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
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
  const [call] = await transaction
    .select({
      duplicatePolicy: fundingCalls.applicationDuplicatePolicy,
      allowResubmissionAfterWithdrawal:
        fundingCalls.allowResubmissionAfterWithdrawal,
    })
    .from(fundingCalls)
    .where(eq(fundingCalls.id, input.fundingCallId))
    .limit(1);
  if (!call) return "duplicate";
  const policy = call;
  if (
    policy.duplicatePolicy === "none" &&
    policy.allowResubmissionAfterWithdrawal
  ) {
    return null;
  }
  const scope =
    policy.duplicatePolicy === "one_per_business" && input.businessId
      ? eq(applications.businessId, input.businessId)
      : eq(applications.ownerUserId, input.ownerUserId);
  const statusFilter = policy.allowResubmissionAfterWithdrawal
    ? ne(applications.status, "withdrawn")
    : policy.duplicatePolicy === "none"
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
