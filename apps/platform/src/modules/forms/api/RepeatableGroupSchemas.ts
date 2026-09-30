import { z } from "zod";

import { repeatableItemFieldTypes } from "@/modules/forms/FormTypes";

const stableKey = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

const optionalNumber = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().finite().optional(),
);

const optionalLength = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().int().nonnegative().optional(),
);

const itemOptionSchema = z.object({
  key: stableKey,
  label: z.string().trim().min(1).max(200),
  order: z.coerce.number().int().positive(),
});

function validateItemField(
  field: z.infer<typeof repeatableItemFieldBaseSchema>,
  context: z.RefinementCtx,
) {
  const select = ["SINGLE_SELECT", "MULTI_SELECT"].includes(field.type);
  const options = field.options ?? [];
  if (select !== Boolean(options.length)) {
    context.addIssue({
      code: "custom",
      message: select
        ? "Add at least one option to a repeatable select field."
        : "Only repeatable select fields may have options.",
      path: ["options"],
    });
  }
  if (new Set(options.map((option) => option.key)).size !== options.length) {
    context.addIssue({
      code: "custom",
      message: "Repeatable field option keys must be unique.",
      path: ["options"],
    });
  }
  if (options.some((option, index) => option.order !== index + 1)) {
    context.addIssue({
      code: "custom",
      message: "Repeatable field option order must start at one.",
      path: ["options"],
    });
  }
  const numeric = ["NUMBER", "CURRENCY", "PERCENTAGE"].includes(field.type);
  if (!numeric && (field.minimum !== undefined || field.maximum !== undefined)) {
    context.addIssue({
      code: "custom",
      message: "Only numeric repeatable fields may have numeric limits.",
      path: ["minimum"],
    });
  }
  if (
    field.minimum !== undefined
    && field.maximum !== undefined
    && field.minimum > field.maximum
  ) {
    context.addIssue({
      code: "custom",
      message: "Minimum cannot be greater than maximum.",
      path: ["minimum"],
    });
  }
  const text = ["TEXT", "TEXTAREA"].includes(field.type);
  if (!text && (field.minLength !== undefined || field.maxLength !== undefined)) {
    context.addIssue({
      code: "custom",
      message: "Only text repeatable fields may have length limits.",
      path: ["minLength"],
    });
  }
}

const repeatableItemFieldBaseSchema = z.object({
  columnSpan: z.coerce.number().pipe(
    z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ),
  helpText: z.string().trim().max(500).nullable().optional(),
  key: stableKey,
  label: z.string().trim().min(1).max(160),
  maximum: optionalNumber,
  maxLength: optionalLength,
  minimum: optionalNumber,
  minLength: optionalLength,
  options: z.array(itemOptionSchema).max(100).optional(),
  order: z.coerce.number().int().positive(),
  required: z.boolean(),
  type: z.enum(repeatableItemFieldTypes),
});

export const repeatableItemFieldSchema = repeatableItemFieldBaseSchema
  .superRefine(validateItemField);

export const repeatableGroupConfigurationSchema = z.object({
  addLabel: z.string().trim().min(1).max(80),
  fields: z.array(repeatableItemFieldSchema).min(1).max(30),
  itemLabel: z.string().trim().min(1).max(80),
  maximumItems: z.coerce.number().int().min(1).max(100),
  minimumItems: z.coerce.number().int().min(0).max(100),
}).superRefine((configuration, context) => {
  if (configuration.minimumItems > configuration.maximumItems) {
    context.addIssue({
      code: "custom",
      message: "Minimum rows cannot exceed maximum rows.",
      path: ["minimumItems"],
    });
  }
  const keys = configuration.fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: "custom",
      message: "Repeatable field keys must be unique.",
      path: ["fields"],
    });
  }
  const orders = configuration.fields.map((field) => field.order).sort(
    (left, right) => left - right,
  );
  if (orders.some((order, index) => order !== index + 1)) {
    context.addIssue({
      code: "custom",
      message: "Repeatable field order must be contiguous and start at one.",
      path: ["fields"],
    });
  }
});
