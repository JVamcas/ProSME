import type {
  FormField,
  FormFieldType,
  FormOption,
  FormSection,
} from "../FormTypes";

export type FundingApplicationFieldSeed = {
  columnSpan?: 1 | 2;
  helpText?: string;
  key: string;
  label: string;
  maximum?: number;
  minimum?: number;
  options?: Array<{ key: string; label: string }>;
  required?: boolean;
  type: FormFieldType;
};

export type FundingApplicationSectionSeed = {
  description: string;
  fields: FundingApplicationFieldSeed[];
  key: string;
  title: string;
};

function options(
  items: FundingApplicationFieldSeed["options"],
): FormOption[] | undefined {
  return items?.map((item, index) => ({ ...item, order: index + 1 }));
}

export function buildFundingApplicationDefinition(
  sectionSeeds: FundingApplicationSectionSeed[],
) {
  const sections = sectionSeeds.map((section, index): FormSection => ({
    columnSpan: 2,
    description: section.description,
    id: crypto.randomUUID(),
    key: section.key,
    order: index + 1,
    showContainer: true,
    title: section.title,
  }));
  const fields = sectionSeeds.flatMap((section, sectionIndex) =>
    section.fields.map((field, fieldIndex): FormField => ({
      columnSpan: field.columnSpan ?? 1,
      helpText: field.helpText,
      key: field.key,
      label: field.label,
      maximum: field.maximum,
      minimum: field.minimum,
      options: options(field.options),
      order: fieldIndex + 1,
      required: field.required ?? false,
      sectionId: sections[sectionIndex].id!,
      type: field.type,
    })),
  );
  return { fields, sections };
}
