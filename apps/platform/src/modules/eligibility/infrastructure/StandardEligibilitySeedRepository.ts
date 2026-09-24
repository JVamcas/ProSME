import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { operator as conditionOperator } from "@/modules/conditions/domain/Operator";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { standardWorkflowCode } from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import {
  stageTaskDefinitions,
  workflowDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
} from "@/modules/workflows/infrastructure/workflow.schema";
import {
  ensureSystemSeedPrincipal,
  systemSeedUserId,
} from "@/platform/database/SystemSeedPrincipal";
import {
  standardEligibilityCriteria,
  standardEligibilityRuleSetCode,
  standardEligibilitySourceDocument,
} from "../domain/standard/StandardEligibilityCatalogue";
import {
  eligibilityQuestions,
  eligibilityRuleSetQuestionBindings,
} from "./eligibility-question.schema";
import {
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
  eligibilitySeedReviews,
} from "./eligibility-ruleset.schema";

type SeedInput = {
  approvedAt: Date;
  approvedBy: string;
  fundingCallReferences: readonly string[];
};

async function findWorkflowVersion(
  transaction: DatabaseTransaction,
): Promise<string> {
  const [workflow] = await transaction
    .select({ workflowVersionId: workflowDefinitionVersions.id })
    .from(workflowDefinitions)
    .innerJoin(
      workflowDefinitionVersions,
      eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
    )
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.versionId, workflowDefinitionVersions.id),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.stageId, workflowStageDefinitions.id),
    )
    .where(and(
      eq(workflowDefinitions.code, standardWorkflowCode),
      eq(stageTaskDefinitions.stableKey, "ELIGIBILITY_VERIFICATION"),
      inArray(workflowDefinitionVersions.status, ["DRAFT", "PUBLISHED"]),
    ))
    .orderBy(
      sql`CASE WHEN ${workflowDefinitionVersions.status} = 'DRAFT' THEN 0 ELSE 1 END`,
      desc(workflowDefinitionVersions.versionNumber),
    )
    .limit(1);
  if (!workflow) {
    throw new Error(
      "Run the rebuilt standard workflow seed before the standard eligibility seed.",
    );
  }
  return workflow.workflowVersionId;
}

function conditionFor(
  stableKey: string,
  operator: "EQUALS" | "GREATER_THAN_OR_EQUAL",
  constant: boolean | number | string | null,
): ConditionGroup {
  const groupId = crypto.randomUUID();
  return {
    children: [{
      id: crypto.randomUUID(),
      kind: "CONDITION",
      leftOperand: {
        key: `eligibility.${stableKey.toUpperCase()}`,
        kind: "FIELD",
      },
      operator: conditionOperator(operator),
      rightOperand: { kind: "CONSTANT", value: constant },
    }],
    combinator: "AND",
    id: groupId,
    kind: "GROUP",
  };
}

