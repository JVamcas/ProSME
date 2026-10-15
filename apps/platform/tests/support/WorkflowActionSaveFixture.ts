import { randomUUID } from "node:crypto";
import { referenceWorkflow } from "./ReferenceWorkflowFixture";
import type { WorkflowActionSaveInput } from "@/modules/workflows/api/WorkflowActionSaveSchema";

export function workflowActionSaveRecord() {
  const graph = structuredClone(referenceWorkflow);
  for (const stage of graph.stages) {
    stage.id = randomUUID();
    stage.actions = stage.actions.map((action) => ({
      ...action,
      id: randomUUID(),
      condition: null,
    }));
    stage.tasks = stage.tasks.map((task) => ({ ...task, id: randomUUID() }));
  }
  graph.transitions = graph.transitions.map((route) => ({
    ...route,
    id: randomUUID(),
  }));
  return {
    definition: {
      id: randomUUID(),
      code: "REFERENCE",
      name: "Reference",
      description: "",
      active: true,
    },
    graph,
    version: {
      id: randomUUID(),
      versionNumber: 1,
      status: "DRAFT" as const,
      rowVersion: 7,
      metadata: { code: "REFERENCE", name: "Reference", description: "" },
      createdAt: new Date("2026-10-15T10:00:00Z"),
      publishedAt: null,
      retiredAt: null,
    },
  };
}

export function workflowActionSaveInput(
  record = workflowActionSaveRecord(),
): WorkflowActionSaveInput {
  const stage = record.graph.stages[0];
  const action = stage.actions[0];
  return {
    versionId: record.version.id,
    expectedRowVersion: record.version.rowVersion,
    stageKey: stage.stableKey,
    actionKey: action.stableKey,
    action: { ...action, label: "Updated action" },
    taskStableKeys: stage.tasks.map((task) => task.stableKey),
    routes: record.graph.transitions.filter(
      (route) =>
        route.sourceStageKey === stage.stableKey &&
        route.actionKey === action.stableKey,
    ),
  };
}
