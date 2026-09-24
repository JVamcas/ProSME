import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { EligibilityFieldDescriptor } from "../domain/EligibilityFieldRegistry";
import { eligibilityFieldsForExecutionMode } from "../domain/EligibilityFieldRegistry";
import type { EligibilityScreeningSourceKind } from "../domain/EligibilityInputDefinition";
import type { EligibilityExecutionMode } from "../domain/EligibilityRule";

const sourceKindLabels: Record<EligibilityScreeningSourceKind, string> = {
  APPLICATION_FORM_FIELD: "Application",
  DOCUMENT_REQUIREMENT_FACT: "Document Requirement",
  ELIGIBILITY_QUESTION_RESPONSE: "Screening Answer",
  FUNDING_CALL_FIELD: "Funding Call",
  INTEGRATION_OUTPUT: "Integration Output",
  MANUAL_ASSESSMENT: "Manual Assessment",
  SCREENING_CHECKLIST_ITEM: "Screening Checklist",
  WORKFLOW_FORM_FIELD: "Workflow Form",
};

export type EligibilityBuilderFieldPresentation = {
  builderField: ConditionFieldDefinition;
  key: string;
  label: string;
  sourceLabel: string;
  type: EligibilityFieldDescriptor["type"];
};

function screeningSourceLabel(field: EligibilityFieldDescriptor) {
  if (!field.screeningSource) return null;
  return sourceKindLabels[field.screeningSource.sourceKind];
}

function fieldSourceLabel(field: EligibilityFieldDescriptor) {
  if (field.sourceKind === "FUNDING_CALL_FIELD") {
    return sourceKindLabels.FUNDING_CALL_FIELD;
  }
  if (field.sourceKind === "APPLICATION_FORM_FIELD") {
    return sourceKindLabels.APPLICATION_FORM_FIELD;
  }
  const labels: string[] = [];
  if (field.availableIn.includes("SELF_CHECK")) {
    labels.push("Applicant");
  }
  if (field.availableIn.includes("SCREENING")) {
    labels.push(screeningSourceLabel(field) ?? "Screening Answer");
  }
  return labels.join(" / ");
}

export function eligibilityBuilderFieldPresentations(
  fields: readonly EligibilityFieldDescriptor[],
  mode: EligibilityExecutionMode,
): EligibilityBuilderFieldPresentation[] {
  return eligibilityFieldsForExecutionMode(fields, mode).map((field) => {
    const sourceLabel = fieldSourceLabel(field);
    return {
      builderField: {
        key: field.key,
        label: `${field.label} [${sourceLabel}]`,
        type: field.type,
      },
      key: field.key,
      label: field.label,
      sourceLabel,
      type: field.type,
    };
  });
}
