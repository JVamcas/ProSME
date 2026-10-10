import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
} from "./eligibility-ruleset.schema";
import { cloneEligibilityVersionContent } from "./EligibilityVersionContentRepository";
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
        .select()
        .from(eligibilityRuleSetVersions)
        .where(
          and(
            eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
            eq(eligibilityRuleSetVersions.status, "DRAFT"),
            eq(
              eligibilityRuleSetVersions.sourceVersionId,
              input.sourceVersionId,
            ),
          ),
        )
        .orderBy(desc(eligibilityRuleSetVersions.versionNumber))
        .limit(1),
      transaction
        .select()
        .from(eligibilityRuleSetVersions)
        .where(
          and(
            eq(eligibilityRuleSetVersions.id, input.sourceVersionId),
            eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
          ),
        )
        .limit(1),
      transaction
        .select({
          versionNumber: sql<number>`max(${eligibilityRuleSetVersions.versionNumber})`,
        })
        .from(eligibilityRuleSetVersions)
        .where(eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId)),
    ]);
    if (!source[0] || source[0].status === "DRAFT") return null;
    if (draft[0]) return draft[0];
    const [version] = await transaction
      .insert(eligibilityRuleSetVersions)
      .values({
        createdBy: input.actorId,
        ruleSetId: input.ruleSetId,
        sourceVersionId: input.sourceVersionId,
        metadata: source[0].metadata,
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
        .where(
          eq(
            eligibilityRuleSetQuestionBindings.versionId,
            input.sourceVersionId,
          ),
        ),
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
    await cloneEligibilityVersionContent(
      transaction,
      input.sourceVersionId,
      version.id,
      input.actorId,
    );
    return version;
  });
}
