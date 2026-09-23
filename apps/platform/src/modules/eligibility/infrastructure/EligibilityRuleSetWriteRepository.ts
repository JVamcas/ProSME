import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import {
  deserializeConditionGroup,
  serializeConditionGroup,
} from "@/modules/conditions/domain/ConditionSerialization";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type { EligibilityRule } from "../domain/EligibilityRule";
import { validateEligibilityRules } from "../domain/EligibilityRuleValidation";
import { InvalidEligibilityRulesError } from "./EligibilityRuleSetRepository";
import {
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
} from "./eligibility-ruleset.schema";
import {
  eligibilityQuestions,
  eligibilityRuleSetQuestionBindings,
} from "./eligibility-question.schema";

export class InvalidEligibilityQuestionSelectionError extends Error {
  constructor() {
    super("One or more selected eligibility questions are unavailable.");
    this.name = "InvalidEligibilityQuestionSelectionError";
  }
}

export async function updateEligibilityRuleSetDefinition(input: {
  code: string;
  description: string;
  name: string;
  ruleSetId: string;
}) {
  const [definition] = await getDatabase()
    .update(eligibilityRuleSets)
    .set({
      code: input.code,
      description: input.description,
      name: input.name,
      updatedAt: new Date(),
    })
    .where(eq(eligibilityRuleSets.id, input.ruleSetId))
    .returning();
  return definition ?? null;
}

export async function updateEligibilityRuleSetDraft(input: {
  actorId: string;
  code?: string;
  conditionDefinitions: ConditionGroup[];
  description?: string;
  expectedRowVersion: number;
  name?: string;
  questionIds: string[];
  ruleSetId: string;
  rules: EligibilityRule[];
  versionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [version] = await transaction
      .select({ id: eligibilityRuleSetVersions.id })
      .from(eligibilityRuleSetVersions)
      .where(
        and(
          eq(eligibilityRuleSetVersions.id, input.versionId),
          eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
          eq(eligibilityRuleSetVersions.status, "DRAFT"),
          eq(eligibilityRuleSetVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .for("update")
      .limit(1);
    if (!version) return null;

    if (input.conditionDefinitions.length) {
      await transaction.insert(conditionGroups).values(
        input.conditionDefinitions.map((definition) => ({
          definition: serializeConditionGroup(definition),
          id: definition.id,
        })),
      ).onConflictDoUpdate({
        target: conditionGroups.id,
        set: {
          definition: sql`excluded.definition`,
          updatedAt: new Date(),
        },
      });
    }

    const groupIds = [...new Set(
      input.rules.map((rule) => rule.condition.conditionGroupId),
    )];
    const storedGroups = groupIds.length
      ? await transaction
          .select({
            definition: conditionGroups.definition,
            id: conditionGroups.id,
          })
          .from(conditionGroups)
          .where(inArray(conditionGroups.id, groupIds))
          .for("share")
      : [];
    const groups = new Map(
      storedGroups.map((group) => [
        group.id,
        deserializeConditionGroup(group.definition),
      ]),
    );
    const issues = validateEligibilityRules(input.rules, groups);
    if (issues.length) throw new InvalidEligibilityRulesError(issues);

    const [questions, existingBindings] = await Promise.all([
      input.questionIds.length
        ? transaction
            .select()
            .from(eligibilityQuestions)
            .where(and(
              inArray(eligibilityQuestions.id, input.questionIds),
              eq(eligibilityQuestions.active, true),
            ))
        : Promise.resolve([]),
      transaction
        .select()
        .from(eligibilityRuleSetQuestionBindings)
        .where(eq(eligibilityRuleSetQuestionBindings.versionId, input.versionId)),
    ]);
    if (questions.length !== input.questionIds.length) {
      throw new InvalidEligibilityQuestionSelectionError();
    }
    const questionsById = new Map(questions.map((question) => [
      question.id,
      question,
    ]));
    const existingByQuestionId = new Map(existingBindings.map((binding) => [
      binding.questionId,
      binding,
    ]));

    const [updated] = await transaction
      .update(eligibilityRuleSetVersions)
      .set({
        rowVersion: input.expectedRowVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(eligibilityRuleSetVersions.id, input.versionId))
      .returning();
    if (input.code || input.description !== undefined || input.name) {
      await transaction
        .update(eligibilityRuleSets)
        .set({
          code: input.code,
          description: input.description,
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(eligibilityRuleSets.id, input.ruleSetId));
    }
    await transaction
      .delete(eligibilityRules)
      .where(eq(eligibilityRules.versionId, input.versionId));
    await transaction
      .delete(eligibilityRuleSetQuestionBindings)
      .where(eq(eligibilityRuleSetQuestionBindings.versionId, input.versionId));
    if (input.questionIds.length) {
      await transaction.insert(eligibilityRuleSetQuestionBindings).values(
        input.questionIds.map((questionId, index) => {
          const question = questionsById.get(questionId)!;
          const existing = existingByQuestionId.get(questionId);
          return {
            applicantLabel: existing?.applicantLabel ?? question.applicantLabel,
            code: existing?.code ?? question.code,
            createdAt: existing?.createdAt ?? new Date(),
            createdBy: existing?.createdBy ?? input.actorId,
            id: existing?.id,
            inputType: existing?.inputType ?? question.inputType,
            order: index + 1,
            questionId,
            reviewerLabel: existing?.reviewerLabel ?? question.reviewerLabel,
            versionId: input.versionId,
          };
        }),
      );
    }
    if (input.rules.length) {
      await transaction.insert(eligibilityRules).values(
        input.rules.map((rule) => ({
          applicantMessage: rule.applicantMessage.trim(),
          conditionGroupId: rule.condition.conditionGroupId,
          conditionId: rule.condition.kind === "CONDITION"
            ? rule.condition.conditionId
            : null,
          conditionKind: rule.condition.kind,
          executionMode: rule.executionMode,
          failureType: rule.failureType,
          id: rule.id,
          order: rule.order,
          reasonCode: rule.reasonCode,
          versionId: input.versionId,
        })),
      );
    }
    return updated;
  });
}
