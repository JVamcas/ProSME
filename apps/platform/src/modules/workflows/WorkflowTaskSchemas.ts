import { z } from "zod";

export const optionSchema = z.object({
  code: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
});

export const itemSchema = optionSchema.extend({
  required: z.boolean().default(true),
});

export const fieldSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "textarea",
    "integer",
    "decimal",
    "currency",
    "date",
    "single-select",
    "multi-select",
    "checkbox",
    "calculated-display",
  ]),
  required: z.boolean().default(false),
  options: z.array(optionSchema).optional(),
});
