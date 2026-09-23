import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
} from "./eligibility-ruleset.schema";
import { eligibilityRuleSetQuestionBindings } from "./eligibility-question.schema";

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
    const [sourceRules, sourceQuestions] = await Promise.all([
      transaction
        .select()
        .from(eligibilityRules)
        .where(eq(eligibilityRules.versionId, input.sourceVersionId)),
      transaction
        .select()
        .from(eligibilityRuleSetQuestionBindings)
        .where(eq(
          eligibilityRuleSetQuestionBindings.versionId,
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
    if (sourceQuestions.length) {
      await transaction.insert(eligibilityRuleSetQuestionBindings).values(
        sourceQuestions.map((binding) => ({
          applicantLabel: binding.applicantLabel,
          code: binding.code,
          createdBy: input.actorId,
          inputType: binding.inputType,
          order: binding.order,
          questionId: binding.questionId,
          reviewerLabel: binding.reviewerLabel,
          versionId: version.id,
        })),
      );
    }
    return version;
  });
}
