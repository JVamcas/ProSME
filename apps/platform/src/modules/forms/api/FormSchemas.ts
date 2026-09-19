import { z } from "zod";

import {
  formFieldTypes,
  formStatuses,
} from "@/modules/forms/FormTypes";

const code = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);
export const formOptionSchema = z.object({
  key: code,
  label: z.string().trim().min(1).max(200),
  order: z.coerce.number().int().positive(),
});

const optionalNumber = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().finite().optional(),
);

const optionalLength = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().int().nonnegative().optional(),
);

const formFieldSchemaBase = z.object({
  id: z.string().uuid().optional(),
  sectionId: z.string().uuid(),
  columnSpan: z.coerce.number().pipe(
    z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ),
  key: code,
  label: z.string().trim().min(1).max(160),
  type: z.enum(formFieldTypes),
  required: z.boolean(),
  helpText: z.string().trim().max(500).nullable().optional(),
  minimum: optionalNumber,
  maximum: optionalNumber,
  minLength: optionalLength,
  maxLength: optionalLength,
  order: z.coerce.number().int().positive(),
  options: z.array(formOptionSchema).max(100).optional(),
});

export const formFieldSchema = formFieldSchemaBase.superRefine((field, context) => {
  const supportsOptions = field.type === "SELECT";
  const options = field.options ?? [];
  if (!supportsOptions && options.length) {
    context.addIssue({ code: "custom", message: "Only Select fields may have options.", path: ["options"] });
  }
  if (supportsOptions && !options.length) {
    context.addIssue({ code: "custom", message: "Add at least one option.", path: ["options"] });
  }
  const keys = options.map((option) => option.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: "custom",
      message: "Option keys must be unique.",
      path: ["options"],
    });
  }
  if (options.some((option, index) => option.order !== index + 1)) {
    context.addIssue({
      code: "custom",
      message: "Option order must be contiguous and start at one.",
      path: ["options"],
    });
  }
  if (field.type !== "NUMBER" && (
    field.minimum !== undefined || field.maximum !== undefined
  )) {
    context.addIssue({
      code: "custom",
      message: "Only Number fields may have minimum or maximum values.",
      path: ["minimum"],
    });
  }
  if (field.type !== "TEXT" && field.type !== "TEXTAREA" && (
    field.minLength !== undefined || field.maxLength !== undefined
  )) {
    context.addIssue({
      code: "custom",
      message: "Only Text and Textarea fields may have length limits.",
      path: ["minLength"],
    });
  }
  if (
    field.minimum !== undefined &&
    field.maximum !== undefined &&
    field.minimum > field.maximum
  ) {
    context.addIssue({
      code: "custom",
      message: "Minimum cannot be greater than maximum.",
      path: ["minimum"],
    });
  }
  if (
    field.minLength !== undefined &&
    field.maxLength !== undefined &&
    field.minLength > field.maxLength
  ) {
    context.addIssue({
      code: "custom",
      message: "Minimum length cannot be greater than maximum length.",
      path: ["minLength"],
    });
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
  columnSpan: z.coerce.number().pipe(
    z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ),
  showContainer: z.boolean(),
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
    const sectionIds = new Set(
      value.sections.flatMap((section) => section.id ? [section.id] : []),
    );
    const fieldKeys = value.fields.map((field) => field.key);
    if (new Set(fieldKeys).size !== fieldKeys.length) {
      context.addIssue({
        code: "custom",
        message: "Field keys must be unique within a form version.",
        path: ["fields"],
      });
    }
    for (const field of value.fields) {
      if (!sectionIds.has(field.sectionId)) {
        context.addIssue({
          code: "custom",
          message: "Every field must belong to a section in this form version.",
          path: ["fields"],
        });
        continue;
      }
      const section = value.sections.find(
        (candidate) => candidate.id === field.sectionId,
      );
      if (section && field.columnSpan > section.columnSpan) {
        context.addIssue({
          code: "custom",
          message: "A field width cannot exceed its section width.",
          path: ["fields"],
        });
      }
    }
    for (const sectionId of sectionIds) {
      const fieldOrders = value.fields
        .filter((field) => field.sectionId === sectionId)
        .map((field) => field.order)
        .sort((a, b) => a - b);
      if (fieldOrders.some((order, index) => order !== index + 1)) {
        context.addIssue({
          code: "custom",
          message: "Field order must be contiguous within each section.",
          path: ["fields"],
        });
      }
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
