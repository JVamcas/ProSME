import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  EligibilityInputDependency,
  EligibilitySourceBinding,
  SelfCheckQuestionDefinition,
} from "../domain/EligibilityInputDefinition";
import type {
  EligibilityInputCreateInput,
  EligibilityInputUpdateInput,
} from "../api/EligibilityInputSchemas";
import { findEligibilityInputDependencies } from "./EligibilityInputRepository";
import {
  eligibilityInputDefinitions,
  eligibilityRuleSetVersions,
  eligibilityScreeningSourceBindings,
  eligibilitySelfCheckQuestions,
} from "./eligibility-ruleset.schema";

type MutationResult =
  | { inputId: string; kind: "SUCCESS"; rowVersion: number }
  | { kind: "CONFLICT" }
  | { dependencies: EligibilityInputDependency[]; kind: "DEPENDENCIES" };

type InputValues = Omit<EligibilityInputCreateInput, "expectedRowVersion">;

async function insertBindings(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  inputDefinitionId: string,
  selfCheck: SelfCheckQuestionDefinition | null,
  screening: EligibilitySourceBinding | null,
) {
  if (selfCheck) {
    await transaction.insert(eligibilitySelfCheckQuestions).values({
      ...selfCheck,
      inputDefinitionId,
    });
  }
  if (screening) {
    await transaction.insert(eligibilityScreeningSourceBindings).values({
      ...screening,
      inputDefinitionId,
    });
  }
}

async function lockDraftVersion(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  input: {
    expectedRowVersion: number;
    ruleSetId: string;
    versionId: string;
  },
) {
  const [version] = await transaction
    .select({ id: eligibilityRuleSetVersions.id })
    .from(eligibilityRuleSetVersions)
    .where(and(
      eq(eligibilityRuleSetVersions.id, input.versionId),
      eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
      eq(eligibilityRuleSetVersions.status, "DRAFT"),
      eq(eligibilityRuleSetVersions.rowVersion, input.expectedRowVersion),
    ))
    .for("update")
    .limit(1);
  return version ?? null;
}

async function incrementVersion(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
  versionId: string,
  expectedRowVersion: number,
) {
  const rowVersion = expectedRowVersion + 1;
  await transaction
    .update(eligibilityRuleSetVersions)
    .set({ rowVersion, updatedAt: new Date() })
    .where(eq(eligibilityRuleSetVersions.id, versionId));
  return rowVersion;
}

export async function createEligibilityInput(input: {
  actorId: string;
  definition: InputValues;
  expectedRowVersion: number;
  ruleSetId: string;
  versionId: string;
}): Promise<MutationResult> {
  return getDatabase().transaction(async (transaction) => {
    const version = await lockDraftVersion(transaction, input);
    if (!version) return { kind: "CONFLICT" };
    const { screening, selfCheck, ...definition } = input.definition;
    const [created] = await transaction
      .insert(eligibilityInputDefinitions)
      .values({
        ...definition,
        createdBy: input.actorId,
        updatedBy: input.actorId,
        versionId: input.versionId,
      })
      .returning({ id: eligibilityInputDefinitions.id });
    await insertBindings(transaction, created.id, selfCheck, screening);
    const rowVersion = await incrementVersion(
      transaction,
      input.versionId,
      input.expectedRowVersion,
    );
    return { inputId: created.id, kind: "SUCCESS", rowVersion };
  });
}

