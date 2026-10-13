import { z } from "zod";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

export const workflowTaskFormSectionOrderSchema = z.array(z.string().min(1))
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Form step order must not contain duplicates.",
  });

export function orderTaskFormSections(
  definition: FormRuntimeSchema,
  config: unknown,
): FormRuntimeSchema {
  const parsed = z.object({
    formSectionOrder: workflowTaskFormSectionOrderSchema.optional(),
  }).safeParse(config);
  const ids = parsed.success ? parsed.data.formSectionOrder ?? [] : [];
  if (!ids.length) return definition;
  const sections = [...definition.sections].sort((a, b) => a.order - b.order);
  const ordered = [
    ...ids.flatMap((id) => sections.filter((section) => section.id === id)),
    ...sections.filter((section) => !section.id || !ids.includes(section.id)),
  ];
  return {
    ...definition,
    sections: ordered.map((section, index) => ({ ...section, order: index + 1 })),
  };
}
