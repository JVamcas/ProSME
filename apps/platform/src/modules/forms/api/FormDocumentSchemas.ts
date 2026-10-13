import { z } from "zod";
import { formDocumentExtensions } from "../domain/FormDocumentTypes";

const optionalValue = (value: unknown) =>
  value === "" || value === null ? undefined : value;

export const documentFieldSettingsShape = {
  maxPages: z.preprocess(
    optionalValue,
    z.coerce.number().int().positive().max(2_147_483_647).optional(),
  ),
  maximumFileSizeMb: z.preprocess(
    optionalValue,
    z.coerce.number().int().min(1).max(10).optional(),
  ),
  acceptedExtensions: z
    .array(z.enum(formDocumentExtensions))
    .min(1, "Select at least one allowed file type.")
    .max(formDocumentExtensions.length)
    .refine((values) => new Set(values).size === values.length, {
      message: "Allowed file types must be unique.",
    })
    .optional(),
};

export function validateDocumentFieldSettings(
  field: { type: string } & z.output<
    z.ZodObject<typeof documentFieldSettingsShape>
  >,
  context: z.RefinementCtx,
) {
  if (
    field.type !== "DOCUMENT" &&
    (field.maxPages !== undefined ||
      field.maximumFileSizeMb !== undefined ||
      field.acceptedExtensions !== undefined)
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Only Document fields may have page, file-size or file-type limits.",
      path: ["acceptedExtensions"],
    });
  }
  if (
    field.maxPages !== undefined &&
    field.acceptedExtensions !== undefined &&
    (field.acceptedExtensions.length !== 1 ||
      field.acceptedExtensions[0] !== ".pdf")
  ) {
    context.addIssue({
      code: "custom",
      message: "A page limit requires PDF as the only allowed file type.",
      path: ["acceptedExtensions"],
    });
  }
}