export async function updateEligibilityInput(input: {
  actorId: string;
  definition: Omit<EligibilityInputUpdateInput, "expectedRowVersion">;
  expectedRowVersion: number;
  inputId: string;
  ruleSetId: string;
  versionId: string;
}): Promise<MutationResult> {
  const [current] = await getDatabase()
    .select({
      availableIn: eligibilityInputDefinitions.availableIn,
      screening: eligibilityScreeningSourceBindings,
      stableKey: eligibilityInputDefinitions.stableKey,
      type: eligibilityInputDefinitions.type,
    })
    .from(eligibilityInputDefinitions)
    .leftJoin(
      eligibilityScreeningSourceBindings,
      eq(
        eligibilityScreeningSourceBindings.inputDefinitionId,
        eligibilityInputDefinitions.id,
      ),
    )
    .where(and(
      eq(eligibilityInputDefinitions.id, input.inputId),
      eq(eligibilityInputDefinitions.versionId, input.versionId),
    ))
    .limit(1);
  if (!current) return { kind: "CONFLICT" };
  const currentScreening = current.screening
    ? {
        sourceDefinitionId: current.screening.sourceDefinitionId,
        sourceKey: current.screening.sourceKey,
        sourceKind: current.screening.sourceKind,
        sourceVersionId: current.screening.sourceVersionId,
        valuePath: current.screening.valuePath,
      }
    : null;
  const referenceChanged = current.stableKey !== input.definition.stableKey
    || current.type !== input.definition.type
    || JSON.stringify([...current.availableIn].sort())
      !== JSON.stringify([...input.definition.availableIn].sort())
    || JSON.stringify(currentScreening)
      !== JSON.stringify(input.definition.screening);
  if (referenceChanged) {
    const dependencies = await findEligibilityInputDependencies(
      input.versionId,
      current.stableKey,
    );
    if (dependencies.length) return { dependencies, kind: "DEPENDENCIES" };
  }

  return getDatabase().transaction(async (transaction) => {
    const version = await lockDraftVersion(transaction, input);
    if (!version) return { kind: "CONFLICT" };
    const { screening, selfCheck, ...definition } = input.definition;
    const [updated] = await transaction
      .update(eligibilityInputDefinitions)
      .set({
        ...definition,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(
        eq(eligibilityInputDefinitions.id, input.inputId),
        eq(eligibilityInputDefinitions.versionId, input.versionId),
      ))
      .returning({ id: eligibilityInputDefinitions.id });
    if (!updated) return { kind: "CONFLICT" };
    await Promise.all([
      transaction.delete(eligibilitySelfCheckQuestions).where(eq(
        eligibilitySelfCheckQuestions.inputDefinitionId,
        input.inputId,
      )),
      transaction.delete(eligibilityScreeningSourceBindings).where(eq(
        eligibilityScreeningSourceBindings.inputDefinitionId,
        input.inputId,
      )),
    ]);
    await insertBindings(transaction, input.inputId, selfCheck, screening);
    const rowVersion = await incrementVersion(
      transaction,
      input.versionId,
      input.expectedRowVersion,
    );
    return { inputId: input.inputId, kind: "SUCCESS", rowVersion };
  });
}

export async function deleteEligibilityInput(input: {
  expectedRowVersion: number;
  inputId: string;
  ruleSetId: string;
  versionId: string;
}): Promise<MutationResult> {
  const [current] = await getDatabase()
    .select({ stableKey: eligibilityInputDefinitions.stableKey })
    .from(eligibilityInputDefinitions)
    .where(and(
      eq(eligibilityInputDefinitions.id, input.inputId),
      eq(eligibilityInputDefinitions.versionId, input.versionId),
    ))
    .limit(1);
  if (!current) return { kind: "CONFLICT" };
  const dependencies = await findEligibilityInputDependencies(
    input.versionId,
    current.stableKey,
  );
  if (dependencies.length) return { dependencies, kind: "DEPENDENCIES" };

  return getDatabase().transaction(async (transaction) => {
    const version = await lockDraftVersion(transaction, input);
    if (!version) return { kind: "CONFLICT" };
    await Promise.all([
      transaction.delete(eligibilitySelfCheckQuestions).where(eq(
        eligibilitySelfCheckQuestions.inputDefinitionId,
        input.inputId,
      )),
      transaction.delete(eligibilityScreeningSourceBindings).where(eq(
        eligibilityScreeningSourceBindings.inputDefinitionId,
        input.inputId,
      )),
    ]);
    const [deleted] = await transaction
      .delete(eligibilityInputDefinitions)
      .where(and(
        eq(eligibilityInputDefinitions.id, input.inputId),
        eq(eligibilityInputDefinitions.versionId, input.versionId),
      ))
      .returning({ id: eligibilityInputDefinitions.id });
    if (!deleted) return { kind: "CONFLICT" };
    const rowVersion = await incrementVersion(
      transaction,
      input.versionId,
      input.expectedRowVersion,
    );
    return { inputId: input.inputId, kind: "SUCCESS", rowVersion };
  });
}
