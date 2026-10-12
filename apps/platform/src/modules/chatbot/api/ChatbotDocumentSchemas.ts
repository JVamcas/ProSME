import { z } from "zod";
import { chatbotDocumentLimits } from "../domain/ChatbotDocument";

export const chatbotDocumentFileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine(
    (name) => !/[\\/\u0000-\u001f\u007f]/.test(name),
    "Invalid file name.",
  )
  .refine(
    (name) => /\.(pdf|docx|txt)$/i.test(name),
    "Select a PDF, DOCX or TXT document.",
  );

export const chatbotDocumentUploadFormSchema = z.object({
  file: z
    .custom<File>(
      (value) => typeof File !== "undefined" && value instanceof File,
      "Select a document.",
    )
    .superRefine((file, context) => {
      if (!file) return;
      if (!chatbotDocumentFileNameSchema.safeParse(file.name).success) {
        context.addIssue({
          code: "custom",
          message: "Select a PDF, DOCX or TXT document.",
        });
      }
      if (!file.size || file.size > chatbotDocumentLimits.fileBytes) {
        context.addIssue({
          code: "custom",
          message: "Select a document up to 5 MB.",
        });
      }
    }),
});

export type ChatbotDocumentUploadForm = z.infer<
  typeof chatbotDocumentUploadFormSchema
>;
