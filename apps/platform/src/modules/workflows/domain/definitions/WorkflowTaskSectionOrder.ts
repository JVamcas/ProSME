import { z } from "zod";

export const workflowTaskSectionIds = [
  "form",
  "checklist",
  "documents",
  "scoring",
  "comments",
] as const;

export type WorkflowTaskSectionId = (typeof workflowTaskSectionIds)[number];

export const workflowTaskSectionOrderSchema = z
  .array(z.enum(workflowTaskSectionIds))
  .max(workflowTaskSectionIds.length)
  .refine((items) => new Set(items).size === items.length, {
    message: "Task section order must not contain duplicates.",
  });

export function taskSectionOrder(config: unknown): WorkflowTaskSectionId[] {
  const parsed = z.object({
    sectionOrder: workflowTaskSectionOrderSchema.optional(),
  }).safeParse(config);
  const saved = parsed.success ? parsed.data.sectionOrder ?? [] : [];
  return [...saved, ...workflowTaskSectionIds.filter((id) => !saved.includes(id))];
}

export function orderTaskSections<T extends { id: WorkflowTaskSectionId }>(
  sections: readonly T[],
  order: readonly WorkflowTaskSectionId[] = workflowTaskSectionIds,
): T[] {
  const ids = taskSectionOrder({ sectionOrder: order });
  return ids.flatMap((id) => sections.filter((section) => section.id === id));
}
