import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { inspectWorkflowStageDeletion } from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";
import { WorkflowStageDeletionConnections } from "@/modules/workflows/ui/definitions/WorkflowStageDeletionConnections";
import { WorkflowStageList } from "@/modules/workflows/ui/definitions/WorkflowStageList";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

const stageKey = "COMPLETENESS";
const inspection = inspectWorkflowStageDeletion(referenceWorkflow, stageKey);

describe("stage deletion visual flow", () => {
  it("shows affected stages in blue and keeps the deleting stage red", () => {
    const stages = referenceWorkflow.stages.slice(0, 4);
    const markup = renderToStaticMarkup(
      <WorkflowStageList
        connectionRoles={new Map([
          [stages[0].stableKey, "incoming"],
          [stages[1].stableKey, "outgoing"],
          [stages[2].stableKey, "both"],
          [stages[3].stableKey, "deleting"],
        ])}
        onSelect={() => undefined}
        stages={stages}
      />,
    );

    expect(markup.match(/>Affected</g)).toHaveLength(3);
    expect(markup.match(/bg-blue-50 ring-1 ring-blue-400/g)).toHaveLength(3);
    expect(markup).toContain("bg-red-50 ring-1 ring-red-400");
    expect(markup).toContain(">Deleting<");
    expect(markup).not.toMatch(/Incoming|Outgoing|emerald|violet/);
  });

  it("shows every removed transition as a complete path with its action", () => {
    const markup = renderToStaticMarkup(
      <WorkflowStageDeletionConnections graph={referenceWorkflow} inspection={inspection} />,
    );
    expect(markup).toContain("Paths that will be deleted (2)");
    expect(markup).toContain("Will be deleted");
    expect(markup.match(/data-workflow-route=/g)).toHaveLength(2);
    expect(markup).toContain('stroke="#dc2626"');
    expect(markup.match(/>Deleting</g)).toHaveLength(1);
    expect(markup).toContain("Affected");
    expect(markup).toContain(inspection.incomingRoutes[0].predecessorName);
    expect(markup).toContain(inspection.successorStages[0].name);
    expect(markup).toContain("Advance");
    expect(markup).not.toContain("Incoming transitions");
    expect(markup).not.toContain("Outgoing transitions");
  });

  it("includes all targets of a removed parallel path, including surviving targets", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions[0].targetStageKeys.push("FINANCE_REVIEW");
    const markup = renderToStaticMarkup(
      <WorkflowStageDeletionConnections
        graph={graph}
        inspection={inspectWorkflowStageDeletion(graph, stageKey)}
      />,
    );
    expect(markup).toContain(graph.stages.find((stage) => stage.stableKey === "FINANCE_REVIEW")!.name);
  });

  it("labels terminal outcomes and counts a self-loop only once", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.push({
      ...graph.transitions[0],
      sourceStageKey: stageKey,
      targetStageKeys: [stageKey],
    }, {
      ...graph.transitions[0],
      sourceStageKey: stageKey,
      targetStageKeys: [],
      terminalOutcome: "CLOSED",
    });
    const markup = renderToStaticMarkup(
      <WorkflowStageDeletionConnections
        graph={graph}
        inspection={inspectWorkflowStageDeletion(graph, stageKey)}
      />,
    );
    expect(markup).toContain("Paths that will be deleted (4)");
    expect(markup).toContain("Closed");
    expect(markup).toContain("Ends application");
  });

});
