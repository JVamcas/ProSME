import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type {
  FormField,
  FormFieldType,
  FormOption,
  FormSection,
} from "@/modules/forms/FormTypes";
import { standardFormPurpose } from "./FormPurpose";
import type { StandardFormSeed } from "./StandardFormDefinition";

type FieldInput = {
  columnSpan?: 1 | 2 | 3;
  helpText?: string;
  key: string;
  label: string;
  maximum?: number;
  minimum?: number;
  options?: readonly string[];
  required?: boolean;
  type: FormFieldType;
  visibilityCondition?: ConditionGroup;
};

type SectionInput = {
  description?: string;
  fields: FieldInput[];
  key: string;
  title: string;
};

function formOptions(labels: readonly string[]): FormOption[] {
  return labels.map((label, index) => ({
    key: label.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_"),
    label,
    order: index + 1,
  }));
}

export function defineStandardForm(input: {
  code: string;
  description: string;
  instructions: string;
  name: string;
  sections: SectionInput[];
  submitLabel?: string;
}): StandardFormSeed {
  const sections = input.sections.map((section, index): FormSection => ({
    columnSpan: 2,
    description: section.description ?? "",
    id: crypto.randomUUID(),
    key: section.key,
    order: index + 1,
    showContainer: true,
    title: section.title,
  }));
  const fields = input.sections.flatMap((section, sectionIndex) =>
    section.fields.map((field, fieldIndex): FormField => ({
      columnSpan: field.columnSpan ?? 1,
      helpText: field.helpText,
      key: field.key,
      label: field.label,
      maximum: field.maximum,
      minimum: field.minimum,
      options: field.options ? formOptions(field.options) : undefined,
      order: fieldIndex + 1,
      required: field.required ?? false,
      sectionId: sections[sectionIndex]!.id!,
      type: field.type,
      visibilityCondition: field.visibilityCondition,
    })),
  );
  return {
    code: input.code,
    description: input.description,
    displayMode: "SINGLE_PAGE",
    fields,
    instructions: input.instructions,
    name: input.name,
    purpose: standardFormPurpose(input.code),
    sections,
    submitLabel: input.submitLabel ?? "Complete task",
  };
}
