import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  eligibilityInputDefinitions,
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
  eligibilityScreeningSourceBindings,
  eligibilitySelfCheckQuestions,
} from "./eligibility-ruleset.schema";

export async function cloneEligibilityRuleSetVersion(input: {
  actorId: string;
  ruleSetId: string;
  sourceVersionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .select({ id: eligibilityRuleSets.id })
      .from(eligibilityRuleSets)
      .where(eq(eligibilityRuleSets.id, input.ruleSetId))
      .for("update")
      .limit(1);
    if (!definition) return null;
    const [draft, source, latest] = await Promise.all([
      transaction
        .select({ id: eligibilityRuleSetVersions.id })
        .from(eligibilityRuleSetVersions)
        .where(and(
          eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
          eq(eligibilityRuleSetVersions.status, "DRAFT"),
        ))
        .limit(1),
      transaction
        .select()
        .from(eligibilityRuleSetVersions)
        .where(and(
          eq(eligibilityRuleSetVersions.id, input.sourceVersionId),
          eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
        ))
        .limit(1),
      transaction
        .select({
          versionNumber: sql<number>`max(${eligibilityRuleSetVersions.versionNumber})`,
        })
        .from(eligibilityRuleSetVersions)
        .where(eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId)),
    ]);
    if (draft.length || !source[0] || source[0].status === "DRAFT") return null;
    const [version] = await transaction
      .insert(eligibilityRuleSetVersions)
      .values({
        createdBy: input.actorId,
        ruleSetId: input.ruleSetId,
        versionNumber: Number(latest[0]?.versionNumber ?? 0) + 1,
      })
      .returning();
    const [sourceRules, sourceInputs] = await Promise.all([
      transaction
        .select()
        .from(eligibilityRules)
        .where(eq(eligibilityRules.versionId, input.sourceVersionId)),
      transaction
        .select({
          input: eligibilityInputDefinitions,
          question: eligibilitySelfCheckQuestions,
          screening: eligibilityScreeningSourceBindings,
        })
        .from(eligibilityInputDefinitions)
        .leftJoin(
          eligibilitySelfCheckQuestions,
          eq(
            eligibilitySelfCheckQuestions.inputDefinitionId,
            eligibilityInputDefinitions.id,
          ),
        )
        .leftJoin(
          eligibilityScreeningSourceBindings,
          eq(
            eligibilityScreeningSourceBindings.inputDefinitionId,
            eligibilityInputDefinitions.id,
          ),
        )
        .where(eq(
          eligibilityInputDefinitions.versionId,
          input.sourceVersionId,
        )),
    ]);
    if (sourceRules.length) {
      await transaction.insert(eligibilityRules).values(
        sourceRules.map((rule) => ({
          applicantMessage: rule.applicantMessage,
          conditionGroupId: rule.conditionGroupId,
          conditionId: rule.conditionId,
          conditionKind: rule.conditionKind,
          executionMode: rule.executionMode,
          failureType: rule.failureType,
          order: rule.order,
          reasonCode: rule.reasonCode,
          versionId: version.id,
        })),
      );
    }
    if (sourceInputs.length) {
      const createdInputs = await transaction
        .insert(eligibilityInputDefinitions)
        .values(sourceInputs.map((row) => ({
          availableIn: row.input.availableIn,
          createdBy: input.actorId,
          groupKey: row.input.groupKey,
          groupLabel: row.input.groupLabel,
          label: row.input.label,
          order: row.input.order,
          stableKey: row.input.stableKey,
          type: row.input.type,
          updatedBy: input.actorId,
          versionId: version.id,
        })))
        .returning({
          id: eligibilityInputDefinitions.id,
          stableKey: eligibilityInputDefinitions.stableKey,
        });
      const inputIds = new Map(
        createdInputs.map((created) => [created.stableKey, created.id]),
      );
      const questions = sourceInputs.flatMap((row) => {
        if (!row.question) return [];
        return [{
          answerType: row.question.answerType,
          explanation: row.question.explanation,
          helpText: row.question.helpText,
          inputDefinitionId: inputIds.get(row.input.stableKey)!,
          options: row.question.options,
          prompt: row.question.prompt,
          required: row.question.required,
        }];
      });
      const sources = sourceInputs.flatMap((row) => {
        if (!row.screening) return [];
        return [{
          inputDefinitionId: inputIds.get(row.input.stableKey)!,
          sourceDefinitionId: row.screening.sourceDefinitionId,
          sourceKey: row.screening.sourceKey,
          sourceKind: row.screening.sourceKind,
          sourceVersionId: row.screening.sourceVersionId,
          valuePath: row.screening.valuePath,
        }];
      });
      await Promise.all([
        questions.length
          ? transaction.insert(eligibilitySelfCheckQuestions).values(questions)
          : Promise.resolve(),
        sources.length
          ? transaction.insert(eligibilityScreeningSourceBindings)
              .values(sources)
          : Promise.resolve(),
      ]);
    }
    return version;
  });
}
