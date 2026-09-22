import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { deserializeConditionGroup } from "@/modules/conditions/domain/ConditionSerialization";
import { findConditionNode } from "@/modules/conditions/domain/ConditionTree";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type {
  EligibilityInputDefinition,
  EligibilityInputDependency,
} from "../domain/EligibilityInputDefinition";
import { conditionNodeReferencesEligibilityInput } from "../domain/EligibilityInputDependencies";
import {
  eligibilityInputDefinitions,
  eligibilityRules,
  eligibilityScreeningSourceBindings,
  eligibilitySelfCheckQuestions,
} from "./eligibility-ruleset.schema";

type StoredInput = typeof eligibilityInputDefinitions.$inferSelect;
type StoredQuestion = typeof eligibilitySelfCheckQuestions.$inferSelect | null;
type StoredScreening =
  typeof eligibilityScreeningSourceBindings.$inferSelect | null;

function mapInput(
  input: StoredInput,
  question: StoredQuestion,
  screening: StoredScreening,
): EligibilityInputDefinition {
  return {
    availableIn: input.availableIn,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    groupKey: input.groupKey,
    groupLabel: input.groupLabel,
    id: input.id,
    label: input.label,
    order: input.order,
    screening: screening
      ? {
          sourceDefinitionId: screening.sourceDefinitionId,
          sourceKey: screening.sourceKey,
          sourceKind: screening.sourceKind,
          sourceVersionId: screening.sourceVersionId,
          valuePath: screening.valuePath,
        }
      : null,
    selfCheck: question
      ? {
          answerType: question.answerType,
          explanation: question.explanation,
          helpText: question.helpText,
          options: question.options,
          prompt: question.prompt,
          required: question.required,
        }
      : null,
    stableKey: input.stableKey,
    type: input.type,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
    versionId: input.versionId,
  };
}

export async function listEligibilityInputs(versionId: string) {
  const rows = await getDatabase()
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
    .where(eq(eligibilityInputDefinitions.versionId, versionId))
    .orderBy(
      asc(eligibilityInputDefinitions.order),
      asc(eligibilityInputDefinitions.id),
    );
  return rows.map((row) => mapInput(
    row.input,
    row.question,
    row.screening,
  ));
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
  const result = await getDatabase().execute<{ issue: string | null }>(sql`
    SELECT CASE
      WHEN 'SELF_CHECK' = ANY(input.available_in)
        AND question.input_definition_id IS NULL
        THEN input.stable_key || ': Self Check question is missing.'
      WHEN NOT ('SELF_CHECK' = ANY(input.available_in))
        AND question.input_definition_id IS NOT NULL
        THEN input.stable_key || ': unexpected Self Check question.'
      WHEN 'SCREENING' = ANY(input.available_in)
        AND source.input_definition_id IS NULL
        THEN input.stable_key || ': Screening source is missing.'
      WHEN NOT ('SCREENING' = ANY(input.available_in))
        AND source.input_definition_id IS NOT NULL
        THEN input.stable_key || ': unexpected Screening source.'
      WHEN source.input_definition_id IS NOT NULL AND NOT (
        CASE source.source_kind
          WHEN 'APPLICATION_FORM_FIELD' THEN EXISTS (
            SELECT 1 FROM app_form_fields field
            WHERE field.id = source.source_definition_id
              AND field.form_version_id = source.source_version_id
          )
          WHEN 'FUNDING_CALL_FIELD' THEN EXISTS (
            SELECT 1 FROM app_funding_calls funding_call
            WHERE funding_call.id = source.source_definition_id
              AND funding_call.eligibility_rule_set_version_id = input.version_id
          )
          WHEN 'WORKFLOW_FORM_FIELD' THEN EXISTS (
            SELECT 1 FROM app_form_fields field
            WHERE field.id = source.source_definition_id
              AND field.form_version_id = source.source_version_id
          )
          WHEN 'SCREENING_CHECKLIST_ITEM' THEN EXISTS (
            SELECT 1
            FROM app_workflow_stage_checklist_definitions checklist
            JOIN app_workflow_stage_definitions stage
              ON stage.id = checklist.stage_id
            WHERE checklist.id = source.source_definition_id
              AND stage.version_id = source.source_version_id
          )
          WHEN 'DOCUMENT_REQUIREMENT_FACT' THEN EXISTS (
            SELECT 1
            FROM app_workflow_stage_document_requirements requirement
            JOIN app_workflow_stage_definitions stage
              ON stage.id = requirement.stage_id
            WHERE requirement.id = source.source_definition_id
              AND stage.version_id = source.source_version_id
          )
          WHEN 'MANUAL_ASSESSMENT' THEN EXISTS (
            SELECT 1
            FROM app_stage_task_definitions task
            JOIN app_workflow_stage_definitions stage
              ON stage.id = task.stage_id
            WHERE task.id = source.source_definition_id
              AND stage.version_id = source.source_version_id
          )
          WHEN 'INTEGRATION_OUTPUT' THEN FALSE
          ELSE FALSE
        END
      ) THEN input.stable_key || ': Screening source is unresolved.'
      ELSE NULL
    END AS issue
    FROM app_eligibility_input_definitions input
    LEFT JOIN app_eligibility_self_check_questions question
      ON question.input_definition_id = input.id
    LEFT JOIN app_eligibility_screening_source_bindings source
      ON source.input_definition_id = input.id
    WHERE input.version_id = ${versionId}
  `);
  return result.rows.flatMap((row) => row.issue ? [row.issue] : []);
}
