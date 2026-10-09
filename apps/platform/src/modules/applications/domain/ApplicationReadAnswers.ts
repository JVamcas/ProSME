import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { formRichTextAsPlainText } from "@/modules/forms/engine/FormRichText";

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

function displayScalar(
  field: Pick<FormField, "key" | "options" | "type">,
  value: unknown,
) {
  const optionLabel = (item: unknown) => {
    const option = field.options?.find((entry) => entry.key === item);
    return option?.label ?? String(item);
  };

  if (Array.isArray(value)) return value.map(optionLabel).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (field.key === "BUSINESS_ESTABLISHED_YEAR") return String(value);
    if (field.type === "CURRENCY") {
      return `N$ ${new Intl.NumberFormat("en-NA").format(value)}`;
    }
    if (field.type === "PERCENTAGE") return `${value}%`;
    return new Intl.NumberFormat("en-NA").format(value);
  }
  if (typeof value === "string") {
    return field.type === "RICH_TEXT"
      ? formRichTextAsPlainText(value)
      : optionLabel(value);
  }
  return JSON.stringify(value) ?? String(value);
}

function displayRepeatableAnswer(field: FormField, value: unknown[]) {
  const itemFields = [...(field.repeatable?.fields ?? [])].sort(
    (left, right) => left.order - right.order,
  );
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return `${index + 1}. ${String(item)}`;
      }
      const row = item as Record<string, unknown>;
      const values = itemFields.flatMap((itemField) =>
        hasAnswer(row[itemField.key])
          ? [
              `${itemField.label}: ${displayScalar(itemField, row[itemField.key])}`,
            ]
          : [],
      );
      return `${index + 1}. ${values.join("; ")}`;
    })
    .join("\n");
}

function displayAnswer(field: FormField, value: unknown): string {
  if (field.type === "REPEATABLE_GROUP" && Array.isArray(value)) {
    return displayRepeatableAnswer(field, value);
  }
  return displayScalar(field, value);
}

function hasAnswer(value: unknown) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );
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
