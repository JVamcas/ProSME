import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { copyEligibilityConditions } from "../domain/EligibilityConditionCopy";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import {
  deserializeConditionGroup,
  serializeConditionGroup,
} from "@/modules/conditions/domain/ConditionSerialization";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type { EligibilityRule } from "../domain/EligibilityRule";
import { validateEligibilityRules } from "../domain/EligibilityRuleValidation";
import {
  findEligibilityRuleSet,
  InvalidEligibilityRulesError,
} from "./EligibilityRuleSetRepository";
import { cloneEligibilityRuleSetVersion } from "./EligibilityRuleSetCloneRepository";
import {
  eligibilityRules,
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
  actorId: string;
  code: string;
  description: string;
  name: string;
  ruleSetId: string;
}) {
  const source = await findEligibilityRuleSet(input.ruleSetId);
  if (!source) return null;
  const draft =
    source.version.status === "DRAFT"
      ? source.version
      : await cloneEligibilityRuleSetVersion({
          actorId: input.actorId,
          ruleSetId: input.ruleSetId,
          sourceVersionId: source.version.id,
        });
  if (!draft) return null;
  const [version] = await getDatabase()
    .update(eligibilityRuleSetVersions)
    .set({
      metadata: {
        code: input.code,
        description: input.description,
        name: input.name,
      },
      rowVersion: draft.rowVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(eligibilityRuleSetVersions.id, draft.id),
        eq(eligibilityRuleSetVersions.status, "DRAFT"),
        eq(eligibilityRuleSetVersions.rowVersion, draft.rowVersion),
      ),
    )
    .returning();
  return version ? { ...source.definition, ...version.metadata } : null;
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

    const copied = copyEligibilityConditions(
      input.conditionDefinitions,
      input.rules,
    );
    const rules = copied.rules;
    if (copied.definitions.length) {
      await transaction
        .insert(conditionGroups)
        .values(
          copied.definitions.map((definition) => ({
            definition: serializeConditionGroup(definition),
            id: definition.id,
          })),
        )
        .onConflictDoUpdate({
          target: conditionGroups.id,
          set: {
            definition: sql`excluded.definition`,
            updatedAt: new Date(),
          },
        });
    }

    const groupIds = [
      ...new Set(rules.map((rule) => rule.condition.conditionGroupId)),
    ];
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
    const issues = validateEligibilityRules(rules, groups);
    if (issues.length) throw new InvalidEligibilityRulesError(issues);

    const [questions, existingBindings] = await Promise.all([
      input.questionIds.length
        ? transaction
            .select()
            .from(eligibilityQuestions)
            .where(
              and(
                inArray(eligibilityQuestions.id, input.questionIds),
                eq(eligibilityQuestions.active, true),
              ),
            )
        : Promise.resolve([]),
      transaction
        .select()
        .from(eligibilityRuleSetQuestionBindings)
        .where(
          eq(eligibilityRuleSetQuestionBindings.versionId, input.versionId),
        ),
    ]);
    if (questions.length !== input.questionIds.length) {
      throw new InvalidEligibilityQuestionSelectionError();
    }
    const questionsById = new Map(
      questions.map((question) => [question.id, question]),
    );
    const existingByQuestionId = new Map(
      existingBindings.map((binding) => [binding.questionId, binding]),
    );

    const [updated] = await transaction
      .update(eligibilityRuleSetVersions)
      .set({
        rowVersion: input.expectedRowVersion + 1,
        metadata: sql`${eligibilityRuleSetVersions.metadata} || ${JSON.stringify(
          {
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
          },
        )}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(eligibilityRuleSetVersions.id, input.versionId))
      .returning();
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
    if (rules.length) {
      await transaction.insert(eligibilityRules).values(
        rules.map((rule) => ({
          applicantMessage: rule.applicantMessage.trim(),
          conditionGroupId: rule.condition.conditionGroupId,
          conditionId:
            rule.condition.kind === "CONDITION"
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
