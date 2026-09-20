import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import { deserializeConditionGroup } from "@/modules/conditions/domain/ConditionSerialization";
import type { EligibilityRule } from "../domain/EligibilityRule";
import type { EligibilityRuleSet } from "../domain/EligibilityRuleSet";
import { validateEligibilityRules } from "../domain/EligibilityRuleValidation";
import {
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
} from "./eligibility-ruleset.schema";

export class InvalidEligibilityRulesError extends Error {
  readonly issues: ReturnType<typeof validateEligibilityRules>;

  constructor(issues: ReturnType<typeof validateEligibilityRules>) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "InvalidEligibilityRulesError";
    this.issues = issues;
  }
}

function storedRule(rule: typeof eligibilityRules.$inferSelect): EligibilityRule {
  return {
    id: rule.id,
    applicantMessage: rule.applicantMessage,
    condition: rule.conditionKind === "CONDITION"
      ? {
          conditionGroupId: rule.conditionGroupId,
          conditionId: rule.conditionId!,
          kind: "CONDITION",
        }
      : {
          conditionGroupId: rule.conditionGroupId,
          kind: "GROUP",
        },
    executionMode: rule.executionMode,
    failureType: rule.failureType,
    order: rule.order,
    reasonCode: rule.reasonCode,
  };
}

function storedVersion(
  version: typeof eligibilityRuleSetVersions.$inferSelect,
) {
  return {
    createdAt: version.createdAt,
    id: version.id,
    publishedAt: version.publishedAt,
    retiredAt: version.retiredAt,
    rowVersion: version.rowVersion,
    ruleSetId: version.ruleSetId,
    status: version.status,
    updatedAt: version.updatedAt,
    versionNumber: version.versionNumber,
  };
}

export async function findEligibilityRuleSetVersion(
  versionId: string,
): Promise<EligibilityRuleSet | null> {
  const database = getDatabase();
  const [joined] = await database
    .select({
      definition: eligibilityRuleSets,
      version: eligibilityRuleSetVersions,
    })
    .from(eligibilityRuleSetVersions)
    .innerJoin(
      eligibilityRuleSets,
      eq(eligibilityRuleSets.id, eligibilityRuleSetVersions.ruleSetId),
    )
    .where(eq(eligibilityRuleSetVersions.id, versionId))
    .limit(1);
  if (!joined) return null;

  const [rules, versions] = await Promise.all([
    database
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.versionId, versionId))
      .orderBy(asc(eligibilityRules.order)),
    database
      .select()
      .from(eligibilityRuleSetVersions)
      .where(eq(eligibilityRuleSetVersions.ruleSetId, joined.definition.id))
      .orderBy(desc(eligibilityRuleSetVersions.versionNumber)),
  ]);

  return {
    definition: joined.definition,
    rules: rules.map(storedRule),
    version: storedVersion(joined.version),
    versions: versions.map(storedVersion),
  };
}

export async function findEligibilityRuleSet(
  ruleSetId: string,
): Promise<EligibilityRuleSet | null> {
  const [version] = await getDatabase()
    .select({ id: eligibilityRuleSetVersions.id })
    .from(eligibilityRuleSetVersions)
    .where(eq(eligibilityRuleSetVersions.ruleSetId, ruleSetId))
    .orderBy(
      sql`case when ${eligibilityRuleSetVersions.status} = 'DRAFT' then 0 else 1 end`,
      desc(eligibilityRuleSetVersions.versionNumber),
    )
    .limit(1);
  return version ? findEligibilityRuleSetVersion(version.id) : null;
}

export async function createEligibilityRuleSet(input: {
  actorId: string;
  code: string;
  description: string;
  name: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [definition] = await transaction
      .insert(eligibilityRuleSets)
      .values({
        code: input.code,
        createdBy: input.actorId,
        description: input.description,
        name: input.name,
      })
      .returning();
    const [version] = await transaction
      .insert(eligibilityRuleSetVersions)
      .values({
        createdBy: input.actorId,
        ruleSetId: definition.id,
        versionNumber: 1,
      })
      .returning();
    return { definition, version };
  });
}

export async function updateEligibilityRuleSetDraft(input: {
  actorId: string;
  code?: string;
  description?: string;
  expectedRowVersion: number;
  name?: string;
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
          order: rule.order,
          reasonCode: rule.reasonCode,
          versionId: input.versionId,
        })),
      );
    }
    return updated;
  });
}

export async function publishEligibilityRuleSetVersion(input: {
  actorId: string;
  expectedRowVersion: number;
  ruleSetId: string;
  versionId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [current] = await transaction
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
    if (!current) return null;
    const storedRules = await transaction
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.versionId, input.versionId));
    const rules = storedRules.map(storedRule);
    const groupIds = [...new Set(
      rules.map((rule) => rule.condition.conditionGroupId),
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
    const issues = validateEligibilityRules(rules, groups);
    if (issues.length) throw new InvalidEligibilityRulesError(issues);

    const [version] = await transaction
      .update(eligibilityRuleSetVersions)
      .set({
        publishedAt: new Date(),
        publishedBy: input.actorId,
        rowVersion: input.expectedRowVersion + 1,
        status: "PUBLISHED",
        updatedAt: new Date(),
      })
      .where(eq(eligibilityRuleSetVersions.id, input.versionId))
      .returning();
    return version;
  });
}

export async function retireEligibilityRuleSetVersion(input: {
  expectedRowVersion: number;
  ruleSetId: string;
  versionId: string;
}) {
  const [version] = await getDatabase()
    .update(eligibilityRuleSetVersions)
    .set({
      retiredAt: new Date(),
      rowVersion: input.expectedRowVersion + 1,
      status: "RETIRED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(eligibilityRuleSetVersions.id, input.versionId),
        eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
        eq(eligibilityRuleSetVersions.status, "PUBLISHED"),
        eq(eligibilityRuleSetVersions.rowVersion, input.expectedRowVersion),
      ),
    )
    .returning();
  return version ?? null;
}

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
        .where(
          and(
            eq(eligibilityRuleSetVersions.ruleSetId, input.ruleSetId),
            eq(eligibilityRuleSetVersions.status, "DRAFT"),
          ),
        )
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
    if (draft.length || !source[0] || source[0].status === "DRAFT") return null;
    const [version] = await transaction
      .insert(eligibilityRuleSetVersions)
      .values({
        createdBy: input.actorId,
        ruleSetId: input.ruleSetId,
        versionNumber: Number(latest[0]?.versionNumber ?? 0) + 1,
      })
      .returning();
    const sourceRules = await transaction
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.versionId, input.sourceVersionId));
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
    return version;
  });
}
