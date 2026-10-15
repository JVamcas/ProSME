import type { QueryClient } from "@tanstack/react-query";
import { workflowQueryKeys } from "../../WorkflowHooks";
import type { WorkflowEditorView } from "../../domain/definitions/WorkflowTypes";

export function cacheWorkflowActionEditor(
  client: QueryClient,
  response: WorkflowEditorView,
  previous: WorkflowEditorView,
) {
  const assignmentOptions =
    response.assignmentOptions ?? previous.assignmentOptions;
  const updated = {
    ...response,
    ...(assignmentOptions ? { assignmentOptions } : {}),
  };
  const definitionId = updated.definition.id;
  client.setQueryData<WorkflowEditorView>(
    workflowQueryKeys.detail(definitionId),
    (current) =>
      !current || current.version.id === updated.version.id ? updated : current,
  );
  client.setQueryData(
    workflowQueryKeys.detail(definitionId, updated.version.id),
    updated,
  );
  // Catalogues refresh when revisited. The mutation already returned the current
  // editor, so neither it nor unrelated assignment/published queries need a GET.
  void client.invalidateQueries({
    queryKey: workflowQueryKeys.all,
    exact: true,
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: workflowQueryKeys.templates,
    refetchType: "none",
  });
}
