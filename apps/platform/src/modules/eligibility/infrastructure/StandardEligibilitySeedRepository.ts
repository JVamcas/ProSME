import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { operator as conditionOperator } from "@/modules/conditions/domain/Operator";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import {
  formDefinitions,
  formFields,
  formVersions,
} from "@/modules/forms/infrastructure/form.schema";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { standardWorkflowCode } from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import {
  stageTaskDefinitions,
  stageTaskFormBindings,
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
  eligibilityInputDefinitions,
  eligibilityRules,
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
  eligibilityScreeningSourceBindings,
  eligibilitySeedReviews,
  eligibilitySelfCheckQuestions,
} from "./eligibility-ruleset.schema";

type SeedInput = {
  approvedAt: Date;
  approvedBy: string;
  fundingCallReferences: readonly string[];
};

type VerificationConfiguration = {
  fields: Array<{
    fieldId: string;
    sourceKey: string;
  }>;
  formVersionId: string;
  workflowVersionId: string;
};

async function findVerificationConfiguration(
  transaction: DatabaseTransaction,
): Promise<VerificationConfiguration> {
  const [version] = await transaction
    .select({
      formVersionId: formVersions.id,
    })
    .from(formDefinitions)
    .innerJoin(
      formVersions,
      eq(formVersions.formDefinitionId, formDefinitions.id),
    )
    .where(and(
      eq(formDefinitions.code, "ELIGIBILITY_VERIFICATION"),
      eq(formVersions.status, "PUBLISHED"),
    ))
    .orderBy(desc(formVersions.versionNumber))
    .limit(1);
  if (!version) {
    throw new Error(
      "Run the standard form seed before the standard eligibility seed.",
    );
  }
  const fields = await transaction
    .select({ fieldId: formFields.id, sourceKey: formFields.key })
    .from(formFields)
    .where(eq(formFields.formVersionId, version.formVersionId));
  const fieldKeys = new Set(fields.map((field) => field.sourceKey));
  const missing = standardEligibilityCriteria
    .map((criterion) => criterion.stableKey.toUpperCase())
    .filter((key) => !fieldKeys.has(key));
  if (missing.length) {
    throw new Error(
      `Eligibility verification fields are missing: ${missing.join(", ")}.`,
    );
  }
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
    .innerJoin(
      stageTaskFormBindings,
      eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
    )
    .where(and(
      eq(workflowDefinitions.code, standardWorkflowCode),
      eq(stageTaskDefinitions.stableKey, "ELIGIBILITY_VERIFICATION"),
      eq(stageTaskFormBindings.formVersionId, version.formVersionId),
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
  return {
    fields,
    formVersionId: version.formVersionId,
    workflowVersionId: workflow.workflowVersionId,
  };
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
        key: `eligibility.${stableKey}`,
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
  const [row] = await transaction
    .select({
      definitionId: eligibilityRuleSets.id,
      versionId: eligibilityRuleSetVersions.id,
    })
    .from(eligibilityRuleSets)
    .innerJoin(
      eligibilityRuleSetVersions,
      eq(eligibilityRuleSetVersions.ruleSetId, eligibilityRuleSets.id),
    )
    .where(and(
      eq(eligibilityRuleSets.code, standardEligibilityRuleSetCode),
      eq(eligibilityRuleSetVersions.status, "DRAFT"),
    ))
    .limit(1);
  return row ?? null;
}

export async function insertStandardEligibilityBaseline(input: SeedInput) {
  return getDatabase().transaction(async (transaction) => {
    await ensureSystemSeedPrincipal(transaction);
    const verification = await findVerificationConfiguration(transaction);
    const existing = await existingBaseline(transaction);
    if (existing) {
      const boundFundingCallReferences = await bindFundingCalls(
        transaction,
        existing.versionId,
        verification.workflowVersionId,
        input.fundingCallReferences,
      );
      return {
        boundFundingCallReferences,
        created: false,
        definitionId: existing.definitionId,
        issueMessages: [],
        versionId: existing.versionId,
      };
    }

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

    const groups = standardEligibilityCriteria.map((criterion) =>
      conditionFor(criterion.stableKey, criterion.operator, criterion.constant)
    );
    await transaction.insert(conditionGroups).values(groups.map((group) => ({
      definition: group,
      id: group.id,
    })));
    await transaction
      .insert(eligibilityRules)
      .values(standardEligibilityCriteria.map((criterion, index) => ({
        applicantMessage: criterion.applicantMessage,
        conditionGroupId: groups[index]!.id,
        conditionId: null,
        conditionKind: "GROUP" as const,
        executionMode: "BOTH" as const,
        failureType: criterion.failureType,
        order: index + 1,
        reasonCode: criterion.reasonCode,
        versionId: version!.id,
      })))
      .returning({ id: eligibilityRules.id });
    const createdInputs = await transaction
      .insert(eligibilityInputDefinitions)
      .values(standardEligibilityCriteria.map((criterion, index) => ({
        availableIn: ["SELF_CHECK", "SCREENING"] as Array<
          "SELF_CHECK" | "SCREENING"
        >,
        createdBy: systemSeedUserId,
        groupKey: "baseline",
        groupLabel: "Eligibility",
        label: criterion.label,
        order: index + 1,
        stableKey: criterion.stableKey,
        type: criterion.inputType,
        updatedBy: systemSeedUserId,
        versionId: version!.id,
      })))
      .returning({
        id: eligibilityInputDefinitions.id,
        stableKey: eligibilityInputDefinitions.stableKey,
      });
    const inputIds = new Map(
      createdInputs.map((item) => [item.stableKey, item.id]),
    );
    const questions = standardEligibilityCriteria.flatMap((criterion) =>
      criterion.questionType
        ? [{
            answerType: criterion.questionType,
            explanation:
              "Your answer is advisory and will be verified during Screening.",
            helpText: "Answer using the information currently available to you.",
            inputDefinitionId: inputIds.get(criterion.stableKey)!,
            options: [],
            prompt: criterion.prompt,
            required: true,
          }]
        : []
    );
    await transaction.insert(eligibilitySelfCheckQuestions).values(questions);
    const fieldsByKey = new Map(
      verification.fields.map((field) => [field.sourceKey, field]),
    );
    await transaction.insert(eligibilityScreeningSourceBindings).values(
      standardEligibilityCriteria.map((criterion) => {
        const field = fieldsByKey.get(criterion.stableKey.toUpperCase())!;
        return {
          inputDefinitionId: inputIds.get(criterion.stableKey)!,
          sourceDefinitionId: field.fieldId,
          sourceKey: field.sourceKey,
          sourceKind: "WORKFLOW_FORM_FIELD" as const,
          sourceVersionId: verification.formVersionId,
          valuePath: "value",
        };
      }),
    );
    await transaction.insert(eligibilitySeedReviews).values({
      approvalBasis:
        "User directed on 22 September 2026 that Proposed decisions be treated as approved.",
      approvedAt: input.approvedAt,
      approvedBy: input.approvedBy,
      decisionSnapshot: standardEligibilityCriteria.map((criterion) => ({
        failureType: criterion.failureType,
        reasonCode: criterion.reasonCode,
        stableKey: criterion.stableKey,
      })),
      sourceDocument: standardEligibilitySourceDocument,
      versionId: version!.id,
    });
    const boundFundingCallReferences = await bindFundingCalls(
      transaction,
      version!.id,
      verification.workflowVersionId,
      input.fundingCallReferences,
    );
    return {
      boundFundingCallReferences,
      created: true,
      definitionId: definition!.id,
      issueMessages: [],
      versionId: version!.id,
    };
  });
}