async function bindFundingCalls(
  transaction: DatabaseTransaction,
  versionId: string,
  workflowVersionId: string,
  references: readonly string[],
) {
  if (!references.length) return [];
  const uniqueReferences = [...new Set(references)];
  const calls = await transaction
    .select({
      eligibilityVersionId: fundingCalls.eligibilityRuleSetVersionId,
      id: fundingCalls.id,
      reference: fundingCalls.reference,
      status: fundingCalls.status,
      workflowVersionId: fundingCalls.workflowTemplateVersionId,
    })
    .from(fundingCalls)
    .where(inArray(fundingCalls.reference, uniqueReferences));
  const found = new Set(calls.map((call) => call.reference));
  const missing = uniqueReferences.filter((reference) => !found.has(reference));
  if (missing.length) {
    throw new Error(`Funding Calls not found: ${missing.join(", ")}.`);
  }
  for (const call of calls) {
    if (call.status !== "DRAFT") {
      throw new Error(`Funding Call ${call.reference} is not Draft.`);
    }
    if (
      call.eligibilityVersionId
      && call.eligibilityVersionId !== versionId
    ) {
      throw new Error(
        `Funding Call ${call.reference} already has another eligibility binding.`,
      );
    }
    if (call.workflowVersionId && call.workflowVersionId !== workflowVersionId) {
      throw new Error(
        `Funding Call ${call.reference} already has another workflow binding.`,
      );
    }
  }
  const unboundIds = calls
    .filter((call) =>
      call.eligibilityVersionId === null
      || call.workflowVersionId === null
    )
    .map((call) => call.id);
  if (unboundIds.length) {
    await transaction
      .update(fundingCalls)
      .set({
        eligibilityRuleSetVersionId: versionId,
        rowVersion: sql`${fundingCalls.rowVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: systemSeedUserId,
        workflowTemplateVersionId: workflowVersionId,
      })
      .where(inArray(fundingCalls.id, unboundIds));
  }
  return calls.map((call) => call.reference);
}

async function existingBaseline(transaction: DatabaseTransaction) {
  const [definition] = await transaction
    .select({ definitionId: eligibilityRuleSets.id })
    .from(eligibilityRuleSets)
    .where(eq(eligibilityRuleSets.code, standardEligibilityRuleSetCode))
    .for("update")
    .limit(1);
  if (!definition) return null;
  const [version] = await transaction
    .select({ versionId: eligibilityRuleSetVersions.id })
    .from(eligibilityRuleSetVersions)
    .where(eq(
      eligibilityRuleSetVersions.ruleSetId,
      definition.definitionId,
    ))
    .orderBy(
      sql`CASE WHEN ${eligibilityRuleSetVersions.status} = 'DRAFT' THEN 0 ELSE 1 END`,
      desc(eligibilityRuleSetVersions.versionNumber),
    )
    .limit(1);
  if (!version) {
    throw new Error(
      "The standard eligibility baseline exists without a version.",
    );
  }
  return {
    definitionId: definition.definitionId,
    versionId: version.versionId,
  };
}

function seedSnapshot() {
  return standardEligibilityCriteria.map((criterion) => ({
    applicantMessage: criterion.applicantMessage,
    constant: criterion.constant,
    failureType: criterion.failureType,
    inputType: criterion.inputType,
    label: criterion.label,
    operator: criterion.operator,
    prompt: criterion.prompt,
    questionType: criterion.questionType,
    reasonCode: criterion.reasonCode,
    stableKey: criterion.stableKey,
  }));
}

async function replaceStandardVersionConfiguration(
  transaction: DatabaseTransaction,
  versionId: string,
  input: Pick<SeedInput, "approvedAt" | "approvedBy">,
) {
  const priorGroups = await transaction
    .select({ id: eligibilityRules.conditionGroupId })
    .from(eligibilityRules)
    .where(eq(eligibilityRules.versionId, versionId));
  await transaction
    .delete(eligibilityRules)
    .where(eq(eligibilityRules.versionId, versionId));
  await transaction
    .delete(eligibilityRuleSetQuestionBindings)
    .where(eq(eligibilityRuleSetQuestionBindings.versionId, versionId));
  await transaction
    .delete(eligibilitySeedReviews)
    .where(eq(eligibilitySeedReviews.versionId, versionId));
  if (priorGroups.length) {
    await transaction.delete(conditionGroups).where(inArray(
      conditionGroups.id,
      priorGroups.map((group) => group.id),
    ));
  }
  const groups = standardEligibilityCriteria.map((criterion) =>
    conditionFor(criterion.stableKey, criterion.operator, criterion.constant)
  );
  await transaction.insert(conditionGroups).values(groups.map((group) => ({
    definition: group,
    id: group.id,
  })));
  await transaction.insert(eligibilityRules).values(
    standardEligibilityCriteria.map((criterion, index) => ({
      applicantMessage: criterion.applicantMessage,
      conditionGroupId: groups[index]!.id,
      conditionId: null,
      conditionKind: "GROUP" as const,
      executionMode: "BOTH" as const,
      failureType: criterion.failureType,
      order: index + 1,
      reasonCode: criterion.reasonCode,
      versionId,
    })),
  );
  await transaction
    .insert(eligibilityQuestions)
    .values(standardEligibilityCriteria.map((criterion) => ({
      applicantLabel: criterion.prompt,
      code: criterion.stableKey.toUpperCase(),
      createdBy: systemSeedUserId,
      inputType: criterion.questionType!,
      reviewerLabel: criterion.label,
      updatedBy: systemSeedUserId,
    })))
    .onConflictDoNothing({ target: eligibilityQuestions.code });
  const questionCodes = standardEligibilityCriteria.map(
    (criterion) => criterion.stableKey.toUpperCase(),
  );
  const storedQuestions = await transaction
    .select()
    .from(eligibilityQuestions)
    .where(inArray(eligibilityQuestions.code, questionCodes));
  const questionsByCode = new Map(
    storedQuestions.map((question) => [question.code, question]),
  );
  await transaction.insert(eligibilityRuleSetQuestionBindings).values(
    standardEligibilityCriteria.map((criterion, index) => {
      const question = questionsByCode.get(criterion.stableKey.toUpperCase())!;
      return {
        applicantLabel: question.applicantLabel,
        code: question.code,
        createdBy: systemSeedUserId,
        inputType: question.inputType,
        order: index + 1,
        questionId: question.id,
        reviewerLabel: question.reviewerLabel,
        versionId,
      };
    }),
  );
  await transaction.insert(eligibilitySeedReviews).values({
    approvalBasis:
      "User directed on 22 September 2026 that Proposed decisions be treated as approved.",
    approvedAt: input.approvedAt,
    approvedBy: input.approvedBy,
    decisionSnapshot: seedSnapshot(),
    sourceDocument: standardEligibilitySourceDocument,
    versionId,
  });
}

export async function insertStandardEligibilityBaseline(input: SeedInput) {
  return getDatabase().transaction(async (transaction) => {
    const existing = await existingBaseline(transaction);
    if (existing) {
      return {
        boundFundingCallReferences: [],
        created: false,
        definitionId: existing.definitionId,
        issueMessages: [],
        synchronized: false,
        versionId: existing.versionId,
      };
    }

    await ensureSystemSeedPrincipal(transaction);
    const workflowVersionId = await findWorkflowVersion(transaction);
    const [definition] = await transaction
      .insert(eligibilityRuleSets)
      .values({
        code: standardEligibilityRuleSetCode,
        createdBy: systemSeedUserId,
        description:
          "Approved configurable baseline from the SME Fund Eligibility decision matrix.",
        name: "SME Fund Eligibility Baseline",
      })
      .returning({ id: eligibilityRuleSets.id });
    const [version] = await transaction
      .insert(eligibilityRuleSetVersions)
      .values({
        createdBy: systemSeedUserId,
        ruleSetId: definition!.id,
        versionNumber: 1,
      })
      .returning({ id: eligibilityRuleSetVersions.id });

    await replaceStandardVersionConfiguration(transaction, version!.id, input);
    const boundFundingCallReferences = await bindFundingCalls(
      transaction,
      version!.id,
      workflowVersionId,
      input.fundingCallReferences,
    );
    return {
      boundFundingCallReferences,
      created: true,
      definitionId: definition!.id,
      issueMessages: [],
      synchronized: true,
      versionId: version!.id,
    };
  });
}
