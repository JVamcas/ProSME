import "server-only";

import { eq, inArray } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";
import {
  eligibilityInputDefinitions,
  eligibilitySelfCheckQuestions,
  eligibilityScreeningSourceBindings,
} from "./eligibility-ruleset.schema";

export async function cloneEligibilityVersionContent(
  transaction: DatabaseTransaction,
  sourceVersionId: string,
  targetVersionId: string,
  actorId: string,
) {
  const inputs = await transaction
    .select()
    .from(eligibilityInputDefinitions)
    .where(eq(eligibilityInputDefinitions.versionId, sourceVersionId));
  if (!inputs.length) return;
  const sourceIds = inputs.map((input) => input.id);
  const ids = new Map(sourceIds.map((id) => [id, crypto.randomUUID()]));
  const [questions, bindings] = await Promise.all([
    transaction
      .select()
      .from(eligibilitySelfCheckQuestions)
      .where(
        inArray(eligibilitySelfCheckQuestions.inputDefinitionId, sourceIds),
      ),
    transaction
      .select()
      .from(eligibilityScreeningSourceBindings)
      .where(
        inArray(
          eligibilityScreeningSourceBindings.inputDefinitionId,
          sourceIds,
        ),
      ),
  ]);
  await transaction.insert(eligibilityInputDefinitions).values(
    inputs.map((input) => ({
      ...input,
      id: ids.get(input.id)!,
      versionId: targetVersionId,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
  if (questions.length) {
    await transaction.insert(eligibilitySelfCheckQuestions).values(
      questions.map((question) => ({
        ...question,
        inputDefinitionId: ids.get(question.inputDefinitionId)!,
      })),
    );
  }
  if (bindings.length) {
    await transaction.insert(eligibilityScreeningSourceBindings).values(
      bindings.map((binding) => ({
        ...binding,
        inputDefinitionId: ids.get(binding.inputDefinitionId)!,
      })),
    );
  }
}
