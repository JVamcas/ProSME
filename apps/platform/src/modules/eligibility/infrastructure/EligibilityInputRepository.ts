import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import { deserializeConditionGroup } from "@/modules/conditions/domain/ConditionSerialization";
import { findConditionNode } from "@/modules/conditions/domain/ConditionTree";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type {
  EligibilityInputDefinition,
  EligibilityInputDependency,
} from "../domain/EligibilityInputDefinition";
import { conditionNodeReferencesEligibilityInput } from "../domain/EligibilityInputDependencies";
import {
  eligibilityRules,
} from "./eligibility-ruleset.schema";
import { eligibilityRuleSetQuestionBindings } from "./eligibility-question.schema";

export async function listEligibilityInputs(
  versionId: string,
  database: ReturnType<typeof getDatabase> | DatabaseTransaction = getDatabase(),
) {
  const questionRows = await database
    .select()
    .from(eligibilityRuleSetQuestionBindings)
    .where(eq(eligibilityRuleSetQuestionBindings.versionId, versionId))
    .orderBy(
      asc(eligibilityRuleSetQuestionBindings.order),
      asc(eligibilityRuleSetQuestionBindings.id),
    );
  return questionRows.map((binding): EligibilityInputDefinition => ({
      availableIn: ["SELF_CHECK", "SCREENING"],
      createdAt: binding.createdAt,
      createdBy: binding.createdBy,
      groupKey: "eligibility",
      groupLabel: "Eligibility questions",
      id: binding.id,
      label: binding.reviewerLabel,
      order: binding.order,
      screening: {
        sourceDefinitionId: binding.questionId,
        sourceKey: binding.code,
        sourceKind: "ELIGIBILITY_QUESTION_RESPONSE",
        sourceVersionId: binding.versionId,
        valuePath: "value",
      },
      selfCheck: {
        answerType: binding.inputType,
        explanation: "Your answer will be independently verified during Screening.",
        helpText: "Answer using the information currently available to you.",
        options: binding.inputType === "YES_NO_NA" ? [
          { label: "Yes", value: "YES" },
          { label: "No", value: "NO" },
          { label: "Not applicable", value: "NOT_APPLICABLE" },
        ] : [],
        prompt: binding.applicantLabel,
        required: true,
      },
      stableKey: binding.code,
      type: binding.inputType === "PERCENTAGE"
        ? "NUMBER"
        : binding.inputType === "YES_NO_NA"
          ? "TEXT"
          : binding.inputType,
      updatedAt: binding.createdAt,
      updatedBy: binding.createdBy,
      versionId: binding.versionId,
    }));
}

export async function findEligibilityInputDependencies(
  versionId: string,
  stableKey: string,
): Promise<EligibilityInputDependency[]> {
  const rows = await getDatabase()
    .select({
      conditionGroupId: eligibilityRules.conditionGroupId,
      conditionId: eligibilityRules.conditionId,
      conditionKind: eligibilityRules.conditionKind,
      definition: conditionGroups.definition,
      reasonCode: eligibilityRules.reasonCode,
      ruleId: eligibilityRules.id,
    })
    .from(eligibilityRules)
    .innerJoin(
      conditionGroups,
      eq(conditionGroups.id, eligibilityRules.conditionGroupId),
    )
    .where(eq(eligibilityRules.versionId, versionId));

  return rows.flatMap((row) => {
    const group = deserializeConditionGroup(row.definition);
    const node = row.conditionKind === "GROUP"
      ? group
      : findConditionNode(group, row.conditionId!);
    if (!node || !conditionNodeReferencesEligibilityInput(node, stableKey)) {
      return [];
    }
    return [{ reasonCode: row.reasonCode, ruleId: row.ruleId }];
  });
}

export async function findEligibilityInputPublicationIssues(
  versionId: string,
): Promise<string[]> {
  const database = getDatabase();
  const unresolved = await database.execute<{ issue: string }>(sql`
      SELECT DISTINCT rule.reason_code || ': unresolved field reference "'
        || trim(both '"' from path.value::text) || '".' AS issue
      FROM app_eligibility_rules rule
      INNER JOIN app_condition_groups condition_group
        ON condition_group.id = rule.condition_group_id
      CROSS JOIN LATERAL jsonb_path_query(
        condition_group.definition,
        '$.** ? (@.kind == "FIELD").key'
      ) path(value)
      LEFT JOIN app_eligibility_rule_set_question_bindings binding
        ON binding.version_id = rule.version_id
        AND 'eligibility.' || binding.code_snapshot
          = trim(both '"' from path.value::text)
      WHERE rule.version_id = ${versionId}
        AND trim(both '"' from path.value::text) LIKE 'eligibility.%'
        AND binding.id IS NULL
    `);
  return unresolved.rows.map((row) => row.issue);
}
