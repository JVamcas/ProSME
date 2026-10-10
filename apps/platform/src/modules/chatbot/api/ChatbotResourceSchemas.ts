import { z } from "zod";

export const chatbotResourceKeySchema = z
  .string()
  .max(100)
  .refine((key) => {
    if (key === "contact:contact-details") return true;
    const [type, id, extra] = key.split(":");
    if (extra !== undefined) return false;
    if (type === "funding" || type === "eligibility")
      return z.uuid().safeParse(id).success;
    return (
      type === "faq" &&
      /^[1-9][0-9]{0,9}$/.test(id ?? "") &&
      Number(id) <= 2147483647
    );
  }, "Invalid resource.");

export const chatbotResourceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce
      .number()
      .refine((size) => [10, 25, 50].includes(size), "Invalid page size.")
      .default(10),
  })
  .strict();

export const chatbotResourceSelectionSchema = z
  .object({
    resourceKeys: z
      .array(chatbotResourceKeySchema)
      .min(1, "Select at least one resource.")
      .max(500)
      .refine(
        (keys) => new Set(keys).size === keys.length,
        "Duplicate resource selection.",
      ),
  })
  .strict();

export const chatbotResourceUpdateSchema =
  chatbotResourceSelectionSchema.extend({
    active: z.boolean(),
  });

export type ChatbotResourceSelection = z.infer<
  typeof chatbotResourceSelectionSchema
>;
export type ChatbotResourceUpdate = z.infer<typeof chatbotResourceUpdateSchema>;
export type ChatbotResourceQuery = z.infer<typeof chatbotResourceQuerySchema>;
