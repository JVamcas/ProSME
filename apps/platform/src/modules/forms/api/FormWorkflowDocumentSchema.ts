import { z } from "zod";
import { workflowDocumentFileTypes, workflowDocumentActors } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";

export const formWorkflowDocumentSchema = z.object({
  stableKey: z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/),
  acceptedFileTypes: z
    .array(z.enum(workflowDocumentFileTypes))
    .min(1)
    .refine(
      (values) => new Set(values).size === values.length,
      "Choose each file type once.",
    ),
  maximumSizeMb: z.coerce.number().int().min(1).max(100),
  expiryDays: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().int().positive().max(3650).nullable(),
  ),
  requestOnStageActivation: z.boolean(),
  uploader: z.enum(workflowDocumentActors),
  verifier: z.enum(["ASSIGNED_REVIEWER", "STAFF"]),
  templateReference: z.string().max(500),
});
