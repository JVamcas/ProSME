import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { authorizationAuditEntries } from "@/db/schema/audit";
import { fundingCalls } from "./funding-call.schema";
import type { FundingCallPublicInteractionInput } from "../api/FundingCallPublicInteractionSchemas";

export async function updateFundingCallPublicInteraction(
  actorId: string,
  id: string,
  input: FundingCallPublicInteractionInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        publicInteractionEnabled: input.enabled,
        rowVersion: sql`${fundingCalls.rowVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(
        and(
          eq(fundingCalls.id, id),
          eq(fundingCalls.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning({
        id: fundingCalls.id,
        publicInteractionEnabled: fundingCalls.publicInteractionEnabled,
        rowVersion: fundingCalls.rowVersion,
      });
    if (!updated) return null;
    await transaction.insert(authorizationAuditEntries).values({
      actorId,
      action: input.enabled
        ? "funding_call.public_interaction.enabled"
        : "funding_call.public_interaction.disabled",
      changes: { fundingCallId: id, publicInteractionEnabled: input.enabled },
    });
    return updated;
  });
}
