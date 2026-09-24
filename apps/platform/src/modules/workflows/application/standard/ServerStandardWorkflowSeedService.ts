import "server-only";

import { workflowGraphSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { createStandardWorkflowDraft } from "@/modules/workflows/domain/standard/StandardWorkflowCatalogue";
import { standardWorkflowFormCodes } from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import {
  insertMissingStandardWorkflowDraft,
  prepareStandardWorkflowSeedDependencies,
} from "@/modules/workflows/infrastructure/StandardWorkflowSeedRepository";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

export async function seedStandardWorkflowDraft() {
  const dependencies = await prepareStandardWorkflowSeedDependencies();
  const draft = createStandardWorkflowDraft(dependencies);
  const graph = workflowGraphSchema.parse(draft.graph);
  const validation = validateWorkflowGraph(graph);
  if (!validation.valid) {
    throw new Error(
      `The standard workflow seed is invalid: ${validation.errors.map((error) => error.message).join(" ")}`,
    );
  }
  const result = await insertMissingStandardWorkflowDraft({ ...draft, graph });
  const boundVersionIds = new Set(
    graph.stages.flatMap((stage) => stage.tasks.flatMap((task) =>
      task.formBinding ? [task.formBinding.formVersionId] : []
    )),
  );
  const boundFormCodes = standardWorkflowFormCodes.filter((code) => {
    const versionId = dependencies.formVersionIds[code];
    return versionId ? boundVersionIds.has(versionId) : false;
  });
  return {
    ...result,
    boundDraftFormCodes: boundFormCodes.filter(
      (code) => dependencies.formVersionStatuses[code] === "DRAFT",
    ),
    boundFormCodes,
    boundPublishedFormCodes: boundFormCodes.filter(
      (code) => dependencies.formVersionStatuses[code] === "PUBLISHED",
    ),
    unresolvedFormCodes: dependencies.unresolvedFormCodes,
  };
}
