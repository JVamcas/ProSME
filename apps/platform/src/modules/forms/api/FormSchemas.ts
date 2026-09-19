import { z } from "zod";

import {
  formDataTypes,
  formInputTypes,
  formStatuses,
} from "@/modules/forms/FormTypes";

const code = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);
function optionalNumber(schema: z.ZodType<number>) {
  return z.preprocess(
    (value) => value === "" || value === null ? undefined : value,
    schema.optional(),
  ) as z.ZodType<number | undefined>;
}

const validation = z
  .object({
    max: optionalNumber(z.coerce.number().finite()),
    maxLength: optionalNumber(z.coerce.number().int().nonnegative()),
    min: optionalNumber(z.coerce.number().finite()),
    minLength: optionalNumber(z.coerce.number().int().nonnegative()),
  })
  .partial()
  .strict()
  .nullable()
  .optional();

export const formOptionSchema = z.object({
  code,
  label: z.string().trim().min(1).max(200),
  position: z.coerce.number().int().positive(),
});

const formFieldSchemaBase = z.object({
  id: z.string().uuid().optional(),
  code,
  label: z.string().trim().min(1).max(160),
  inputType: z.enum(formInputTypes),
  dataType: z.enum(formDataTypes),
  rowIndex: z.coerce.number().int().positive(),
  columnIndex: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
  columnSpan: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
  required: z.boolean(),
  placeholder: z.string().trim().max(160).nullable().optional(),
  helpText: z.string().trim().max(500).nullable().optional(),
  validation: validation.nullable().optional(),
  options: z.array(formOptionSchema).max(100).optional(),
});

function fieldValidationIssues(field: z.infer<typeof formFieldSchemaBase>) {
  const issues: { message: string; path: string[] }[] = [];
  const supportsLength = ["TEXT", "TEXTAREA"].includes(field.inputType);
  const supportsRange = ["NUMBER", "MONEY"].includes(field.inputType);
  const rules = field.validation;
  if (
    rules
    && (rules.minLength !== undefined || rules.maxLength !== undefined)
    && !supportsLength
  ) {
    issues.push({
      message: "Length validation is only valid for text fields.",
      path: ["validation"],
    });
  }
  if (
    rules
    && (rules.min !== undefined || rules.max !== undefined)
    && !supportsRange
  ) {
    issues.push({
      message: "Range validation is only valid for numeric fields.",
      path: ["validation"],
    });
  }
  if (
    rules?.min !== undefined
    && rules.max !== undefined
    && rules.min > rules.max
  ) {
    issues.push({
      message: "Minimum cannot exceed maximum.",
      path: ["validation"],
    });
  }
  if (
    rules?.minLength !== undefined
    && rules.maxLength !== undefined
    && rules.minLength > rules.maxLength
  ) {
    issues.push({
      message: "Minimum length cannot exceed maximum length.",
      path: ["validation"],
    });
  }
  return issues;
}

export const formFieldSchema = formFieldSchemaBase.superRefine((field, context) => {
  const supportsOptions = field.inputType === "SELECT" || field.inputType === "RADIO";
  const options = field.options ?? [];
  const validCombination = {
    TEXT: ["TEXT"],
    TEXTAREA: ["TEXT"],
    NUMBER: ["INTEGER", "DECIMAL"],
    MONEY: ["MONEY"],
    DATE: ["DATE"],
    SELECT: ["TEXT"],
    RADIO: ["TEXT"],
    CHECKBOX: ["BOOLEAN"],
  }[field.inputType].includes(field.dataType);
  if (!validCombination) {
    context.addIssue({ code: "custom", message: "Input and data types are incompatible.", path: ["dataType"] });
  }
  if (field.columnSpan === 2 && field.columnIndex !== 1) {
    context.addIssue({ code: "custom", message: "A two-column field must start in column 1.", path: ["columnSpan"] });
  }
  if (!supportsOptions && options.length) {
    context.addIssue({ code: "custom", message: "Only select and radio fields may have options.", path: ["options"] });
  }
  if (supportsOptions && !options.length) {
    context.addIssue({ code: "custom", message: "Add at least one option.", path: ["options"] });
  }
  for (const validationIssue of fieldValidationIssues(field)) {
    context.addIssue({
      code: "custom",
      message: validationIssue.message,
      path: validationIssue.path,
    });
  }
  const codes = options.map((option) => option.code);
  if (new Set(codes).size !== codes.length) {
    context.addIssue({ code: "custom", message: "Option codes must be unique.", path: ["options"] });
  }
});

export const formDefinitionSchema = z.object({
  code,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000),
});

export const formVersionSchema = z.object({
  instructions: z.string().trim().max(4000).nullable().optional(),
  submitLabel: z.string().trim().min(1).max(80),
});

export const formSectionSchema = z.object({
  id: z.string().uuid().optional(),
  key: code,
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000),
  order: z.coerce.number().int().positive(),
});

export const formDefinitionDialogSchema = formDefinitionSchema.extend({
  ...formVersionSchema.shape,
});

export const formEditorSchema = formDefinitionSchema
  .partial()
  .extend({
    ...formVersionSchema.shape,
    expectedRowVersion: z.number().int().positive(),
    fields: z.array(formFieldSchema).max(100),
    sections: z.array(formSectionSchema).max(50),
  })
  .superRefine((value, context) => {
    const keys = value.sections.map((section) => section.key);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Section keys must be unique within a form version.",
        path: ["sections"],
      });
    }
    const orders = value.sections.map((section) => section.order).sort((a, b) => a - b);
    if (orders.some((order, index) => order !== index + 1)) {
      context.addIssue({
        code: "custom",
        message: "Section order must be contiguous and start at one.",
        path: ["sections"],
      });
    }
  });

export const formCommandSchema = z.object({
  versionId: z.string().uuid(),
  expectedRowVersion: z.number().int().positive(),
});

export const formStatusSchema = z.enum(formStatuses);
export const taskFormSubmissionSchema = z.object({
  expectedTaskRowVersion: z.number().int().positive(),
  expectedSubmissionRowVersion: z.number().int().positive().optional(),
  values: z.record(z.string(), z.unknown()),
});

export const taskFormCompletionSchema = taskFormSubmissionSchema;

export type FormEditorInput = z.infer<typeof formEditorSchema>;
