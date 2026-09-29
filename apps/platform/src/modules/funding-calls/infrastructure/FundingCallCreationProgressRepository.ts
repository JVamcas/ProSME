import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCallCreationProgressSaveInput } from "../api/FundingCallSchemas";
import type { FundingCallCreationProgress } from "../domain/FundingCallCreationProgress";
import { fundingCallCreationProgress } from "./funding-call-creation-progress.schema";

const progressSelection = {
  createdAt: fundingCallCreationProgress.createdAt,
  currentStep: fundingCallCreationProgress.currentStep,
  id: fundingCallCreationProgress.id,
  ownerId: fundingCallCreationProgress.ownerId,
  rowVersion: fundingCallCreationProgress.rowVersion,
  updatedAt: fundingCallCreationProgress.updatedAt,
  values: fundingCallCreationProgress.values,
};

export async function readFundingCallCreationProgress(
  ownerId: string,
): Promise<FundingCallCreationProgress | null> {
  const [draft] = await getDatabase()
    .select(progressSelection)
    .from(fundingCallCreationProgress)
    .where(eq(fundingCallCreationProgress.ownerId, ownerId))
    .limit(1);

  return draft ?? null;
}

export async function saveFundingCallCreationProgress(
  ownerId: string,
  input: FundingCallCreationProgressSaveInput,
): Promise<FundingCallCreationProgress | null> {
  if (input.expectedRowVersion === null) {
    const [created] = await getDatabase()
      .insert(fundingCallCreationProgress)
      .values({
        currentStep: input.currentStep,
        ownerId,
        values: input.values,
      })
      .onConflictDoNothing({ target: fundingCallCreationProgress.ownerId })
      .returning(progressSelection);

    return created ?? null;
  }

  const [updated] = await getDatabase()
    .update(fundingCallCreationProgress)
    .set({
      currentStep: input.currentStep,
      rowVersion: input.expectedRowVersion + 1,
      updatedAt: new Date(),
      values: input.values,
    })
    .where(
      and(
        eq(fundingCallCreationProgress.ownerId, ownerId),
        eq(
          fundingCallCreationProgress.rowVersion,
          input.expectedRowVersion,
        ),
      ),
    )
    .returning(progressSelection);

  return updated ?? null;
}
