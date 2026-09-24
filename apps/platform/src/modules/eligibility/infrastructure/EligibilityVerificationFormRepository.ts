import "server-only";

import { eq, sql } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import {
  formDefinitions,
  formFieldOptions,
  formFields,
  formSections,
  formVersions,
} from "@/modules/forms/infrastructure/form.schema";
import type { FormFieldType } from "@/modules/forms/FormTypes";
import type { EligibilityQuestionInputType } from "../domain/EligibilityQuestion";
import { eligibilityRuleSetVerificationForms } from "./eligibility-question.schema";

type ReferencedQuestion = {
  code: string;
  inputType: EligibilityQuestionInputType;
  order: number;
  reviewerLabel: string;
};

function formFieldType(inputType: EligibilityQuestionInputType): FormFieldType {
  if (inputType === "BOOLEAN") return "YES_NO";
  if (inputType === "YES_NO_NA") return "SINGLE_SELECT";
  return inputType;
}

async function referencedScreeningQuestions(
  transaction: DatabaseTransaction,
  versionId: string,
) {
  const result = await transaction.execute<ReferencedQuestion>(sql`
    SELECT DISTINCT binding.code_snapshot AS code,
      binding.input_type_snapshot AS "inputType",
      binding.display_order AS "order",
      binding.reviewer_label_snapshot AS "reviewerLabel"
    FROM app_eligibility_rule_set_question_bindings binding
    JOIN app_eligibility_rules rule
      ON rule.version_id = binding.version_id
      AND rule.execution_mode IN ('SCREENING', 'BOTH')
    JOIN app_condition_groups condition_group
      ON condition_group.id = rule.condition_group_id
    CROSS JOIN LATERAL jsonb_path_query(
      condition_group.definition,
      '$.** ? (@.kind == "FIELD").key'
    ) path(value)
    WHERE binding.version_id = ${versionId}::uuid
      AND trim(both '"' from path.value::text)
        = 'eligibility.' || binding.code_snapshot
    ORDER BY binding.display_order
  `);
  return result.rows;
}

export async function createEligibilityVerificationForm(
  transaction: DatabaseTransaction,
  input: {
    actorId: string;
    ruleSetCode: string;
    ruleSetName: string;
    versionId: string;
    versionNumber: number;
  },
) {
  const questions = await referencedScreeningQuestions(
    transaction,
    input.versionId,
  );
  const definitionId = crypto.randomUUID();
  const formVersionId = crypto.randomUUID();
  const sectionId = crypto.randomUUID();
  const publishedAt = new Date();
  await transaction.insert(formDefinitions).values({
    code: `ELIGIBILITY_VERIFICATION_${input.versionId.replaceAll("-", "_").toUpperCase()}`,
    createdBy: input.actorId,
    description:
      `Generated from ${input.ruleSetCode} v${input.versionNumber}.`,
    id: definitionId,
    name: `${input.ruleSetName} v${input.versionNumber} verification`,
  });
  await transaction.insert(formVersions).values({
    createdBy: input.actorId,
    displayMode: "SINGLE_PAGE",
    formDefinitionId: definitionId,
    id: formVersionId,
    instructions: "Record the verified answers used for eligibility screening.",
    submitLabel: "Complete eligibility verification",
    versionNumber: 1,
  });
  await transaction.insert(formSections).values({
    columnSpan: 2,
    description: "",
    formVersionId,
    id: sectionId,
    key: "VERIFIED_ELIGIBILITY",
    order: 1,
    showContainer: true,
    title: "Verified eligibility evidence",
  });
  const fields = questions.map((question, index) => ({
    fieldId: crypto.randomUUID(),
    question,
    order: index + 1,
  }));
  if (fields.length) {
    await transaction.insert(formFields).values(fields.map((field) => ({
      columnSpan: 1 as const,
      formVersionId,
      id: field.fieldId,
      key: field.question.code,
      label: field.question.reviewerLabel,
      maximum: field.question.inputType === "PERCENTAGE" ? 100 : null,
      minimum: field.question.inputType === "PERCENTAGE" ? 0 : null,
      order: field.order,
      required: true,
      sectionId,
      type: formFieldType(field.question.inputType),
    })));
    const yesNoNaFields = fields.filter(
      (field) => field.question.inputType === "YES_NO_NA",
    );
    if (yesNoNaFields.length) {
      await transaction.insert(formFieldOptions).values(
        yesNoNaFields.flatMap((field) => [
          { fieldId: field.fieldId, key: "YES", label: "Yes", order: 1 },
          { fieldId: field.fieldId, key: "NO", label: "No", order: 2 },
          {
            fieldId: field.fieldId,
            key: "NOT_APPLICABLE",
            label: "Not applicable",
            order: 3,
          },
        ]),
      );
    }
  }
  await transaction
    .update(formVersions)
    .set({
      publishedAt,
      publishedBy: input.actorId,
      rowVersion: 2,
      status: "PUBLISHED",
      updatedAt: publishedAt,
    })
    .where(eq(formVersions.id, formVersionId));
  await transaction.insert(eligibilityRuleSetVerificationForms).values({
    formVersionId,
    versionId: input.versionId,
  });
  return formVersionId;
}
