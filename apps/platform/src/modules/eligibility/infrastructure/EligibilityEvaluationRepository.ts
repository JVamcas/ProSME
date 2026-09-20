import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { deserializeConditionGroup } from "@/modules/conditions/domain/ConditionSerialization";
import { findConditionNode } from "@/modules/conditions/domain/ConditionTree";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type {
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
} from "../domain/EligibilityEvaluation";
import type { EligibilityRuleSetStatus } from "../domain/EligibilityRuleSet";
import {
  eligibilityRules,
  eligibilityRuleSetVersions,
} from "./eligibility-ruleset.schema";

export class InvalidEligibilityEvaluationRuleSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEligibilityEvaluationRuleSetError";
  }
}

async function findEligibilityRuleSetForEvaluation(
  versionId: string,
  statuses: EligibilityRuleSetStatus[],
): Promise<EligibilityEvaluationRuleSet | null> {
  const rows = await getDatabase()
    .select({
      applicantMessage: eligibilityRules.applicantMessage,
      conditionDefinition: conditionGroups.definition,
      conditionGroupId: eligibilityRules.conditionGroupId,
      conditionId: eligibilityRules.conditionId,
      conditionKind: eligibilityRules.conditionKind,
      executionMode: eligibilityRules.executionMode,
      failureType: eligibilityRules.failureType,
      order: eligibilityRules.order,
      reasonCode: eligibilityRules.reasonCode,
      ruleId: eligibilityRules.id,
      ruleSetId: eligibilityRuleSetVersions.ruleSetId,
      versionId: eligibilityRuleSetVersions.id,
      versionNumber: eligibilityRuleSetVersions.versionNumber,
    })
    .from(eligibilityRuleSetVersions)
    .leftJoin(
      eligibilityRules,
      eq(eligibilityRules.versionId, eligibilityRuleSetVersions.id),
    )
    .leftJoin(
      conditionGroups,
      eq(conditionGroups.id, eligibilityRules.conditionGroupId),
    )
    .where(
      and(
        eq(eligibilityRuleSetVersions.id, versionId),
        inArray(eligibilityRuleSetVersions.status, statuses),
      ),
    )
    .orderBy(asc(eligibilityRules.order));
  const [first] = rows;
  if (!first) return null;

  const rules = rows.flatMap((row): EligibilityEvaluationRule[] => {
    if (!row.ruleId) return [];
    if (!row.conditionDefinition || !row.conditionGroupId) {
      throw new InvalidEligibilityEvaluationRuleSetError(
        `Eligibility rule "${row.ruleId}" has no condition group.`,
      );
    }
    const group = deserializeConditionGroup(row.conditionDefinition);
    const conditionDefinition = row.conditionKind === "GROUP"
      ? group
      : findConditionNode(group, row.conditionId ?? "");
    if (!conditionDefinition || row.conditionKind !== conditionDefinition.kind) {
      throw new InvalidEligibilityEvaluationRuleSetError(
        `Eligibility rule "${row.ruleId}" has an invalid condition reference.`,
      );
    }

    return [{
      applicantMessage: row.applicantMessage!,
      condition: row.conditionKind === "CONDITION"
        ? {
            conditionGroupId: row.conditionGroupId,
            conditionId: row.conditionId!,
            kind: "CONDITION",
          }
        : {
            conditionGroupId: row.conditionGroupId,
            kind: "GROUP",
          },
      conditionDefinition,
      executionMode: row.executionMode!,
      failureType: row.failureType!,
      id: row.ruleId,
      order: row.order!,
      reasonCode: row.reasonCode!,
    }];
  });

  return {
    ruleSetId: first.ruleSetId,
    rules,
    versionId: first.versionId,
    versionNumber: first.versionNumber,
  };
}

export function findPublishedEligibilityRuleSetForEvaluation(versionId: string) {
  return findEligibilityRuleSetForEvaluation(versionId, ["PUBLISHED"]);
}

export function findTestableEligibilityRuleSetForEvaluation(versionId: string) {
  return findEligibilityRuleSetForEvaluation(
    versionId,
    ["DRAFT", "PUBLISHED"],
  );
}
