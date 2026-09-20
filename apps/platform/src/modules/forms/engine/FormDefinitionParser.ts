import type { RJSFSchema, UiSchema } from "@rjsf/utils";

import type {
  FormField,
  FormRuntimeSchema,
  FormSection,
} from "@/modules/forms/FormTypes";
import { activeFormDefinition } from "./FormVisibility";

export type RenderSection = FormSection & {
  id: string;
  fields: Pick<FormField, "columnSpan" | "key">[];
};

export type ParsedFormDefinition = {
  instructions: string | null;
  schema: RJSFSchema;
  sections: RenderSection[];
  submitLabel: string;
  uiSchema: UiSchema;
};

export class InvalidFormDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFormDefinitionError";
  }
}

function invalid(message: string): never {
  throw new InvalidFormDefinitionError(message);
}

function assertUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) {
    invalid(`${label} must be unique.`);
  }
}

function ordered<T extends { order: number }>(items: readonly T[], label: string) {
  const result = [...items].sort((left, right) => left.order - right.order);
  if (result.some((item, index) => item.order !== index + 1)) {
    invalid(`${label} order must be contiguous and start at one.`);
  }
  return result;
}

function optionSchema(field: FormField) {
  const options = ordered(field.options ?? [], `Options for ${field.key}`);
  if (options.length === 0) invalid(`Select field ${field.key} has no options.`);
  assertUnique(options.map((option) => option.key), `Options for ${field.key}`);
  return {
    keys: options.map((option) => option.key),
    labels: options.map((option) => option.label),
  };
}

function fieldSchema(
  field: FormField,
  requireCompletedFields: boolean,
): RJSFSchema {
  const common = {
    description: field.helpText ?? undefined,
    title: field.label,
  };
  if (["NUMBER", "CURRENCY", "PERCENTAGE"].includes(field.type)) {
    const percentage = field.type === "PERCENTAGE";
    return {
      ...common,
      maximum: percentage ? field.maximum ?? 100 : field.maximum ?? undefined,
      minimum: percentage ? field.minimum ?? 0 : field.minimum ?? undefined,
      type: "number",
    };
  }
  if (field.type === "DATE") {
    return { ...common, format: "date", type: "string" };
  }
  if (field.type === "YES_NO") {
    return {
      ...common,
      enum: [true, false],
      type: "boolean",
    };
  }
  if (field.type === "SINGLE_SELECT") {
    const options = optionSchema(field);
    return {
      ...common,
      enum: options.keys,
      type: "string",
    };
  }
  if (field.type === "MULTI_SELECT") {
    const options = optionSchema(field);
    return {
      ...common,
      items: {
        enum: options.keys,
        type: "string",
      },
      minItems: requireCompletedFields && field.required ? 1 : undefined,
      type: "array",
      uniqueItems: true,
    };
  }
  if (field.type === "DOCUMENT") {
    return { ...common, format: "data-url", type: "string" };
  }
  if ((field.options ?? []).length > 0) {
    invalid(`Field ${field.key} does not support options.`);
  }
  return {
    ...common,
    maxLength: field.maxLength ?? undefined,
    minLength: field.minLength ?? undefined,
    type: "string",
  };
}

export function buildFormValueSchema(
  fields: readonly FormField[],
  requireCompletedFields = true,
): RJSFSchema {
  return {
    additionalProperties: false,
    properties: Object.fromEntries(
      fields.map((field) => [
        field.key,
        fieldSchema(field, requireCompletedFields),
      ]),
    ),
    required: requireCompletedFields
      ? fields.filter((field) => field.required).map((field) => field.key)
      : [],
    type: "object",
  };
}

function fieldUiSchema(field: FormField): UiSchema {
  if (field.type === "TEXTAREA") return { "ui:widget": "textarea" };
  if (field.type === "YES_NO") {
    return {
      "ui:enumNames": ["Yes", "No"],
      "ui:widget": "radio",
    };
  }
  if (field.type === "SINGLE_SELECT" || field.type === "MULTI_SELECT") {
    const options = optionSchema(field);
    return {
      "ui:enumNames": options.labels,
      "ui:widget": "select",
    };
  }
  if (field.type === "CURRENCY") return { "ui:widget": "currency" };
  if (field.type === "PERCENTAGE") return { "ui:widget": "percentage" };
  if (field.type === "DOCUMENT") return { "ui:widget": "file" };
  return {};
}

function parseSections(
  definition: FormRuntimeSchema,
  fields: readonly FormField[],
): RenderSection[] {
  const sections = ordered(definition.sections, "Sections");
  assertUnique(sections.map((section) => section.key), "Section keys");
  return sections.map((section) => {
    if (!section.id) invalid(`Saved section ${section.key} has no identifier.`);
    const sectionFields = ordered(
      fields.filter((field) => field.sectionId === section.id),
      `Fields in ${section.key}`,
    );
    if (sectionFields.some((field) => field.columnSpan > section.columnSpan)) {
      invalid(`A field is wider than section ${section.key}.`);
    }
    return {
      ...section,
      id: section.id,
      fields: sectionFields.map((field) => ({
        columnSpan: field.columnSpan,
        key: field.key,
      })),
    };
  });
}

export function parseFormDefinition(
  definition: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>> = {},
): ParsedFormDefinition {
  if (!definition.versionId || definition.versionNumber < 1) {
    invalid("The saved form version is invalid.");
  }
  if (!definition.submitLabel.trim()) invalid("The submit label is required.");
  if (definition.sections.length === 0 || definition.fields.length === 0) {
    invalid("The saved form must contain sections and fields.");
  }
  assertUnique(definition.fields.map((field) => field.key), "Field keys");

  const activeDefinition = activeFormDefinition(definition, values);
  const fields = [...activeDefinition.fields];
  const sections = parseSections(activeDefinition, fields);
  assertUnique(sections.map((section) => section.id), "Section identifiers");
  const sectionIds = new Set(sections.map((section) => section.id));
  const orphan = fields.find((field) => !sectionIds.has(field.sectionId));
  if (orphan) invalid(`Field ${orphan.key} has no section.`);

  const uiSchema = Object.fromEntries(
    fields.map((field) => [field.key, fieldUiSchema(field)]),
  ) as UiSchema;
  uiSchema["ui:order"] = sections.flatMap((section) => (
    section.fields.map((field) => field.key)
  ));

  return {
    instructions: definition.instructions,
    schema: buildFormValueSchema(fields),
    sections,
    submitLabel: definition.submitLabel,
    uiSchema,
  };
}
