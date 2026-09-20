"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { clientFormsService } from "@/modules/forms/ClientFormsService";
import { formQueryKeys } from "@/modules/forms/FormHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowConditionFields } from "@/modules/workflows/engine/WorkflowConditionFields";

export function useWorkflowConditionFields(
  editor: WorkflowEditorView,
  stage: WorkflowStageInput,
) {
  const versionIds = useMemo(() => [
    ...new Set(editor.graph.stages.flatMap((item) =>
      item.tasks.flatMap((task) =>
        task.formBinding ? [task.formBinding.formVersionId] : []
      )
    )),
  ], [editor.graph.stages]);
  const queries = useQueries({
    queries: versionIds.map((versionId) => ({
      queryFn: () => clientFormsService.getPublishedRuntime(versionId),
      queryKey: formQueryKeys.publishedRuntime(versionId),
    })),
  });
  const forms = new Map(
    queries.flatMap((query, index) =>
      query.data ? [[versionIds[index], query.data.fields] as const] : []
    ),
  );
  return {
    completionFields: workflowConditionFields(
      editor.graph,
      forms,
      stage,
      true,
    ),
    entryFields: workflowConditionFields(
      editor.graph,
      forms,
      stage,
      false,
    ),
    isPending: queries.some((query) => query.isPending),
  };
}
