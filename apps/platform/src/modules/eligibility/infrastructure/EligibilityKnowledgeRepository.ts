import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import { RequestValidationError } from "@/lib/resource-errors";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { EligibilityFailureType } from "../domain/EligibilityRule";
import type { SelfCheckQuestionDefinition } from "../domain/EligibilityInputDefinition";

export type PublicEligibilityKnowledge = {
  versions: { id: string; versionNumber: number }[];
  rules: {
    id: string;
    versionId: string;
    conditionGroupId: string;
    conditionId: string | null;
    conditionKind: "GROUP" | "CONDITION";
    failureType: EligibilityFailureType;
    applicantMessage: string;
    order: number;
  }[];
  groups: { id: string; definition: ConditionGroup }[];
  inputs: {
    versionId: string;
    stableKey: string;
    label: string;
    type: string;
    selfCheck: SelfCheckQuestionDefinition;
  }[];
};

export async function readEligibilityKnowledgeSources(
  ids: string[],
  transaction: DatabaseTransaction,
): Promise<PublicEligibilityKnowledge> {
  if (!ids.length) return { versions: [], rules: [], groups: [], inputs: [] };
  // Read in a stable order on one transaction connection. Locks also protect
  // mutable condition and self-check dependencies through the approval write.
  const versions = await transaction.execute(sql`
    SELECT id, version_number AS "versionNumber" FROM app_eligibility_rule_set_versions
    WHERE id = ANY(${sql.param(ids)}::uuid[]) AND status IN ('PUBLISHED', 'RETIRED')
    ORDER BY id FOR SHARE
  `);
  const available = versions.rows.map((row) => row.id as string);
  const rules = await transaction.execute(sql`
    SELECT id, version_id AS "versionId", condition_group_id AS "conditionGroupId",
      condition_id AS "conditionId", condition_kind AS "conditionKind",
      failure_type AS "failureType", applicant_message AS "applicantMessage", display_order AS "order"
    FROM app_eligibility_rules WHERE version_id = ANY(${sql.param(available)}::uuid[])
      AND execution_mode IN ('SELF_CHECK', 'BOTH')
    ORDER BY version_id, display_order, id LIMIT 5001 FOR SHARE
  `);
  const inputs = await transaction.execute(sql`
    SELECT i.version_id AS "versionId", i.stable_key AS "stableKey", i.label, i.data_type AS type,
      jsonb_build_object('prompt', q.prompt, 'helpText', q.help_text,
        'explanation', q.explanation, 'answerType', q.answer_type,
        'required', q.required, 'options', q.options) AS "selfCheck"
    FROM app_eligibility_input_definitions i
    INNER JOIN app_eligibility_self_check_questions q ON q.input_definition_id = i.id
    WHERE i.version_id = ANY(${sql.param(available)}::uuid[]) AND 'SELF_CHECK' = ANY(i.available_in)
    ORDER BY i.version_id, i.display_order, i.id LIMIT 5001 FOR SHARE OF i, q
  `);
  if (rules.rows.length > 5000 || inputs.rows.length > 5000) {
    throw new RequestValidationError(
      "Selected eligibility guidance exceeds the bounded public export. Reduce the call selection.",
    );
  }
  const groupIds = [
    ...new Set(rules.rows.map((row) => row.conditionGroupId as string)),
  ];
  const groups = await transaction.execute(sql`
    SELECT id, definition FROM app_condition_groups WHERE id = ANY(${sql.param(groupIds)}::uuid[])
    ORDER BY id FOR SHARE
  `);
  return {
    versions: versions.rows as PublicEligibilityKnowledge["versions"],
    rules: rules.rows as PublicEligibilityKnowledge["rules"],
    inputs: inputs.rows as PublicEligibilityKnowledge["inputs"],
    groups: groups.rows as PublicEligibilityKnowledge["groups"],
  };
}
