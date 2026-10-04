import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { inspectWorkflowStageDeletion } from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageDeletionPreview } from "@/modules/workflows/ui/definitions/WorkflowStageDeletionPreview";
import {
  workflowStageDeletionDefaults,
  type WorkflowStageDeletionFormValues,
} from "@/modules/workflows/ui/definitions/WorkflowStageDeletionFormSchema";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

function Preview({
  graph = referenceWorkflow,
  selected = false,
  stageKey = "COMPLETENESS",
}: {
  graph?: WorkflowGraphInput;
  selected?: boolean;
  stageKey?: string;
}) {
  const inspection = inspectWorkflowStageDeletion(graph, stageKey);
  const defaults = workflowStageDeletionDefaults(inspection);
  if (selected && inspection.incomingRoutes[0]?.successorStages[0]) {
    defaults.reconnections[0].targetStageKeys = [
      inspection.incomingRoutes[0].successorStages[0].stableKey,
    ];
  }
  const form = useForm<WorkflowStageDeletionFormValues>({ defaultValues: defaults });
  return (
    <WorkflowStageDeletionPreview
      control={form.control}
      graph={graph}
      inspection={inspection}
    />
  );
}

describe("stage deletion graph preview", () => {
  it("uses workflow cards and dashed connectors for unselected suggestions", () => {
    const markup = renderToStaticMarkup(<Preview />);
    expect(markup).toContain("Proposed paths (0 selected)");
    expect(markup).toContain('stroke-dasharray="6 5"');
    expect(markup).toContain('stroke="#059669"');
    expect(markup).toContain("Suggested · select to create");
    expect(markup).toContain("Submission and pre-screening");
    expect(markup.match(/>Deleting</g)).toHaveLength(1);
    expect(markup).toContain("Paths that will be deleted (2)");
    expect(markup).toContain('stroke="#dc2626"');
    expect(markup).not.toContain("Suggested replacement routes");
    expect(markup).not.toContain('type="checkbox"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("Click a green path or its label");
    expect(markup.match(/<svg class="pointer-events-none/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Stage deletion workflow diagram"');
    expect(markup).toContain("max-h-[50dvh]");
    expect(markup).toContain("overflow-auto");
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain("Advance");
    expect(markup).toContain("data-workflow-route=");
    const suggestion = markup.match(
      /<g data-workflow-route="suggested:[\s\S]*?<\/g>/,
    )?.[0];
    expect(suggestion).toMatch(/d="[^"]* L /);
    expect(suggestion).toContain('stroke="#059669"');
    expect(markup).toContain('fill="context-stroke"');
  });

  it("shows solid connectors for selected replacement paths", () => {
    const markup = renderToStaticMarkup(<Preview selected />);
    expect(markup).toContain("Proposed paths (1 selected)");
    expect(markup).toContain("Will be created");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain("stroke-dasharray");
    expect(markup).not.toContain("Suggested · select to create");
  });

  it("separates selected and suggested actions sharing the same destination", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.push({ ...graph.transitions[0], actionKey: "OVERRIDE" });
    const markup = renderToStaticMarkup(<Preview graph={graph} selected />);
    expect(markup.match(/data-workflow-route=/g)).toHaveLength(4);
    expect(markup.match(/stroke-dasharray=/g)).toHaveLength(1);
    expect(markup).toContain("Will be created");
    expect(markup).toContain("Suggested · select to create");
  });

  it("shows an empty preview for a stage with no incoming routes", () => {
    const markup = renderToStaticMarkup(<Preview stageKey="PRE_SCREENING" />);
    expect(markup).toContain("No eligible replacement paths are available");
    expect(markup).toContain("data-workflow-route=");
    expect(markup).toContain("Will be deleted");
    expect(markup).not.toContain("Suggested · select to create");
  });

  it("uses different marker IDs when multiple previews appear together", () => {
    const markup = renderToStaticMarkup(<><Preview /><Preview selected /></>);
    const ids = [...markup.matchAll(/<marker id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(markup).toContain(`url(#${id})`);
  });
});
