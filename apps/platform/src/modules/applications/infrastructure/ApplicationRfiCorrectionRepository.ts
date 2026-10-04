import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { ResourceConflictError } from "@/lib/resource-errors";
import { readFormFields } from "@/modules/forms/infrastructure/FormRepository";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { captureFormResponseValues } from "@/modules/forms/engine/FormRuntimeContext";
import { isWorkflowRfiEditableField } from "@/modules/workflows/domain/runtime/WorkflowRfiFields";
import type { WorkflowActionExecutionTransaction } from "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository";
import { applicationDraftResponses, applications } from "./application.schema";

export async function applyWorkflowRfiApplicationCorrections(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    applicationId: string;
    fieldValues: Record<string, unknown>;
  },
) {
  const keys = Object.keys(input.fieldValues);
  if (!keys.length) return null;
  const [response] = await transaction
    .select({
      formVersionId: applicationDraftResponses.formVersionId,
      id: applicationDraftResponses.id,
      values: sql<Record<string, unknown>>`(
        SELECT jsonb_object_agg(requested.key, ${applicationDraftResponses.values} -> requested.key)
        FROM jsonb_array_elements_text(${JSON.stringify(keys)}::jsonb) requested(key)
      )`,
    })
    .from(applicationDraftResponses)
    .innerJoin(
      applications,
      and(
        eq(applications.latestDraftResponseId, applicationDraftResponses.id),
        eq(applications.id, applicationDraftResponses.applicationId),
        eq(applications.formVersionId, applicationDraftResponses.formVersionId),
      ),
    )
    .where(
      and(
        eq(applications.id, input.applicationId),
        eq(applications.ownerUserId, input.actorId),
        eq(applications.status, "submitted"),
        isNull(applications.deletedAt),
        eq(applicationDraftResponses.respondentUserId, input.actorId),
      ),
    )
    .for("update", { of: applicationDraftResponses })
    .limit(1);
  if (!response)
    throw new ResourceConflictError(
      "The submitted application answers are unavailable.",
    );
  const fields = (
    await readFormFields(response.formVersionId, transaction, keys)
  ).filter(
    (field) => keys.includes(field.key) && isWorkflowRfiEditableField(field),
  );
  if (
    fields.length !== keys.length ||
    !validateFormValues(fields, input.fieldValues, true)
  ) {
    throw new ResourceConflictError(
      "Complete the requested fields using the application form's validation rules.",
    );
  }
  const values = captureFormResponseValues(fields, input.fieldValues);
  await transaction
    .update(applicationDraftResponses)
    .set({
      rowVersion: sql`${applicationDraftResponses.rowVersion} + 1`,
      updatedAt: new Date(),
      values: sql`${applicationDraftResponses.values} || ${JSON.stringify(values)}::jsonb`,
    })
    .where(eq(applicationDraftResponses.id, response.id));
  await transaction
    .update(applications)
    .set({
      rowVersion: sql`${applications.rowVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, input.applicationId));
  return {
    before: Object.fromEntries(
      keys.map((key) => [key, response.values[key] ?? null]),
    ),
    after: values,
    changedFieldKeys: keys,
  };
}
