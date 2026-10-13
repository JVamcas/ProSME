"use client";
import { useContext, useState } from "react";
import { WorkflowSearchContext } from "./WorkflowSearchTarget";
import type {
  WorkflowSearchMatch,
  WorkflowSearchTab,
} from "../../../domain/definitions/WorkflowSearch";

export function useWorkflowSearchTab(stageKey?: string) {
  const { selected } = useContext(WorkflowSearchContext);
  const [manual, setManual] = useState<{
    stageKey?: string;
    selection: WorkflowSearchMatch | null;
    tab: WorkflowSearchTab;
  } | null>(null);
  const requestedTab =
    selected?.stageKey === stageKey && selected ? selected.tab : "tasks";
  const selectedTab =
    manual?.stageKey === stageKey && manual?.selection === selected
      ? manual.tab
      : requestedTab;
  const tab = selectedTab === "forms" ? "tasks" : selectedTab;
  const setTab = (next: WorkflowSearchTab) =>
    setManual({ stageKey, selection: selected, tab: next });
  return [tab, setTab] as const;
}
