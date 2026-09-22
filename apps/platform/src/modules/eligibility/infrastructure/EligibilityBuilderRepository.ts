import "server-only";

import { inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { deserializeConditionGroup } from "@/modules/conditions/domain/ConditionSerialization";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { findConditionNode } from "@/modules/conditions/domain/ConditionTree";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type {
  EligibilityBuilderRule,
  EligibilityRuleSetBuilderView,
  EligibilityRuleSetPage,
} from "../api/EligibilityRuleSetTransport";
import type { EligibilityRule } from "../domain/EligibilityRule";
import {
  findEligibilityRuleSet,
  findEligibilityRuleSetVersion,
} from "./EligibilityRuleSetRepository";

function allowedActions(
  status: EligibilityRuleSetBuilderView["version"]["status"],
): EligibilityRuleSetBuilderView["allowedActions"] {
  if (status === "DRAFT") return ["UPDATE", "PUBLISH"];
  if (status === "PUBLISHED") return ["RETIRE", "CLONE"];
  return ["CLONE"];
}

function editableGroup(
  rule: EligibilityRule & { id: string },
  storedGroup: ConditionGroup,
  draft: boolean,
): ConditionGroup {
  if (rule.condition.kind === "GROUP") {
    return draft ? { ...storedGroup, id: rule.id } : storedGroup;
  }
  const condition = findConditionNode(
    storedGroup,
    rule.condition.conditionId,
  );
  if (!condition || condition.kind !== "CONDITION") {
    throw new Error(`Eligibility rule "${rule.id}" has an invalid condition.`);
  }
  return {
    children: [condition],
    combinator: "AND",
    id: rule.id,
    kind: "GROUP",
  };
}

export async function findEligibilityRuleSetBuilder(
  ruleSetId: string,
  versionId?: string,
): Promise<EligibilityRuleSetBuilderView | null> {
  const ruleSet = versionId
    ? await findEligibilityRuleSetVersion(versionId)
    : await findEligibilityRuleSet(ruleSetId);
  if (!ruleSet || ruleSet.definition.id !== ruleSetId) return null;
  const groupIds = [...new Set(
    ruleSet.rules.map((rule) => rule.condition.conditionGroupId),
  )];
  const storedGroups = groupIds.length
    ? await getDatabase()
        .select({
          definition: conditionGroups.definition,
          id: conditionGroups.id,
        })
        .from(conditionGroups)
        .where(inArray(conditionGroups.id, groupIds))
    : [];
  const groups = new Map(
    storedGroups.map((group) => [
      group.id,
      deserializeConditionGroup(group.definition),
    ]),
  );
  const draft = ruleSet.version.status === "DRAFT";
  const rules = ruleSet.rules.map((rule): EligibilityBuilderRule => {
    if (!rule.id) throw new Error("Stored eligibility rule has no identifier.");
    const group = groups.get(rule.condition.conditionGroupId);
    if (!group) throw new Error(`Eligibility rule "${rule.id}" has no condition group.`);
    return {
      applicantMessage: rule.applicantMessage,
      condition: editableGroup(
        rule as EligibilityRule & { id: string },
        group,
        draft,
      ),
      executionMode: rule.executionMode,
      failureType: rule.failureType,
      id: rule.id,
      order: rule.order,
      reasonCode: rule.reasonCode,
    };
  });
  return {
    allowedActions: allowedActions(ruleSet.version.status),
    conditionFields: [],
    context: { fundingCalls: [] },
    definition: ruleSet.definition,
    registryIssues: [],
    rules,
    screeningSources: [],
    version: ruleSet.version,
    versions: ruleSet.versions,
  };
}

export async function listEligibilityRuleSets(input: {
  page: number;
  pageSize: number;
}): Promise<EligibilityRuleSetPage> {
  const database = getDatabase();
  const offset = (input.page - 1) * input.pageSize;
  const [result, countResult] = await Promise.all([
    database.execute(sql`
      SELECT definition.id,
        definition.code,
        definition.name,
        definition.description,
        version.id AS "versionId",
        version.version_number AS "version",
        version.row_version AS "versionRowVersion",
        version.status AS "status",
        COALESCE(rule_counts.rule_count, 0)::integer AS "ruleCount",
        COALESCE(bindings.funding_calls, '[]'::jsonb) AS "fundingCalls",
        version.updated_at AS "updatedAt"
      FROM app_eligibility_rule_sets definition
      INNER JOIN app_eligibility_rule_set_versions version
        ON version.rule_set_id = definition.id
      LEFT JOIN LATERAL (
        SELECT count(*) AS rule_count
        FROM app_eligibility_rules rule
        WHERE rule.version_id = version.id
      ) rule_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', funding_call.id,
            'reference', funding_call.reference,
            'title', funding_call.title
          )
          ORDER BY funding_call.title, funding_call.id
        ) AS funding_calls
        FROM app_funding_calls funding_call
        WHERE funding_call.eligibility_rule_set_version_id = version.id
      ) bindings ON TRUE
      ORDER BY definition.name ASC, version.version_number DESC, version.id ASC
      LIMIT ${input.pageSize}
      OFFSET ${offset}
    `),
    database.execute(sql`
      SELECT count(*)::integer AS total
      FROM app_eligibility_rule_set_versions version
      INNER JOIN app_eligibility_rule_sets definition
        ON definition.id = version.rule_set_id
    `),
  ]);
  const total = Number(countResult.rows[0]?.total ?? 0);
  return {
    items: result.rows as EligibilityRuleSetPage["items"],
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}
