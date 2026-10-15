import "server-only";

import { eq } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import { workflowDefinitionVersions } from "./workflow.schema";
import { changeWorkflowTemplateLifecycle } from "./WorkflowLifecycleRepository";

export async function publishAttachedWorkflowVersion(
  transaction: DatabaseTransaction,
  input: {
    versionId: string;
    actorId: string;
    correlationId: string;
    idempotencyKey: string;
    authorize: () => void;
    preparePublication: (transaction: DatabaseTransaction) => Promise<void>;
  },
) {
  const [version] = await transaction
    .select({
      id: workflowDefinitionVersions.id,
      status: workflowDefinitionVersions.status,
      rowVersion: workflowDefinitionVersions.rowVersion,
    })
    .from(workflowDefinitionVersions)
    .where(eq(workflowDefinitionVersions.id, input.versionId))
    .for("update");
  if (
    !version ||
    !["DRAFT", "APPROVED", "PUBLISHED"].includes(version.status)
  ) {
    throw new ResourceConflictError(
      "The attached workflow version cannot be published.",
    );
  }
  if (version.status === "PUBLISHED") {
    await input.preparePublication(transaction);
    return;
  }
  input.authorize();
  const published = await changeWorkflowTemplateLifecycle(
    {
      ...input,
      expectedRowVersion: version.rowVersion,
    },
    "PUBLISH",
    transaction,
  );
  if (!published)
    throw new ResourceConflictError(
      "The attached workflow changed. Refresh and retry.",
    );
}
