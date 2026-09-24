import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

export type ApplicationReadAnswer = {
  key: string;
  label: string;
  value: string;
};

export type ApplicationReadSection = {
  key: string;
  title: string;
  answers: ApplicationReadAnswer[];
};

function displayAnswer(field: FormField, value: unknown): string {
  const optionLabel = (item: unknown) => {
    const option = field.options?.find((entry) => entry.key === item);
    return option?.label ?? String(item);
  };

  if (Array.isArray(value)) return value.map(optionLabel).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (field.type === "CURRENCY") {
      return `N$ ${new Intl.NumberFormat("en-NA").format(value)}`;
    }
    if (field.type === "PERCENTAGE") return `${value}%`;
    return new Intl.NumberFormat("en-NA").format(value);
  }
  if (typeof value === "string") return optionLabel(value);
  return JSON.stringify(value) ?? String(value);
}

function hasAnswer(value: unknown) {
  return value !== null
    && value !== undefined
    && value !== ""
    && (!Array.isArray(value) || value.length > 0);
}

export function applicationReadSections(
  form: FormRuntimeSchema,
  values: Record<string, unknown>,
): ApplicationReadSection[] {
  const fieldsBySection = new Map<string, FormField[]>();
  for (const field of form.fields) {
    if (field.type === "DOCUMENT") continue;
    const current = fieldsBySection.get(field.sectionId) ?? [];
    current.push(field);
    fieldsBySection.set(field.sectionId, current);
  }

  return [...form.sections]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      key: section.key,
      title: section.title,
      answers: (fieldsBySection.get(section.id ?? "") ?? [])
        .filter((field) => hasAnswer(values[field.key]))
        .sort((left, right) => left.order - right.order)
        .map((field) => ({
          key: field.key,
          label: field.label,
          value: displayAnswer(field, values[field.key]),
        })),
    }))
    .filter((section) => section.answers.length > 0);
}
