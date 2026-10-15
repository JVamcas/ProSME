import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { DatabaseTransaction } from "@/platform/database/client";
import { RequestValidationError } from "@/lib/resource-errors";
import { publishAttachedFormVersions } from "@/modules/forms/infrastructure/FormCascadePublicationRepository";
import { findWorkflowGraph } from "../../infrastructure/WorkflowGraphRepository";
import { validateWorkflowConfiguration } from "./ServerWorkflowSupport";

export function workflowPublicationPreparation(
  actor: AuthenticatedUser,
  versionId: string,
  additionalFormVersionIds: string[] = [],
) {
  return async (transaction: DatabaseTransaction) => {
    const record = await findWorkflowGraph(versionId, transaction);
    if (!record || !record.definition.active) {
      throw new RequestValidationError(
        "The attached workflow is missing or inactive.",
      );
    }
    const formVersionIds = record.graph.stages.flatMap((stage) => [
      ...(stage.coiFormVersionId ? [stage.coiFormVersionId] : []),
      ...stage.tasks.flatMap((task) =>
        task.formBinding ? [task.formBinding.formVersionId] : [],
      ),
    ]);
    await publishAttachedFormVersions(
      transaction,
      [...additionalFormVersionIds, ...formVersionIds],
      actor.id,
      () => {
        requirePermission(actor, permissionCodes.workflowFormPublish);
      },
    );
    const validation = await validateWorkflowConfiguration(
      record.graph,
      false,
      transaction,
    );
    if (!validation.valid) {
      throw new RequestValidationError(
        `Cannot publish workflow: ${validation.errors.map((error) => error.message).join(" ")}`,
      );
    }
  };
}
