import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type {
  EligibilityFieldDescriptor,
  EligibilitySourceDescriptor,
} from "../domain/EligibilityFieldRegistry";
import { eligibilityFieldsForExecutionMode } from "../domain/EligibilityFieldRegistry";
import type {
  EligibilityInputMode,
  EligibilityScreeningSourceKind,
  EligibilitySourceBinding,
} from "../domain/EligibilityInputDefinition";
import type { EligibilityExecutionMode } from "../domain/EligibilityRule";

const sourceKindLabels: Record<EligibilityScreeningSourceKind, string> = {
  APPLICATION_FORM_FIELD: "Application form",
  DOCUMENT_REQUIREMENT_FACT: "Document requirement",
  FUNDING_CALL_FIELD: "Funding call",
  INTEGRATION_OUTPUT: "Integration output",
  MANUAL_ASSESSMENT: "Manual assessment",
  SCREENING_CHECKLIST_ITEM: "Screening checklist",
  WORKFLOW_FORM_FIELD: "Workflow form",
};

const modeLabels: Record<EligibilityInputMode, string> = {
  SCREENING: "Screening",
  SELF_CHECK: "Self Check",
};

export type EligibilityBuilderFieldPresentation = {
  builderField: ConditionFieldDefinition;
  key: string;
  label: string;
  modeLabel: string;
  sourceLabel: string;
  type: EligibilityFieldDescriptor["type"];
};

function matchesBinding(
  source: EligibilitySourceDescriptor,
  binding: EligibilitySourceBinding,
) {
  return source.sourceDefinitionId === binding.sourceDefinitionId
    && source.sourceKey === binding.sourceKey
    && source.sourceKind === binding.sourceKind
    && source.sourceVersionId === binding.sourceVersionId;
}

function screeningSourceLabel(
  field: EligibilityFieldDescriptor,
  sources: readonly EligibilitySourceDescriptor[],
) {
  if (!field.screeningSource) return null;
  return sources.find((source) => matchesBinding(source, field.screeningSource!))
    ?.label ?? sourceKindLabels[field.screeningSource.sourceKind];
}

function fieldSourceLabel(
  field: EligibilityFieldDescriptor,
  sources: readonly EligibilitySourceDescriptor[],
) {
  const labels: string[] = [];
  if (field.availableIn.includes("SELF_CHECK")) {
    labels.push("Applicant answer");
  }
  if (field.availableIn.includes("SCREENING")) {
    labels.push(screeningSourceLabel(field, sources) ?? "Screening source");
  }
  return labels.join(" / ");
}

export function eligibilityBuilderFieldPresentations(
  fields: readonly EligibilityFieldDescriptor[],
  sources: readonly EligibilitySourceDescriptor[],
  mode: EligibilityExecutionMode,
): EligibilityBuilderFieldPresentation[] {
  return eligibilityFieldsForExecutionMode(fields, mode).map((field) => {
    const modeLabel = field.availableIn.map((item) => modeLabels[item]).join(" + ");
    const sourceLabel = fieldSourceLabel(field, sources);
    return {
      builderField: {
        key: field.key,
        label: `${field.label} — ${modeLabel} · ${sourceLabel}`,
        type: field.type,
      },
      key: field.key,
      label: field.label,
      modeLabel,
      sourceLabel,
      type: field.type,
    };
  });
}
