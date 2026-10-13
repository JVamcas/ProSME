"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTaskFormSearchContent } from "@/modules/forms/ClientFormsService";
import type { WorkflowGraphInput } from "../../../domain/definitions/WorkflowTypes";
import {
  workflowSearchEntries,
  type WorkflowSearchMatch,
} from "../../../domain/definitions/WorkflowSearch";

export function useWorkflowSearch(graph: WorkflowGraphInput) {
  const [selected, setSelected] = useState<WorkflowSearchMatch | null>(null);
  const versionIds = [
    ...new Set(
      graph.stages.flatMap((stage) =>
        stage.tasks.flatMap((task) =>
          task.formBinding?.formVersionId
            ? [task.formBinding.formVersionId]
            : [],
        ),
      ),
    ),
  ].sort();
  const forms = useQuery({
    queryKey: ["admin", "forms", "search-content", versionIds],
    queryFn: () => getTaskFormSearchContent(versionIds),
    enabled: versionIds.length > 0,
  });
  const entries = useMemo(
    () => workflowSearchEntries(graph, forms.data ?? []),
    [graph, forms.data],
  );
  return {
    selected,
    setSelected,
    entries,
    forms,
    loading: versionIds.length > 0 && forms.isPending,
  };
}
