import "server-only";

import { RequestValidationError } from "@/lib/resource-errors";
import { validApplicationDocumentSignature } from "@/modules/applications/application/ApplicationDocumentValidation";
import { validateApplicationDocumentPages } from "@/modules/applications/application/ApplicationDocumentPageValidation";
import {
  validateWorkflowEvidenceFile,
  type WorkflowEvidenceRequirement,
} from "./WorkflowEvidenceFilePolicy";

export async function readValidatedWorkflowEvidence(
  file: File,
  requirement: WorkflowEvidenceRequirement,
) {
  const validated = validateWorkflowEvidenceFile(file, requirement);
  const body = Buffer.from(await file.arrayBuffer());
  if (!validApplicationDocumentSignature(body, validated.signature)) {
    throw new RequestValidationError(
      "The file content does not match its selected type.",
    );
  }
  await validateApplicationDocumentPages(
    body,
    requirement.maxPages ?? undefined,
  );
  return { ...validated, body };
}
